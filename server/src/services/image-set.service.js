const ImageSetModel = require('../models/image-set.model');
const ImageSetImageModel = require('../models/image-set-image.model');
const Logger = require('../utils/logger');
const {
  parseIdOrThrow,
  ensureArrayOrThrow,
  normalizeFolderId,
  computeImageStats,
  insertImageRecords,
  updateImageSetStats,
  cleanupUploadedFiles,
  deletePhysicalFiles,
} = require('./image-set.helpers');

class ImageSetService {
  /**
   * 获取图片集列表
   */
  static async getImageSets(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      folderId = null,
      includeHidden = false,
      visibleFolderIds = null,
      ownerId = null,
    } = options;

    return await ImageSetModel.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      keyword,
      folderId: folderId ? parseInt(folderId) : null,
      includeHidden: includeHidden === true || includeHidden === 'true',
      visibleFolderIds,
      ownerId,
    });
  }

  /**
   * 根据ID获取图片集详情（含图片列表）
   */
  static async getImageSetById(id, ownerId = null) {
    const parsedId = parseIdOrThrow(id, '无效的图片集ID');

    const imageSet = await ImageSetModel.findById(parsedId, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    // 获取图片列表
    const images = await ImageSetImageModel.findByImageSetId(parsedId);
    imageSet.images = images;

    return imageSet;
  }

  /**
   * 根据地图边界获取图片集
   */
  static async getImageSetsByBounds(bounds) {
    const { north, south, east, west, includeHidden = false, visibleFolderIds = null, ownerId = null } = bounds;

    if (!north || !south || !east || !west) throw new Error('缺少边界参数');

    const data = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west),
      includeHidden: includeHidden === true || includeHidden === 'true',
      visibleFolderIds,
      ownerId,
    };

    if (data.north <= data.south || data.east <= data.west) throw new Error('边界参数不合理');

    return await ImageSetModel.findByBounds(data);
  }

  /**
   * 获取统计信息
   */
  static async getStats(ownerId = null) {
    return await ImageSetModel.getStats(ownerId);
  }

  /**
   * 创建图片集
   */
  static async createImageSet(data) {
    const { title, description, lat, lng, folderId, images = [], ownerId } = data;

    if (!title) throw new Error('图片集标题为必填项');
    if (!lat || !lng) throw new Error('图片集位置坐标为必填项');

    const { transaction } = require('../config/database');
    let insertedId = null;

    try {
      await transaction(async (db) => {
        const { imageCount, totalSize, coverUrl, thumbnailUrl } = computeImageStats(images);

        // 坐标转换
        const { wgs84ToGcj02 } = require('../utils/coordinate');
        const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(parseFloat(lng), parseFloat(lat));

        // 插入图片集记录
        const sql = `INSERT INTO image_sets (
          title, description, cover_url, thumbnail_url,
          latitude, longitude, gcj02_lat, gcj02_lng,
          image_count, total_size, folder_id, is_visible, sort_order, owner_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;

        const params = [
          title,
          description || '',
          coverUrl,
          thumbnailUrl,
          parseFloat(lat),
          parseFloat(lng),
          gcj02Lat || null,
          gcj02Lng || null,
          imageCount,
          totalSize,
          normalizeFolderId(folderId),
          1,
          0,
          ownerId || null,
        ];

        const res = await db.run(sql, params);
        insertedId = res.lastID;
        if (!insertedId) throw new Error('创建图片集记录失败');

        // 插入图片记录
        await insertImageRecords(db, insertedId, images);
      });

      return await this.getImageSetById(insertedId, ownerId);
    } catch (txErr) {
      // 事务失败，尝试清理已上传的文件
      await cleanupUploadedFiles(images);
      throw txErr;
    }
  }

  /**
   * 更新图片集
   */
  static async updateImageSet(id, updateData, ownerId = null) {
    parseIdOrThrow(id, '无效的图片集ID');

    const imageSet = await ImageSetModel.update(parseInt(id), updateData, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    return imageSet;
  }

  /**
   * 删除图片集
   */
  static async deleteImageSet(id, ownerId = null) {
    const parsedId = parseIdOrThrow(id, '无效的图片集ID');

    const imageSet = await this.getImageSetById(parsedId, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    const { transaction } = require('../config/database');

    await transaction(async (db) => {
      // 删除图片记录（外键级联会自动删除，但我们需要先获取文件路径）
      const [imgRows] = await db.all(
        'SELECT * FROM image_set_images WHERE image_set_id = ?',
        [parsedId]
      );

      // 删除图片集记录
      let sql = 'DELETE FROM image_sets WHERE id = ?';
      const params = [parsedId];
      if (ownerId) {
        sql += ' AND owner_id = ?';
        params.push(ownerId);
      }
      const delRes = await db.run(sql, params);
      if (!delRes || delRes.changes === 0) {
        throw new Error('删除数据库记录失败');
      }

      // 在事务内删除物理文件
      await deletePhysicalFiles(imageSet.images || imgRows || []);
    });

    return true;
  }

  /**
   * 批量删除图片集
   */
  static async batchDeleteImageSets(ids, ownerId = null) {
    ensureArrayOrThrow(ids, '请提供有效的ID列表');

    const toDelete = [];
    for (const id of ids) {
      try {
        const imageSet = await this.getImageSetById(parseInt(id), ownerId);
        if (imageSet) toDelete.push(imageSet);
      } catch (e) {
        Logger.warn(`获取图片集信息失败 (ID: ${id})`, e);
      }
    }

    const { transaction } = require('../config/database');
    let affected = 0;

    await transaction(async (db) => {
      const { clause, params } = require('../utils/QueryBuilder').buildInClause(ids);
      let sql = `DELETE FROM image_sets WHERE id ${clause}`;
      if (ownerId) {
        sql += ' AND owner_id = ?';
        params.push(ownerId);
      }
      const delRes = await db.run(sql, params);
      affected = delRes.changes || 0;

      // 删除物理文件
      for (const imageSet of toDelete) {
        await deletePhysicalFiles(imageSet.images || []);
      }
    });

    return affected;
  }

  /**
   * 批量更新可见性
   */
  static async batchUpdateVisibility(ids, isVisible, ownerId = null) {
    ensureArrayOrThrow(ids, '请提供有效的ID列表');
    return await ImageSetModel.batchUpdateVisibility(ids, isVisible, ownerId);
  }

  /**
   * 批量移动到文件夹
   */
  static async batchMoveToFolder(ids, folderId, ownerId = null) {
    ensureArrayOrThrow(ids, '请提供有效的ID列表');
    return await ImageSetModel.batchMoveToFolder(ids, folderId, ownerId);
  }

  /**
   * 更新可见性
   */
  static async updateVisibility(id, isVisible, ownerId = null) {
    parseIdOrThrow(id, '无效的图片集ID');
    const imageSet = await ImageSetModel.update(parseInt(id), { isVisible }, ownerId);
    if (!imageSet) throw new Error('图片集不存在');
    return imageSet;
  }

  /**
   * 移动到文件夹
   */
  static async moveToFolder(id, folderId, ownerId = null) {
    parseIdOrThrow(id, '无效的图片集ID');
    const imageSet = await ImageSetModel.update(parseInt(id), { folderId }, ownerId);
    if (!imageSet) throw new Error('图片集不存在');
    return imageSet;
  }

  /**
   * 添加图片到图片集
   */
  static async addImages(imageSetId, images, ownerId = null) {
    const parsedId = parseIdOrThrow(imageSetId, '无效的图片集ID');
    ensureArrayOrThrow(images, '请提供图片列表');

    const imageSet = await ImageSetModel.findById(parsedId, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    const { transaction } = require('../config/database');

    try {
      await transaction(async (db) => {
        // 获取当前最大排序值
        const [maxResult] = await db.all(
          'SELECT MAX(sort_order) as maxSort FROM image_set_images WHERE image_set_id = ?',
          [parsedId]
        );
        let startOrder = (maxResult?.[0]?.maxSort || 0) + 1;

        await insertImageRecords(db, parsedId, images, startOrder, false);
        await updateImageSetStats(db, parsedId);
      });

      return await this.getImageSetById(parsedId, ownerId);
    } catch (txErr) {
      await cleanupUploadedFiles(images);
      throw txErr;
    }
  }

  /**
   * 从图片集删除图片
   */
  static async removeImage(imageSetId, imageId, ownerId = null) {
    const parsedSetId = parseIdOrThrow(imageSetId, '无效的图片集ID');
    const parsedImageId = parseIdOrThrow(imageId, '无效的图片ID');

    const imageSet = await ImageSetModel.findById(parsedSetId, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    const image = await ImageSetImageModel.findById(parsedImageId);
    if (!image || image.image_set_id !== parsedSetId) {
      throw new Error('图片不存在或不属于该图片集');
    }

    const { transaction } = require('../config/database');

    await transaction(async (db) => {
      // 删除图片记录
      await db.run('DELETE FROM image_set_images WHERE id = ?', [parsedImageId]);

      // 删除物理文件
      await deletePhysicalFiles([image]);

      // 更新图片集统计信息
      await updateImageSetStats(db, parsedSetId);
    });

    return await this.getImageSetById(parsedSetId, ownerId);
  }

  /**
   * 更新图片排序
   */
  static async updateImageOrder(imageSetId, imageOrders, ownerId = null) {
    const parsedId = parseIdOrThrow(imageSetId, '无效的图片集ID');
    if (!Array.isArray(imageOrders)) throw new Error('请提供排序列表');

    const imageSet = await ImageSetModel.findById(parsedId, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    await ImageSetImageModel.batchUpdateSortOrder(imageOrders);

    // 更新封面为第一张图片
    const { transaction } = require('../config/database');
    await transaction(async (db) => {
      const firstImage = await db.get(
        'SELECT * FROM image_set_images WHERE image_set_id = ? ORDER BY sort_order ASC LIMIT 1',
        [parsedId]
      );

      if (firstImage) {
        await db.run(
          'UPDATE image_sets SET cover_url = ?, thumbnail_url = ?, updated_at = datetime(\'now\') WHERE id = ?',
          [firstImage.image_url, firstImage.thumbnail_url, parsedId]
        );
      }
    });

    return await this.getImageSetById(parsedId, ownerId);
  }
}

module.exports = ImageSetService;

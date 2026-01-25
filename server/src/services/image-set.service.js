const ImageSetModel = require('../models/image-set.model');
const ImageSetImageModel = require('../models/image-set-image.model');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger');

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
    if (!id || isNaN(id)) throw new Error('无效的图片集ID');

    const imageSet = await ImageSetModel.findById(parseInt(id), ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    // 获取图片列表
    const images = await ImageSetImageModel.findByImageSetId(parseInt(id));
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
        // 计算图片统计信息
        const imageCount = images.length;
        const totalSize = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);

        // 获取封面（第一张图片）
        const coverUrl = images.length > 0 ? images[0].imageUrl : null;
        const thumbnailUrl = images.length > 0 ? images[0].thumbnailUrl : null;

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
          folderId && parseInt(folderId) !== 0 ? parseInt(folderId) : null,
          1,
          0,
          ownerId || null,
        ];

        const res = await db.run(sql, params);
        insertedId = res.lastID;
        if (!insertedId) throw new Error('创建图片集记录失败');

        // 插入图片记录
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const imgSql = `INSERT INTO image_set_images (
            image_set_id, image_url, thumbnail_url,
            file_name, file_size, file_type,
            width, height, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

          await db.run(imgSql, [
            insertedId,
            img.imageUrl,
            img.thumbnailUrl,
            img.fileName,
            img.fileSize || null,
            img.fileType || null,
            img.width || null,
            img.height || null,
            img.sortOrder ?? i,
          ]);
        }
      });

      return await this.getImageSetById(insertedId, ownerId);
    } catch (txErr) {
      // 事务失败，尝试清理已上传的文件
      await this.cleanupUploadedFiles(images);
      throw txErr;
    }
  }

  /**
   * 更新图片集
   */
  static async updateImageSet(id, updateData, ownerId = null) {
    if (!id || isNaN(id)) throw new Error('无效的图片集ID');

    const imageSet = await ImageSetModel.update(parseInt(id), updateData, ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    return imageSet;
  }

  /**
   * 删除图片集
   */
  static async deleteImageSet(id, ownerId = null) {
    if (!id || isNaN(id)) throw new Error('无效的图片集ID');

    const imageSet = await this.getImageSetById(parseInt(id), ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    const { transaction } = require('../config/database');

    await transaction(async (db) => {
      // 删除图片记录（外键级联会自动删除，但我们需要先获取文件路径）
      const [imgRows] = await db.all(
        'SELECT * FROM image_set_images WHERE image_set_id = ?',
        [parseInt(id)]
      );

      // 删除图片集记录
      let sql = 'DELETE FROM image_sets WHERE id = ?';
      const params = [parseInt(id)];
      if (ownerId) {
        sql += ' AND owner_id = ?';
        params.push(ownerId);
      }
      const delRes = await db.run(sql, params);
      if (!delRes || delRes.changes === 0) {
        throw new Error('删除数据库记录失败');
      }

      // 在事务内删除物理文件
      await this.deletePhysicalFiles(imageSet.images || imgRows || []);
    });

    return true;
  }

  /**
   * 批量删除图片集
   */
  static async batchDeleteImageSets(ids, ownerId = null) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('请提供有效的ID列表');

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
        await this.deletePhysicalFiles(imageSet.images || []);
      }
    });

    return affected;
  }

  /**
   * 批量更新可见性
   */
  static async batchUpdateVisibility(ids, isVisible, ownerId = null) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('请提供有效的ID列表');
    return await ImageSetModel.batchUpdateVisibility(ids, isVisible, ownerId);
  }

  /**
   * 批量移动到文件夹
   */
  static async batchMoveToFolder(ids, folderId, ownerId = null) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('请提供有效的ID列表');
    return await ImageSetModel.batchMoveToFolder(ids, folderId, ownerId);
  }

  /**
   * 更新可见性
   */
  static async updateVisibility(id, isVisible, ownerId = null) {
    if (!id || isNaN(id)) throw new Error('无效的图片集ID');
    const imageSet = await ImageSetModel.update(parseInt(id), { isVisible }, ownerId);
    if (!imageSet) throw new Error('图片集不存在');
    return imageSet;
  }

  /**
   * 移动到文件夹
   */
  static async moveToFolder(id, folderId, ownerId = null) {
    if (!id || isNaN(id)) throw new Error('无效的图片集ID');
    const imageSet = await ImageSetModel.update(parseInt(id), { folderId }, ownerId);
    if (!imageSet) throw new Error('图片集不存在');
    return imageSet;
  }

  /**
   * 添加图片到图片集
   */
  static async addImages(imageSetId, images, ownerId = null) {
    if (!imageSetId || isNaN(imageSetId)) throw new Error('无效的图片集ID');
    if (!Array.isArray(images) || images.length === 0) throw new Error('请提供图片列表');

    const imageSet = await ImageSetModel.findById(parseInt(imageSetId), ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    const { transaction } = require('../config/database');

    try {
      await transaction(async (db) => {
        // 获取当前最大排序值
        const [maxResult] = await db.all(
          'SELECT MAX(sort_order) as maxSort FROM image_set_images WHERE image_set_id = ?',
          [parseInt(imageSetId)]
        );
        let startOrder = (maxResult?.[0]?.maxSort || 0) + 1;

        // 插入图片记录
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const imgSql = `INSERT INTO image_set_images (
            image_set_id, image_url, thumbnail_url,
            file_name, file_size, file_type,
            width, height, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

          await db.run(imgSql, [
            parseInt(imageSetId),
            img.imageUrl,
            img.thumbnailUrl,
            img.fileName,
            img.fileSize || null,
            img.fileType || null,
            img.width || null,
            img.height || null,
            startOrder + i,
          ]);
        }

        // 更新图片集统计信息
        const stats = await ImageSetImageModel.getImageSetStats(parseInt(imageSetId));
        const firstImage = await db.get(
          'SELECT * FROM image_set_images WHERE image_set_id = ? ORDER BY sort_order ASC LIMIT 1',
          [parseInt(imageSetId)]
        );

        await db.run(
          `UPDATE image_sets SET 
            image_count = ?, 
            total_size = ?, 
            cover_url = ?,
            thumbnail_url = ?,
            updated_at = datetime('now') 
          WHERE id = ?`,
          [stats.count, stats.totalSize, firstImage?.image_url, firstImage?.thumbnail_url, parseInt(imageSetId)]
        );
      });

      return await this.getImageSetById(parseInt(imageSetId), ownerId);
    } catch (txErr) {
      await this.cleanupUploadedFiles(images);
      throw txErr;
    }
  }

  /**
   * 从图片集删除图片
   */
  static async removeImage(imageSetId, imageId, ownerId = null) {
    if (!imageSetId || isNaN(imageSetId)) throw new Error('无效的图片集ID');
    if (!imageId || isNaN(imageId)) throw new Error('无效的图片ID');

    const imageSet = await ImageSetModel.findById(parseInt(imageSetId), ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    const image = await ImageSetImageModel.findById(parseInt(imageId));
    if (!image || image.image_set_id !== parseInt(imageSetId)) {
      throw new Error('图片不存在或不属于该图片集');
    }

    const { transaction } = require('../config/database');

    await transaction(async (db) => {
      // 删除图片记录
      await db.run('DELETE FROM image_set_images WHERE id = ?', [parseInt(imageId)]);

      // 删除物理文件
      await this.deletePhysicalFiles([image]);

      // 更新图片集统计信息
      const stats = await ImageSetImageModel.getImageSetStats(parseInt(imageSetId));
      const firstImage = await db.get(
        'SELECT * FROM image_set_images WHERE image_set_id = ? ORDER BY sort_order ASC LIMIT 1',
        [parseInt(imageSetId)]
      );

      await db.run(
        `UPDATE image_sets SET 
          image_count = ?, 
          total_size = ?, 
          cover_url = ?,
          thumbnail_url = ?,
          updated_at = datetime('now') 
        WHERE id = ?`,
        [stats.count, stats.totalSize, firstImage?.image_url || null, firstImage?.thumbnail_url || null, parseInt(imageSetId)]
      );
    });

    return await this.getImageSetById(parseInt(imageSetId), ownerId);
  }

  /**
   * 更新图片排序
   */
  static async updateImageOrder(imageSetId, imageOrders, ownerId = null) {
    if (!imageSetId || isNaN(imageSetId)) throw new Error('无效的图片集ID');
    if (!Array.isArray(imageOrders)) throw new Error('请提供排序列表');

    const imageSet = await ImageSetModel.findById(parseInt(imageSetId), ownerId);
    if (!imageSet) throw new Error('图片集不存在');

    await ImageSetImageModel.batchUpdateSortOrder(imageOrders);

    // 更新封面为第一张图片
    const { transaction } = require('../config/database');
    await transaction(async (db) => {
      const firstImage = await db.get(
        'SELECT * FROM image_set_images WHERE image_set_id = ? ORDER BY sort_order ASC LIMIT 1',
        [parseInt(imageSetId)]
      );

      if (firstImage) {
        await db.run(
          'UPDATE image_sets SET cover_url = ?, thumbnail_url = ?, updated_at = datetime(\'now\') WHERE id = ?',
          [firstImage.image_url, firstImage.thumbnail_url, parseInt(imageSetId)]
        );
      }
    });

    return await this.getImageSetById(parseInt(imageSetId), ownerId);
  }

  /**
   * 清理上传的文件（事务失败时调用）
   */
  static async cleanupUploadedFiles(images) {
    for (const img of images) {
      try {
        if (img.imageUrl) {
          const filename = path.basename(img.imageUrl);
          const filePath = path.join(process.cwd(), 'uploads', 'image-sets', filename);
          await fs.unlink(filePath).catch(() => {});
        }
        if (img.thumbnailUrl) {
          const thumbFilename = path.basename(img.thumbnailUrl);
          const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
          await fs.unlink(thumbPath).catch(() => {});
        }
      } catch (e) {
        Logger.warn('清理上传文件失败:', e);
      }
    }
  }

  /**
   * 删除物理文件
   */
  static async deletePhysicalFiles(images) {
    for (const img of images) {
      try {
        // 删除原图
        if (img.image_url || img.imageUrl) {
          const url = img.image_url || img.imageUrl;
          const filename = path.basename(url);
          const filePath = path.join(process.cwd(), 'uploads', 'image-sets', filename);
          try {
            await fs.unlink(filePath);
            Logger.debug('删除图片文件成功', { filePath });
          } catch (err) {
            if (err.code !== 'ENOENT') {
              Logger.warn('删除图片文件失败', { filePath, error: err.message });
            }
          }
        }

        // 删除缩略图
        if (img.thumbnail_url || img.thumbnailUrl) {
          const url = img.thumbnail_url || img.thumbnailUrl;
          const thumbFilename = path.basename(url);
          const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
          try {
            await fs.unlink(thumbPath);
            Logger.debug('删除缩略图成功', { thumbPath });
          } catch (err) {
            if (err.code !== 'ENOENT') {
              Logger.warn('删除缩略图失败', { thumbPath, error: err.message });
            }
          }
        }
      } catch (e) {
        Logger.warn('删除物理文件失败:', e);
      }
    }
  }
}

module.exports = ImageSetService;

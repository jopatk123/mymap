const SQLiteAdapter = require('../utils/sqlite-adapter');
const Logger = require('../utils/logger');
const { wgs84ToGcj02 } = require('../utils/coordinate');
const QueryBuilder = require('../utils/QueryBuilder');

class ImageSetModel {
  /**
   * 创建图片集
   */
  static async create({
    title,
    description,
    coverUrl,
    thumbnailUrl,
    latitude,
    longitude,
    imageCount = 0,
    totalSize = 0,
    folderId = null,
    isVisible = true,
    sortOrder = 0,
    ownerId = null,
  }) {
    try {
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(longitude, latitude);
      const [result] = await SQLiteAdapter.execute(
        `INSERT INTO image_sets (
          title, description, cover_url, thumbnail_url,
          latitude, longitude, gcj02_lat, gcj02_lng,
          image_count, total_size, folder_id, is_visible, sort_order, owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description,
          coverUrl,
          thumbnailUrl,
          latitude,
          longitude,
          gcj02Lat || null,
          gcj02Lng || null,
          imageCount,
          totalSize,
          folderId,
          isVisible,
          sortOrder,
          ownerId,
        ]
      );
      return await this.findById(result.insertId);
    } catch (error) {
      Logger.error('创建图片集失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找图片集
   */
  static async findById(id, ownerId = null) {
    try {
      let sql = `SELECT ims.*, f.name as folder_name 
         FROM image_sets ims 
         LEFT JOIN folders f ON ims.folder_id = f.id 
         WHERE ims.id = ?`;
      const params = [id];
      if (ownerId) {
        sql += ' AND ims.owner_id = ?';
        params.push(ownerId);
      }
      const [rows] = await SQLiteAdapter.execute(sql, params);
      return rows[0] || null;
    } catch (error) {
      Logger.error('查找图片集失败:', error);
      throw error;
    }
  }

  /**
   * 获取图片集列表
   */
  static async findAll({
    page = 1,
    pageSize = 20,
    keyword = '',
    folderId = null,
    includeHidden = false,
    visibleFolderIds = null,
    ownerId = null,
  } = {}) {
    try {
      let whereConditions = [];
      let params = [];

      // 用户数据隔离
      if (ownerId) {
        whereConditions.push('ims.owner_id = ?');
        params.push(ownerId);
      }

      if (keyword && keyword.trim()) {
        whereConditions.push('(ims.title LIKE ? OR ims.description LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'ims');
      whereConditions = whereConditions.concat(folderCondition.conditions);
      params = params.concat(folderCondition.params);

      // 可见性条件
      if (!includeHidden) {
        whereConditions.push('ims.is_visible = 1');
      }

      // 文件夹可见性过滤
      if (visibleFolderIds && Array.isArray(visibleFolderIds)) {
        if (visibleFolderIds.length === 0) {
          whereConditions.push('ims.folder_id IS NULL');
        } else {
          const placeholders = visibleFolderIds.map(() => '?').join(',');
          whereConditions.push(`(ims.folder_id IS NULL OR ims.folder_id IN (${placeholders}))`);
          params.push(...visibleFolderIds);
        }
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM image_sets ims ${whereClause}`;
      const [countResult] = await SQLiteAdapter.execute(countSql, params);
      const total = countResult[0].total;

      // 分页获取数据
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const dataSql = `
        SELECT ims.*, f.name as folder_name 
        FROM image_sets ims 
        LEFT JOIN folders f ON ims.folder_id = f.id 
        ${whereClause}
        ORDER BY ims.sort_order ASC, ims.created_at DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${offset}
      `;

      const [rows] = await SQLiteAdapter.execute(dataSql, params);

      return {
        data: rows,
        total: parseInt(total),
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      Logger.error('获取图片集列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据地图边界获取图片集
   */
  static async findByBounds({
    north,
    south,
    east,
    west,
    includeHidden = false,
    visibleFolderIds = null,
    ownerId = null,
  }) {
    try {
      let conditions = ['gcj02_lat BETWEEN ? AND ?', 'gcj02_lng BETWEEN ? AND ?'];
      let params = [south, north, west, east];

      if (!includeHidden) {
        conditions.push('is_visible = 1');
      }

      if (visibleFolderIds && Array.isArray(visibleFolderIds)) {
        if (visibleFolderIds.length === 0) {
          conditions.push('folder_id IS NULL');
        } else {
          const placeholders = visibleFolderIds.map(() => '?').join(',');
          conditions.push(`(folder_id IS NULL OR folder_id IN (${placeholders}))`);
          params.push(...visibleFolderIds);
        }
      }

      if (ownerId) {
        conditions.push('owner_id = ?');
        params.push(ownerId);
      }

      const sql = `
        SELECT * FROM image_sets 
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
      `;

      const [rows] = await SQLiteAdapter.execute(sql, params);
      return rows;
    } catch (error) {
      Logger.error('根据边界获取图片集失败:', error);
      throw error;
    }
  }

  /**
   * 更新图片集
   */
  static async update(id, data) {
    try {
      const updates = [];
      const params = [];

      if (Object.prototype.hasOwnProperty.call(data, 'title')) {
        updates.push('title = ?');
        params.push(data.title);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'description')) {
        updates.push('description = ?');
        params.push(data.description || null);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'coverUrl')) {
        updates.push('cover_url = ?');
        params.push(data.coverUrl);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'thumbnailUrl')) {
        updates.push('thumbnail_url = ?');
        params.push(data.thumbnailUrl || null);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'folderId')) {
        if (data.folderId !== null && data.folderId !== undefined) {
          updates.push('folder_id = ?');
          params.push(data.folderId);
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'isVisible')) {
        updates.push('is_visible = ?');
        params.push(Boolean(data.isVisible) ? 1 : 0);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'sortOrder')) {
        updates.push('sort_order = ?');
        params.push(parseInt(data.sortOrder) || 0);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'imageCount')) {
        updates.push('image_count = ?');
        params.push(parseInt(data.imageCount) || 0);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'totalSize')) {
        updates.push('total_size = ?');
        params.push(parseInt(data.totalSize) || 0);
      }

      // 坐标更新
      const hasLat =
        Object.prototype.hasOwnProperty.call(data, 'latitude') ||
        Object.prototype.hasOwnProperty.call(data, 'lat');
      const hasLng =
        Object.prototype.hasOwnProperty.call(data, 'longitude') ||
        Object.prototype.hasOwnProperty.call(data, 'lng');

      if (hasLat || hasLng) {
        const current = await this.findById(id);
        if (!current) return null;

        const latitude = Object.prototype.hasOwnProperty.call(data, 'latitude')
          ? data.latitude
          : Object.prototype.hasOwnProperty.call(data, 'lat')
          ? data.lat
          : current.latitude;
        const longitude = Object.prototype.hasOwnProperty.call(data, 'longitude')
          ? data.longitude
          : Object.prototype.hasOwnProperty.call(data, 'lng')
          ? data.lng
          : current.longitude;

        updates.push('latitude = ?');
        params.push(latitude);
        updates.push('longitude = ?');
        params.push(longitude);

        try {
          const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(longitude, latitude);
          updates.push('gcj02_lat = ?');
          params.push(gcj02Lat || null);
          updates.push('gcj02_lng = ?');
          params.push(gcj02Lng || null);
        } catch (e) {
          updates.push('gcj02_lat = ?');
          params.push(null);
          updates.push('gcj02_lng = ?');
          params.push(null);
        }
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      const sql = `UPDATE image_sets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params.push(id);
      await SQLiteAdapter.execute(sql, params);
      return await this.findById(id);
    } catch (error) {
      Logger.error('更新图片集失败:', error);
      throw error;
    }
  }

  /**
   * 删除图片集
   */
  static async delete(id) {
    try {
      const imageSet = await this.findById(id);
      if (!imageSet) return null;

      await SQLiteAdapter.execute('DELETE FROM image_sets WHERE id = ?', [id]);
      return imageSet;
    } catch (error) {
      Logger.error('删除图片集失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除图片集
   */
  static async batchDelete(ids) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      const [rows] = await SQLiteAdapter.execute(
        `SELECT * FROM image_sets WHERE id IN (${placeholders})`,
        ids
      );
      await SQLiteAdapter.execute(`DELETE FROM image_sets WHERE id IN (${placeholders})`, ids);
      return rows;
    } catch (error) {
      Logger.error('批量删除图片集失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新可见性
   */
  static async batchUpdateVisibility(ids, isVisible) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      await SQLiteAdapter.execute(
        `UPDATE image_sets SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [isVisible ? 1 : 0, ...ids]
      );
      const [rows] = await SQLiteAdapter.execute(
        `SELECT * FROM image_sets WHERE id IN (${placeholders})`,
        ids
      );
      return rows;
    } catch (error) {
      Logger.error('批量更新图片集可见性失败:', error);
      throw error;
    }
  }

  /**
   * 批量移动到文件夹
   */
  static async batchMoveToFolder(ids, folderId) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      await SQLiteAdapter.execute(
        `UPDATE image_sets SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [folderId, ...ids]
      );
      const [rows] = await SQLiteAdapter.execute(
        `SELECT * FROM image_sets WHERE id IN (${placeholders})`,
        ids
      );
      return rows;
    } catch (error) {
      Logger.error('批量移动图片集失败:', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  static async getStats(ownerId = null) {
    try {
      let whereClause = '';
      const params = [];

      if (ownerId) {
        whereClause = 'WHERE owner_id = ?';
        params.push(ownerId);
      }

      const [result] = await SQLiteAdapter.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(image_count) as totalImages,
          SUM(total_size) as totalSize
        FROM image_sets ${whereClause}`,
        params
      );

      return {
        total: result[0].total || 0,
        totalImages: result[0].totalImages || 0,
        totalSize: result[0].totalSize || 0,
      };
    } catch (error) {
      Logger.error('获取图片集统计信息失败:', error);
      throw error;
    }
  }
}

module.exports = ImageSetModel;

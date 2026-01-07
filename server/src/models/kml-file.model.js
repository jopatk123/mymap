const SQLiteAdapter = require('../utils/sqlite-adapter');
const QueryBuilder = require('../utils/QueryBuilder');
const Logger = require('../utils/logger');

class KmlFileModel {
  static async create({
    title,
    description,
    fileUrl,
    fileSize,
    folderId = null,
    isVisible = true,
    sortOrder = 0,
    isBasemap = 0,
    ownerId = null,
  }) {
    try {
      const [result] = await SQLiteAdapter.execute(
        `INSERT INTO kml_files (
          title, description, file_url, file_size, 
      folder_id, is_visible, sort_order, is_basemap, owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, fileUrl, fileSize, folderId, isVisible, sortOrder, isBasemap, ownerId]
      );
      return await this.findById(result.insertId);
    } catch (error) {
      Logger.error('创建KML文件记录失败:', error);
      throw error;
    }
  }

  static async findById(id, ownerId = null) {
    try {
      let sql = `SELECT kf.*, f.name as folder_name 
         FROM kml_files kf 
         LEFT JOIN folders f ON kf.folder_id = f.id 
         WHERE kf.id = ?`;
      const params = [id];
      if (ownerId) {
        sql += ' AND kf.owner_id = ?';
        params.push(ownerId);
      }
      const [rows] = await SQLiteAdapter.execute(sql, params);
      return rows[0] || null;
    } catch (error) {
      Logger.error('查找KML文件失败:', error);
      throw error;
    }
  }

  static async findAll({
    page = 1,
    pageSize = 20,
    keyword = '',
    folderId = null,
    includeHidden = false,
    visibleFolderIds = null,
    includeBasemap = false,
    basemapOnly = false,
    ownerId = null,
  } = {}) {
    try {
      let whereConditions = [];
      let params = [];

      // 用户数据隔离
      if (ownerId) {
        whereConditions.push('kf.owner_id = ?');
        params.push(ownerId);
      }

      const kw = keyword !== undefined && keyword !== null ? String(keyword).trim() : '';
      if (kw) {
        whereConditions.push('(kf.title LIKE ? OR kf.description LIKE ?)');
        params.push(`%${kw}%`, `%${kw}%`);
      }

      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'kf');
      whereConditions = whereConditions.concat(folderCondition.conditions);
      params = params.concat(folderCondition.params);

      if (visibleFolderIds && Array.isArray(visibleFolderIds)) {
        if (visibleFolderIds.length === 0) {
          whereConditions.push('kf.folder_id IS NULL');
        } else {
          const placeholders = visibleFolderIds.map(() => '?').join(',');
          whereConditions.push(`(kf.folder_id IS NULL OR kf.folder_id IN (${placeholders}))`);
          params.push(...visibleFolderIds);
        }
      }

      if (!includeHidden) {
        whereConditions.push('kf.is_visible = TRUE');
      }

      // 底图过滤逻辑
      if (basemapOnly) {
        // 只显示底图文件
        whereConditions.push('kf.is_basemap = 1');
      } else if (!includeBasemap) {
        // 默认不包含底图文件，只显示普通文件
        whereConditions.push('(kf.is_basemap = 0 OR kf.is_basemap IS NULL)');
      }
      // 如果includeBasemap=true且basemapOnly=false，则显示所有文件

      const whereClause =
        whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const [countResult] = await SQLiteAdapter.execute(
        `SELECT COUNT(*) as total 
         FROM kml_files kf 
         ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      const limit = Number.parseInt(pageSize, 10) || 20;
      const offset = (Number.parseInt(page, 10) - 1) * limit;
      const sql = `
        SELECT kf.*, f.name as folder_name,
        (SELECT COUNT(*) FROM kml_points kp WHERE kp.kml_file_id = kf.id) as point_count
        FROM kml_files kf 
        LEFT JOIN folders f ON kf.folder_id = f.id 
        ${whereClause}
        ORDER BY kf.sort_order ASC, kf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [rows] = await SQLiteAdapter.execute(sql, params);

      return {
        data: rows,
        total: parseInt(total),
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      Logger.error('获取KML文件列表失败:', error);
      throw error;
    }
  }

  static async findByFolder(folderId, { includeHidden = false, ownerId = null } = {}) {
    try {
      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'kf');
      const conditions = [...folderCondition.conditions];
      const params = [...folderCondition.params];

      if (ownerId) {
        conditions.push('kf.owner_id = ?');
        params.push(ownerId);
      }

      if (!includeHidden) {
        conditions.push('kf.is_visible = TRUE');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [rows] = await SQLiteAdapter.execute(
        `SELECT kf.*, f.name as folder_name,
         (SELECT COUNT(*) FROM kml_points kp WHERE kp.kml_file_id = kf.id) as point_count
         FROM kml_files kf 
         LEFT JOIN folders f ON kf.folder_id = f.id 
         ${whereClause}
         ORDER BY kf.sort_order ASC, kf.created_at DESC`,
        params
      );

      return rows;
    } catch (error) {
      Logger.error('根据文件夹查找KML文件失败:', error);
      throw error;
    }
  }

  static async update(id, updateData, ownerId = null) {
    try {
      // 先检查权限
      if (ownerId) {
        const existing = await this.findById(id, ownerId);
        if (!existing) {
          throw new Error('KML文件不存在或无权操作');
        }
      }

      const allowedFields = [
        'title',
        'description',
        'folder_id',
        'is_visible',
        'sort_order',
        'is_basemap',
        'isBasemap',
      ];

      const updates = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          // normalize camelCase isBasemap => is_basemap
          const column = key === 'isBasemap' ? 'is_basemap' : key;
          updates.push(`${column} = ?`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error('没有有效的更新字段');
      }

      params.push(id);

      await SQLiteAdapter.execute(
        `UPDATE kml_files SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      );

      return await this.findById(id);
    } catch (error) {
      Logger.error('更新KML文件失败:', error);
      throw error;
    }
  }

  static async delete(id, ownerId = null) {
    try {
      // 先检查权限
      if (ownerId) {
        const existing = await this.findById(id, ownerId);
        if (!existing) {
          throw new Error('KML文件不存在或无权操作');
        }
      }

      const [result] = await SQLiteAdapter.execute('DELETE FROM kml_files WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('删除KML文件失败:', error);
      throw error;
    }
  }

  static async batchDelete(ids, ownerId = null) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表');
      }

      // 如果有 ownerId，先过滤出属于该用户的记录
      let targetIds = ids;
      if (ownerId) {
        const validIds = [];
        for (const id of ids) {
          const existing = await this.findById(id, ownerId);
          if (existing) validIds.push(id);
        }
        targetIds = validIds;
      }

      if (targetIds.length === 0) return 0;

      const placeholders = targetIds.map(() => '?').join(',');
      const [result] = await SQLiteAdapter.execute(
        `DELETE FROM kml_files WHERE id IN (${placeholders})`,
        targetIds
      );
      return result.affectedRows;
    } catch (error) {
      Logger.error('批量删除KML文件失败:', error);
      throw error;
    }
  }

  static async batchUpdateVisibility(ids, isVisible, ownerId = null) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表');
      }

      // 如果有 ownerId，先过滤出属于该用户的记录
      let targetIds = ids;
      if (ownerId) {
        const validIds = [];
        for (const id of ids) {
          const existing = await this.findById(id, ownerId);
          if (existing) validIds.push(id);
        }
        targetIds = validIds;
      }

      if (targetIds.length === 0) return 0;

      const placeholders = targetIds.map(() => '?').join(',');
      const [result] = await SQLiteAdapter.execute(
        `UPDATE kml_files SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [isVisible, ...targetIds]
      );
      return result.affectedRows;
    } catch (error) {
      Logger.error('批量更新KML文件可见性失败:', error);
      throw error;
    }
  }

  static async batchMoveToFolder(ids, folderId, ownerId = null) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表');
      }

      // 如果有 ownerId，先过滤出属于该用户的记录
      let targetIds = ids;
      if (ownerId) {
        const validIds = [];
        for (const id of ids) {
          const existing = await this.findById(id, ownerId);
          if (existing) validIds.push(id);
        }
        targetIds = validIds;
      }

      if (targetIds.length === 0) return 0;

      const placeholders = targetIds.map(() => '?').join(',');
      const [result] = await SQLiteAdapter.execute(
        `UPDATE kml_files SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [folderId, ...targetIds]
      );
      return result.affectedRows;
    } catch (error) {
      Logger.error('批量移动KML文件到文件夹失败:', error);
      throw error;
    }
  }

  static async getStats(ownerId = null) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_visible = TRUE THEN 1 END) as visible,
          COUNT(CASE WHEN is_visible = FALSE THEN 1 END) as hidden,
          (SELECT COUNT(*) FROM kml_points${ownerId ? ' WHERE owner_id = ?' : ''}) as total_points
        FROM kml_files
      `;
      const params = [];
      if (ownerId) {
        sql += ' WHERE owner_id = ?';
        params.push(ownerId, ownerId);
      }
      const [rows] = await SQLiteAdapter.execute(sql, params);
      return rows[0];
    } catch (error) {
      Logger.error('获取KML文件统计失败:', error);
      throw error;
    }
  }
}

module.exports = KmlFileModel;

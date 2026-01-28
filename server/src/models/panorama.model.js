const SQLiteAdapter = require('../utils/sqlite-adapter');
const QueryBuilder = require('../utils/QueryBuilder');
const { findAllPanoramas, searchPanoramas, updatePanorama } = require('./panorama.model-helpers');

class PanoramaModel {
  // 获取全景图列表
  static async findAll(options = {}) {
    return await findAllPanoramas(options, (sql, params) => SQLiteAdapter.execute(sql, params));
  }

  // 根据ID获取全景图
  static async findById(id, ownerId = null) {
    const sql = ownerId
      ? 'SELECT * FROM panoramas WHERE id = ? AND owner_id = ?'
      : 'SELECT * FROM panoramas WHERE id = ?';
    const params = ownerId ? [id, ownerId] : [id];
    const [rows] = await SQLiteAdapter.execute(sql, params);
    return rows[0] || null;
  }

  // 根据边界获取全景图
  static async findByBounds(bounds, ownerId = null) {
    const { north, south, east, west, includeHidden = false, visibleFolderIds = null } = bounds;

    let conditions = ['latitude BETWEEN ? AND ?', 'longitude BETWEEN ? AND ?'];
    let params = [south, north, west, east];

    if (!includeHidden) {
      conditions.push('is_visible = TRUE');
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
      SELECT * FROM panoramas 
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const [rows] = await SQLiteAdapter.execute(sql, params);
    return rows;
  }

  // 获取附近的全景图
  static async findNearby(lat, lng, radius = 1000, ownerId = null) {
    const nearbyQuery = QueryBuilder.buildNearbyQuery(lat, lng, radius);

    const filterClause = ownerId ? 'WHERE owner_id = ?' : '';
    const sql = `
      SELECT *, ${nearbyQuery.selectDistance}
      FROM panoramas
      ${filterClause}
      HAVING ${nearbyQuery.havingCondition}
      ORDER BY distance ASC
    `;

    const params = ownerId
      ? [...nearbyQuery.params, ownerId, nearbyQuery.havingParam]
      : [...nearbyQuery.params, nearbyQuery.havingParam];

    const [rows] = await SQLiteAdapter.execute(sql, params);
    return rows;
  }

  // 创建全景图
  static async create(panoramaData) {
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      latitude,
      longitude,
      gcj02Lat,
      gcj02Lng,
      fileSize,
      fileType,
      folderId,
      isVisible = true,
      sortOrder = 0,
      ownerId = null,
    } = panoramaData;

    const sql = `
      INSERT INTO panoramas (
        title, description, image_url, thumbnail_url,
        latitude, longitude, gcj02_lat, gcj02_lng,
        file_size, file_type, folder_id, is_visible, sort_order, owner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      title,
      description || null,
      imageUrl,
      thumbnailUrl || null,
      latitude,
      longitude,
      gcj02Lat || null,
      gcj02Lng || null,
      fileSize || null,
      fileType || null,
      folderId || null,
      isVisible,
      sortOrder,
      ownerId,
    ];

    const [result] = await SQLiteAdapter.execute(sql, params);
    return await this.findById(result.insertId);
  }

  // 更新全景图
  static async update(id, panoramaData) {
    return await updatePanorama(id, panoramaData, {
      findById: (value) => this.findById(value),
      execute: (sql, params) => SQLiteAdapter.execute(sql, params),
    });
  }

  // 删除全景图
  static async delete(id) {
    const sql = 'DELETE FROM panoramas WHERE id = ?';
    const [result] = await SQLiteAdapter.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // 批量删除全景图
  static async batchDelete(ids) {
    if (!ids || ids.length === 0) return 0;

    const { clause, params } = QueryBuilder.buildInClause(ids);
    const sql = `DELETE FROM panoramas WHERE id ${clause}`;
    const [result] = await SQLiteAdapter.execute(sql, params);
    return result.affectedRows;
  }

  // 搜索全景图
  static async search(searchParams) {
    return await searchPanoramas(searchParams, (sql, params) => SQLiteAdapter.execute(sql, params));
  }

  // 获取统计信息
  static async getStats(ownerId = null) {
    const totalSql = ownerId
      ? 'SELECT COUNT(*) as total FROM panoramas WHERE owner_id = ?'
      : 'SELECT COUNT(*) as total FROM panoramas';
    const recentSql = ownerId
      ? 'SELECT COUNT(*) as recent FROM panoramas WHERE owner_id = ? AND created_at >= datetime("now", "-7 day")'
      : 'SELECT COUNT(*) as recent FROM panoramas WHERE created_at >= datetime("now", "-7 day")';

    const totalParams = ownerId ? [ownerId] : [];
    const recentParams = ownerId ? [ownerId] : [];

    const [totalResult] = await SQLiteAdapter.execute(totalSql, totalParams);
    const [recentResult] = await SQLiteAdapter.execute(recentSql, recentParams);

    return {
      total: totalResult[0].total,
      recentWeek: recentResult[0].recent,
    };
  }

  // 移动全景图到文件夹
  static async moveToFolder(id, folderId, ownerId = null) {
    let sql = 'UPDATE panoramas SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [folderId, id];

    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }

    await SQLiteAdapter.execute(sql, params);
    return await this.findById(id, ownerId);
  }

  // 批量移动全景图到文件夹
  static async batchMoveToFolder(ids, folderId, ownerId = null) {
    if (!ids || ids.length === 0) return 0;

    const { clause, params } = QueryBuilder.buildInClause(ids);
    let sql = `UPDATE panoramas SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id ${clause}`;
    const sqlParams = [folderId, ...params];

    if (ownerId) {
      sql += ' AND owner_id = ?';
      sqlParams.push(ownerId);
    }

    const [result] = await SQLiteAdapter.execute(sql, sqlParams);
    return result.affectedRows;
  }

  // 更新可见性
  static async updateVisibility(id, isVisible, ownerId = null) {
    let sql = 'UPDATE panoramas SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [isVisible, id];

    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }

    await SQLiteAdapter.execute(sql, params);
    return await this.findById(id, ownerId);
  }

  // 批量更新可见性
  static async batchUpdateVisibility(ids, isVisible, ownerId = null) {
    if (!ids || ids.length === 0) return 0;

    const { clause, params } = QueryBuilder.buildInClause(ids);
    let sql = `UPDATE panoramas SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id ${clause}`;
    const sqlParams = [isVisible, ...params];

    if (ownerId) {
      sql += ' AND owner_id = ?';
      sqlParams.push(ownerId);
    }

    const [result] = await SQLiteAdapter.execute(sql, sqlParams);
    return result.affectedRows;
  }

  // 根据文件夹获取全景图
  static async findByFolder(folderId, options = {}) {
    const { includeHidden = false, sortBy = 'sort_order', sortOrder = 'ASC' } = options;

    const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'p');
    const conditions = [...folderCondition.conditions];
    const params = [...folderCondition.params];

    if (!includeHidden) {
      conditions.push('p.is_visible = TRUE');
    }

    let sql = 'SELECT p.* FROM panoramas p';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const allowedSortFields = ['created_at', 'title', 'sort_order'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'sort_order';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${order}`;

    const [rows] = await SQLiteAdapter.execute(sql, params);
    return rows;
  }
}

module.exports = PanoramaModel;

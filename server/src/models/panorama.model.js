const { pool } = require('../config/database')
const QueryBuilder = require('../utils/QueryBuilder')

class PanoramaModel {
  // 获取全景图列表
  static async findAll(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      keyword = '',
      bounds = null,
      folderId = null,
      includeHidden = false
    } = options
    
    try {
      // 使用QueryBuilder构建查询条件
      const { conditions, params } = QueryBuilder.buildPanoramaConditions({
        includeHidden,
        folderId,
        keyword,
        bounds
      })
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      
      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM panoramas p ${whereClause}`
      const [countResult] = await pool.execute(countSql, params)
      const total = countResult[0].total
      
      // 获取数据
      const offset = (parseInt(page) - 1) * parseInt(pageSize)
      const dataSql = `
        SELECT p.*, f.name as folder_name 
        FROM panoramas p 
        LEFT JOIN folders f ON p.folder_id = f.id 
        ${whereClause}
        ${QueryBuilder.buildOrderClause(sortBy, sortOrder, ['created_at', 'title', 'latitude', 'longitude', 'sort_order'], 'p')}
        LIMIT ${parseInt(pageSize)} OFFSET ${offset}
      `
      
      const [rows] = await pool.execute(dataSql, params)
      
      return {
        data: rows,
        total: parseInt(total),
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (error) {
      console.error('获取全景图列表失败:', error)
      throw error
    }
  }
  
  // 根据ID获取全景图
  static async findById(id) {
    const sql = 'SELECT * FROM panoramas WHERE id = ?'
    const [rows] = await pool.execute(sql, [id])
    return rows[0] || null
  }
  
  // 根据边界获取全景图
  static async findByBounds(bounds) {
    const { north, south, east, west } = bounds
    const sql = `
      SELECT * FROM panoramas 
      WHERE latitude BETWEEN ? AND ? 
      AND longitude BETWEEN ? AND ?
      ORDER BY created_at DESC
    `
    const [rows] = await pool.execute(sql, [south, north, west, east])
    return rows
  }
  
  // 获取附近的全景图
  static async findNearby(lat, lng, radius = 1000) {
    const nearbyQuery = QueryBuilder.buildNearbyQuery(lat, lng, radius)
    
    const sql = `
      SELECT *, ${nearbyQuery.selectDistance}
      FROM panoramas
      HAVING ${nearbyQuery.havingCondition}
      ORDER BY distance ASC
    `
    
    const [rows] = await pool.execute(sql, [...nearbyQuery.params, radius])
    return rows
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
      sortOrder = 0
    } = panoramaData
    
    const sql = `
      INSERT INTO panoramas (
        title, description, image_url, thumbnail_url,
        latitude, longitude, gcj02_lat, gcj02_lng,
        file_size, file_type, folder_id, is_visible, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
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
      sortOrder
    ]
    
    const [result] = await pool.execute(sql, params)
    return await this.findById(result.insertId)
  }
  
  // 更新全景图
  static async update(id, panoramaData) {
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      latitude,
      longitude,
      gcj02Lat,
      gcj02Lng,
      folderId,
      isVisible,
      sortOrder
    } = panoramaData
    
    const sql = `
      UPDATE panoramas SET
        title = ?,
        description = ?,
        image_url = ?,
        thumbnail_url = ?,
        latitude = ?,
        longitude = ?,
        gcj02_lat = ?,
        gcj02_lng = ?,
        folder_id = ?,
        is_visible = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    
    const params = [
      title,
      description || null,
      imageUrl,
      thumbnailUrl || null,
      latitude,
      longitude,
      gcj02Lat || null,
      gcj02Lng || null,
      folderId || null,
      isVisible !== undefined ? isVisible : true,
      sortOrder !== undefined ? sortOrder : 0,
      id
    ]
    
    await pool.execute(sql, params)
    return await this.findById(id)
  }
  
  // 删除全景图
  static async delete(id) {
    const sql = 'DELETE FROM panoramas WHERE id = ?'
    const [result] = await pool.execute(sql, [id])
    return result.affectedRows > 0
  }
  
  // 批量删除全景图
  static async batchDelete(ids) {
    if (!ids || ids.length === 0) return 0
    
    const { clause, params } = QueryBuilder.buildInClause(ids)
    const sql = `DELETE FROM panoramas WHERE id ${clause}`
    const [result] = await pool.execute(sql, params)
    return result.affectedRows
  }
  
  // 搜索全景图
  static async search(searchParams) {
    const {
      keyword = '',
      lat = null,
      lng = null,
      radius = null,
      dateFrom = null,
      dateTo = null,
      page = 1,
      pageSize = 20
    } = searchParams
    
    // 使用QueryBuilder构建查询条件
    const { conditions, params } = QueryBuilder.buildPanoramaConditions({
      keyword,
      dateFrom,
      dateTo,
      includeHidden: true // 搜索时包含隐藏项
    })
    
    let sql = 'SELECT * FROM panoramas'
    let finalParams = [...params]
    
    // 处理位置搜索
    if (lat && lng && radius) {
      const nearbyQuery = QueryBuilder.buildNearbyQuery(lat, lng, radius)
      sql = `SELECT *, ${nearbyQuery.selectDistance} FROM panoramas`
      finalParams = [...nearbyQuery.params, ...finalParams]
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')} HAVING ${nearbyQuery.havingCondition}`
        finalParams.push(radius)
      } else {
        sql += ` HAVING ${nearbyQuery.havingCondition}`
        finalParams.push(radius)
      }
      sql += ' ORDER BY distance ASC'
    } else {
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`
      }
      sql += ' ORDER BY created_at DESC'
    }
    
    sql += ` ${QueryBuilder.buildLimitClause(page, pageSize)}`
    
    const [rows] = await pool.execute(sql, finalParams)
    
    // 构建计数查询
    let countSql = 'SELECT COUNT(*) as total FROM panoramas'
    let countParams = [...params]
    
    if (lat && lng && radius) {
      const nearbyQuery = QueryBuilder.buildNearbyQuery(lat, lng, radius)
      countSql = `SELECT COUNT(*) as total FROM (
        SELECT *, ${nearbyQuery.selectDistance} FROM panoramas
        ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
        HAVING ${nearbyQuery.havingCondition}
      ) as filtered`
      countParams = [...nearbyQuery.params, ...countParams, radius]
    } else if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`
    }
    
    const [countResult] = await pool.execute(countSql, countParams)
    const total = countResult[0].total
    
    return {
      data: rows,
      total: parseInt(total),
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    }
  }
  
  // 获取统计信息
  static async getStats() {
    const totalSql = 'SELECT COUNT(*) as total FROM panoramas'
    const recentSql = 'SELECT COUNT(*) as recent FROM panoramas WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    
    const [totalResult] = await pool.execute(totalSql)
    const [recentResult] = await pool.execute(recentSql)
    
    return {
      total: totalResult[0].total,
      recentWeek: recentResult[0].recent
    }
  }
  
  // 移动全景图到文件夹
  static async moveToFolder(id, folderId) {
    const sql = 'UPDATE panoramas SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    await pool.execute(sql, [folderId, id])
    return await this.findById(id)
  }

  // 批量移动全景图到文件夹
  static async batchMoveToFolder(ids, folderId) {
    if (!ids || ids.length === 0) return 0
    
    const { clause, params } = QueryBuilder.buildInClause(ids)
    const sql = `UPDATE panoramas SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id ${clause}`
    const [result] = await pool.execute(sql, [folderId, ...params])
    return result.affectedRows
  }

  // 更新可见性
  static async updateVisibility(id, isVisible) {
    const sql = 'UPDATE panoramas SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    await pool.execute(sql, [isVisible, id])
    return await this.findById(id)
  }

  // 批量更新可见性
  static async batchUpdateVisibility(ids, isVisible) {
    if (!ids || ids.length === 0) return 0
    
    const { clause, params } = QueryBuilder.buildInClause(ids)
    const sql = `UPDATE panoramas SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id ${clause}`
    const [result] = await pool.execute(sql, [isVisible, ...params])
    return result.affectedRows
  }

  // 根据文件夹获取全景图
  static async findByFolder(folderId, options = {}) {
    const {
      includeHidden = false,
      sortBy = 'sort_order',
      sortOrder = 'ASC'
    } = options
    
    const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'p')
    let sql = `SELECT p.* FROM panoramas p WHERE ${folderCondition.conditions.join(' AND ')}`
    const params = folderCondition.params
    
    if (!includeHidden) {
      sql += ' AND p.is_visible = TRUE'
    }
    
    const allowedSortFields = ['created_at', 'title', 'sort_order']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'sort_order'
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${sortField} ${order}`
    
    const [rows] = await pool.execute(sql, params)
    return rows
  }
}

module.exports = PanoramaModel
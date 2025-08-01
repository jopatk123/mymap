const { query, transaction } = require('../config/database')

class PanoramaModel {
  // 获取全景图列表
  static async findAll(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      keyword = '',
      bounds = null
    } = options
    
    let sql = 'SELECT * FROM panoramas WHERE 1=1'
    const params = []
    
    // 关键词搜索
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    
    // 地图边界筛选
    if (bounds) {
      const { north, south, east, west } = bounds
      sql += ' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?'
      params.push(south, north, west, east)
    }
    
    // 排序
    const allowedSortFields = ['created_at', 'title', 'latitude', 'longitude']
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${sortField} ${order}`
    
    // 分页
    const offset = (page - 1) * pageSize
    sql += ` LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`
    
    const rows = await query(sql, params)
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM panoramas WHERE 1=1'
    const countParams = []
    
    if (keyword) {
      countSql += ' AND (title LIKE ? OR description LIKE ?)'
      countParams.push(`%${keyword}%`, `%${keyword}%`)
    }
    
    if (bounds) {
      const { north, south, east, west } = bounds
      countSql += ' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?'
      countParams.push(south, north, west, east)
    }
    
    const [{ total }] = await query(countSql, countParams)
    
    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }
  
  // 根据ID获取全景图
  static async findById(id) {
    const sql = 'SELECT * FROM panoramas WHERE id = ?'
    const rows = await query(sql, [id])
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
    return await query(sql, [south, north, west, east])
  }
  
  // 获取附近的全景图
  static async findNearby(lat, lng, radius = 1000) {
    // 使用Haversine公式计算距离
    const sql = `
      SELECT *,
        (6371000 * acos(
          cos(radians(?)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(latitude))
        )) AS distance
      FROM panoramas
      HAVING distance <= ?
      ORDER BY distance ASC
    `
    return await query(sql, [lat, lng, lat, radius])
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
      fileType
    } = panoramaData
    
    const sql = `
      INSERT INTO panoramas (
        title, description, image_url, thumbnail_url,
        latitude, longitude, gcj02_lat, gcj02_lng,
        file_size, file_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      fileType || null
    ]
    
    const result = await query(sql, params)
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
      gcj02Lng
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
      id
    ]
    
    await query(sql, params)
    return await this.findById(id)
  }
  
  // 删除全景图
  static async delete(id) {
    const sql = 'DELETE FROM panoramas WHERE id = ?'
    const result = await query(sql, [id])
    return result.affectedRows > 0
  }
  
  // 批量删除全景图
  static async batchDelete(ids) {
    if (!ids || ids.length === 0) return 0
    
    const placeholders = ids.map(() => '?').join(',')
    const sql = `DELETE FROM panoramas WHERE id IN (${placeholders})`
    const result = await query(sql, ids)
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
    
    let sql = 'SELECT * FROM panoramas WHERE 1=1'
    const params = []
    
    // 关键词搜索
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    
    // 位置搜索
    if (lat && lng && radius) {
      sql += ` AND (6371000 * acos(
        cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + 
        sin(radians(?)) * sin(radians(latitude))
      )) <= ?`
      params.push(lat, lng, lat, radius)
    }
    
    // 日期范围搜索
    if (dateFrom) {
      sql += ' AND created_at >= ?'
      params.push(dateFrom)
    }
    
    if (dateTo) {
      sql += ' AND created_at <= ?'
      params.push(dateTo)
    }
    
    // 排序和分页
    sql += ' ORDER BY created_at DESC'
    const offset = (page - 1) * pageSize
    sql += ` LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`
    
    const rows = await query(sql, params)
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM panoramas WHERE 1=1'
    const countParams = []
    
    if (keyword) {
      countSql += ' AND (title LIKE ? OR description LIKE ?)'
      countParams.push(`%${keyword}%`, `%${keyword}%`)
    }
    
    if (lat && lng && radius) {
      countSql += ` AND (6371000 * acos(
        cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + 
        sin(radians(?)) * sin(radians(latitude))
      )) <= ?`
      countParams.push(lat, lng, lat, radius)
    }
    
    if (dateFrom) {
      countSql += ' AND created_at >= ?'
      countParams.push(dateFrom)
    }
    
    if (dateTo) {
      countSql += ' AND created_at <= ?'
      countParams.push(dateTo)
    }
    
    const [{ total }] = await query(countSql, countParams)
    
    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }
  
  // 获取统计信息
  static async getStats() {
    const totalSql = 'SELECT COUNT(*) as total FROM panoramas'
    const recentSql = 'SELECT COUNT(*) as recent FROM panoramas WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    
    const [totalResult] = await query(totalSql)
    const [recentResult] = await query(recentSql)
    
    return {
      total: totalResult.total,
      recentWeek: recentResult.recent
    }
  }
}

module.exports = PanoramaModel
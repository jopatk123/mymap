const SQLiteAdapter = require('../utils/sqlite-adapter')
const { wgs84ToGcj02 } = require('../utils/coordinate')
const QueryBuilder = require('../utils/QueryBuilder')

class VideoPointModel {
  static async create({
    title,
    description,
    videoUrl,
    thumbnailUrl,
    latitude,
    longitude,
    fileSize,
    fileType,
    duration,
    folderId = null,
    isVisible = true,
    sortOrder = 0
  }) {
    try {
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(longitude, latitude)
      const [result] = await SQLiteAdapter.execute(
        `INSERT INTO video_points (
          title, description, video_url, thumbnail_url,
          latitude, longitude, gcj02_lat, gcj02_lng,
          file_size, file_type, duration, folder_id, is_visible, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, description, videoUrl, thumbnailUrl,
          latitude, longitude, gcj02Lat || null, gcj02Lng || null,
          fileSize, fileType, duration, folderId, isVisible, sortOrder
        ]
      )
      return await this.findById(result.insertId)
    } catch (error) {
      console.error('创建视频点位失败:', error)
      throw error
    }
  }

  static async findById(id) {
    try {
      const [rows] = await SQLiteAdapter.execute(
        `SELECT vp.*, f.name as folder_name 
         FROM video_points vp 
         LEFT JOIN folders f ON vp.folder_id = f.id 
         WHERE vp.id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      console.error('查找视频点位失败:', error)
      throw error
    }
  }

  static async findAll({
    page = 1,
    pageSize = 20,
    keyword = '',
    folderId = null,
    includeHidden = false,
    visibleFolderIds = null
  } = {}) {
    try {
      let whereConditions = []
      let params = []

      if (keyword && keyword.trim()) {
        whereConditions.push('(vp.title LIKE ? OR vp.description LIKE ?)')
        params.push(`%${keyword}%`, `%${keyword}%`)
      }

      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'vp')
      whereConditions = whereConditions.concat(folderCondition.conditions)
      params = params.concat(folderCondition.params)

      if (visibleFolderIds && Array.isArray(visibleFolderIds)) {
        if (visibleFolderIds.length === 0) {
          whereConditions.push('vp.folder_id IS NULL')
        } else {
          const placeholders = visibleFolderIds.map(() => '?').join(',')
          whereConditions.push(`(vp.folder_id IS NULL OR vp.folder_id IN (${placeholders}))`)
          params.push(...visibleFolderIds)
        }
      }

      if (!includeHidden) {
        whereConditions.push('vp.is_visible = 1')
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : ''

      const countSql = `SELECT COUNT(*) as total FROM video_points vp ${whereClause}`
      const [countResult] = await SQLiteAdapter.execute(countSql, params)
      const total = countResult[0].total

      const offset = (parseInt(page) - 1) * parseInt(pageSize)
      const dataSql = `SELECT vp.*, f.name as folder_name 
                       FROM video_points vp 
                       LEFT JOIN folders f ON vp.folder_id = f.id 
                       ${whereClause}
                       ORDER BY vp.sort_order ASC, vp.created_at DESC 
                       LIMIT ${parseInt(pageSize)} OFFSET ${offset}`
      const [rows] = await SQLiteAdapter.execute(dataSql, params)

      return {
        data: rows,
        total: parseInt(total),
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (error) {
      console.error('获取视频点位列表失败:', error)
      throw error
    }
  }

  static async findByFolder(folderId, { includeHidden = false } = {}) {
    try {
      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'vp')
      let whereClause = `WHERE ${folderCondition.conditions.join(' AND ')}`
      let params = folderCondition.params

      if (!includeHidden) {
        whereClause += ' AND vp.is_visible = TRUE'
      }

      const [rows] = await SQLiteAdapter.execute(
        `SELECT vp.*, f.name as folder_name 
         FROM video_points vp 
         LEFT JOIN folders f ON vp.folder_id = f.id 
         ${whereClause}
         ORDER BY vp.sort_order ASC, vp.created_at DESC`,
        params
      )
      return rows
    } catch (error) {
      console.error('根据文件夹查找视频点位失败:', error)
      throw error
    }
  }

  static async findByBounds({ north, south, east, west, includeHidden = false, visibleFolderIds = null } = {}) {
    try {
      let whereConditions = ['vp.gcj02_lat BETWEEN ? AND ?', 'vp.gcj02_lng BETWEEN ? AND ?']
      let params = [south, north, west, east]

      if (!includeHidden) {
        whereConditions.push('vp.is_visible = TRUE')
      }

      if (visibleFolderIds && Array.isArray(visibleFolderIds)) {
        if (visibleFolderIds.length === 0) {
          whereConditions.push('vp.folder_id IS NULL')
        } else {
          const placeholders = visibleFolderIds.map(() => '?').join(',')
          whereConditions.push(`(vp.folder_id IS NULL OR vp.folder_id IN (${placeholders}))`)
          params.push(...visibleFolderIds)
        }
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ')
      const [rows] = await SQLiteAdapter.execute(
        `SELECT vp.*, f.name as folder_name 
         FROM video_points vp 
         LEFT JOIN folders f ON vp.folder_id = f.id 
         ${whereClause}
         ORDER BY vp.sort_order ASC, vp.created_at DESC`,
        params
      )
      return rows
    } catch (error) {
      console.error('根据边界查找视频点位失败:', error)
      throw error
    }
  }

  static async update(id, updateData) {
    try {
      const allowedFields = [
        'title', 'description', 'latitude', 'longitude', 
        'folder_id', 'is_visible', 'sort_order'
      ]
      const updates = []
      const params = []
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`)
          params.push(value)
          if (key === 'latitude' || key === 'longitude') {
            const currentData = await this.findById(id)
            const lat = key === 'latitude' ? value : currentData.latitude
            const lng = key === 'longitude' ? value : currentData.longitude
            const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(lng, lat)
            if (!updates.includes('gcj02_lat = ?')) {
              updates.push('gcj02_lat = ?', 'gcj02_lng = ?')
              params.push(gcj02Lat, gcj02Lng)
            }
          }
        }
      }
      if (updates.length === 0) {
        throw new Error('没有有效的更新字段')
      }
      params.push(id)
      await SQLiteAdapter.execute(
        `UPDATE video_points SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      )
      return await this.findById(id)
    } catch (error) {
      console.error('更新视频点位失败:', error)
      throw error
    }
  }

  static async delete(id) {
    try {
      const [result] = await SQLiteAdapter.execute('DELETE FROM video_points WHERE id = ?', [id])
      return result.affectedRows > 0
    } catch (error) {
      console.error('删除视频点位失败:', error)
      throw error
    }
  }

  static async batchDelete(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表')
      }
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await SQLiteAdapter.execute(
        `DELETE FROM video_points WHERE id IN (${placeholders})`,
        ids
      )
      return result.affectedRows
    } catch (error) {
      console.error('批量删除视频点位失败:', error)
      throw error
    }
  }

  static async batchUpdateVisibility(ids, isVisible) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表')
      }
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await SQLiteAdapter.execute(
        `UPDATE video_points SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [isVisible, ...ids]
      )
      return result.affectedRows
    } catch (error) {
      console.error('批量更新视频点位可见性失败:', error)
      throw error
    }
  }

  static async batchMoveToFolder(ids, folderId) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表')
      }
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await SQLiteAdapter.execute(
        `UPDATE video_points SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [folderId, ...ids]
      )
      return result.affectedRows
    } catch (error) {
      console.error('批量移动视频点位到文件夹失败:', error)
      throw error
    }
  }

  static async getStats() {
    try {
      const [rows] = await SQLiteAdapter.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_visible = TRUE THEN 1 END) as visible,
          COUNT(CASE WHEN is_visible = FALSE THEN 1 END) as hidden
        FROM video_points
      `)
      return rows[0]
    } catch (error) {
      console.error('获取视频点位统计失败:', error)
      throw error
    }
  }
}

module.exports = VideoPointModel



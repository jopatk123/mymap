const SQLiteAdapter = require('../utils/sqlite-adapter')
const { wgs84ToGcj02 } = require('../utils/coordinate')
const QueryBuilder = require('../utils/QueryBuilder')

class KmlFileModel {
  // 创建KML文件记录
  static async create({
    title,
    description,
    fileUrl,
    fileSize,
    folderId = null,
    isVisible = true,
    sortOrder = 0
  }) {
    try {
      const [result] = await SQLiteAdapter.execute(
        `INSERT INTO kml_files (
          title, description, file_url, file_size, 
          folder_id, is_visible, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description,
          fileUrl,
          fileSize,
          folderId,
          isVisible,
          sortOrder
        ]
      )
      
      return await this.findById(result.insertId)
    } catch (error) {
      console.error('创建KML文件记录失败:', error)
      throw error
    }
  }

  // 根据ID查找KML文件
  static async findById(id) {
    try {
      const [rows] = await SQLiteAdapter.execute(
        `SELECT kf.*, f.name as folder_name 
         FROM kml_files kf 
         LEFT JOIN folders f ON kf.folder_id = f.id 
         WHERE kf.id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      console.error('查找KML文件失败:', error)
      throw error
    }
  }

  // 获取KML文件列表
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

      console.log('KML Debug - Input folderId:', folderId, 'type:', typeof folderId)

      if (keyword) {
        whereConditions.push('(kf.title LIKE ? OR kf.description LIKE ?)')
        params.push(`%${keyword}%`, `%${keyword}%`)
      }

      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'kf')
      console.log('KML Debug - Folder condition:', folderCondition)
      whereConditions = whereConditions.concat(folderCondition.conditions)
      params = params.concat(folderCondition.params)

      // 文件夹可见性筛选
      if (visibleFolderIds && Array.isArray(visibleFolderIds)) {
        if (visibleFolderIds.length === 0) {
          // 如果没有可见文件夹，只返回根目录下的项目
          whereConditions.push('kf.folder_id IS NULL')
        } else {
          // 包含可见文件夹和根目录
          const placeholders = visibleFolderIds.map(() => '?').join(',')
          whereConditions.push(`(kf.folder_id IS NULL OR kf.folder_id IN (${placeholders}))`)
          params.push(...visibleFolderIds)
        }
      }

      if (!includeHidden) {
        whereConditions.push('kf.is_visible = TRUE')
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : ''

      // 获取总数
      const [countResult] = await SQLiteAdapter.execute(
        `SELECT COUNT(*) as total 
         FROM kml_files kf 
         ${whereClause}`,
        params
      )
      const total = countResult[0].total

      // 获取数据
      const limit = Number.parseInt(pageSize, 10) || 20
      const offset = (Number.parseInt(page, 10) - 1) * limit
      const sql = `
        SELECT kf.*, f.name as folder_name,
        (SELECT COUNT(*) FROM kml_points kp WHERE kp.kml_file_id = kf.id) as point_count
        FROM kml_files kf 
        LEFT JOIN folders f ON kf.folder_id = f.id 
        ${whereClause}
        ORDER BY kf.sort_order ASC, kf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      const [rows] = await SQLiteAdapter.execute(sql, params)

      return {
        data: rows,
        total: parseInt(total),
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (error) {
      console.error('获取KML文件列表失败:', error)
      throw error
    }
  }

  // 根据文件夹查找KML文件
  static async findByFolder(folderId, { includeHidden = false } = {}) {
    try {
      const folderCondition = QueryBuilder.buildFolderCondition(folderId, 'kf')
      let whereClause = `WHERE ${folderCondition.conditions.join(' AND ')}`
      let params = folderCondition.params

      if (!includeHidden) {
        whereClause += ' AND kf.is_visible = TRUE'
      }

      const [rows] = await SQLiteAdapter.execute(
        `SELECT kf.*, f.name as folder_name,
         (SELECT COUNT(*) FROM kml_points kp WHERE kp.kml_file_id = kf.id) as point_count
         FROM kml_files kf 
         LEFT JOIN folders f ON kf.folder_id = f.id 
         ${whereClause}
         ORDER BY kf.sort_order ASC, kf.created_at DESC`,
        params
      )

      return rows
    } catch (error) {
      console.error('根据文件夹查找KML文件失败:', error)
      throw error
    }
  }

  // 更新KML文件
  static async update(id, updateData) {
    try {
      const allowedFields = [
        'title', 'description', 'folder_id', 'is_visible', 'sort_order'
      ]
      
      const updates = []
      const params = []
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`)
          params.push(value)
        }
      }
      
      if (updates.length === 0) {
        throw new Error('没有有效的更新字段')
      }
      
      params.push(id)
      
      await SQLiteAdapter.execute(
        `UPDATE kml_files SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      )
      
      return await this.findById(id)
    } catch (error) {
      console.error('更新KML文件失败:', error)
      throw error
    }
  }

  // 删除KML文件（会级联删除相关的点位数据）
  static async delete(id) {
    try {
      const [result] = await SQLiteAdapter.execute('DELETE FROM kml_files WHERE id = ?', [id])
      return result.affectedRows > 0
    } catch (error) {
      console.error('删除KML文件失败:', error)
      throw error
    }
  }

  // 批量删除
  static async batchDelete(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表')
      }
      
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await SQLiteAdapter.execute(
        `DELETE FROM kml_files WHERE id IN (${placeholders})`,
        ids
      )
      
      return result.affectedRows
    } catch (error) {
      console.error('批量删除KML文件失败:', error)
      throw error
    }
  }

  // 批量更新可见性
  static async batchUpdateVisibility(ids, isVisible) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表')
      }
      
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await SQLiteAdapter.execute(
        `UPDATE kml_files SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [isVisible, ...ids]
      )
      
      return result.affectedRows
    } catch (error) {
      console.error('批量更新KML文件可见性失败:', error)
      throw error
    }
  }

  // 批量移动到文件夹
  static async batchMoveToFolder(ids, folderId) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('无效的ID列表')
      }
      
      const placeholders = ids.map(() => '?').join(',')
      const [result] = await SQLiteAdapter.execute(
        `UPDATE kml_files SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [folderId, ...ids]
      )
      
      return result.affectedRows
    } catch (error) {
      console.error('批量移动KML文件到文件夹失败:', error)
      throw error
    }
  }

  // 获取统计信息
  static async getStats() {
    try {
      const [rows] = await SQLiteAdapter.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_visible = TRUE THEN 1 END) as visible,
          COUNT(CASE WHEN is_visible = FALSE THEN 1 END) as hidden,
          (SELECT COUNT(*) FROM kml_points) as total_points
        FROM kml_files
      `)
      
      return rows[0]
    } catch (error) {
      console.error('获取KML文件统计失败:', error)
      throw error
    }
  }
}

module.exports = KmlFileModel
const VideoPointModel = require('../models/video-point.model')
const path = require('path')
const fs = require('fs').promises
const Logger = require('../utils/logger')

class VideoPointService {
  static async getVideoPoints(options = {}) {
    const { page = 1, pageSize = 20, keyword = '', folderId = null, includeHidden = false } = options
    return await VideoPointModel.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      keyword,
      folderId: folderId ? parseInt(folderId) : null,
      includeHidden: includeHidden === true || includeHidden === 'true'
    })
  }

  static async getVideoPointById(id) {
    if (!id || isNaN(id)) throw new Error('无效的视频点位ID')
    const vp = await VideoPointModel.findById(parseInt(id))
    if (!vp) throw new Error('视频点位不存在')
    return vp
  }

  static async getVideoPointsByBounds(bounds) {
    const { north, south, east, west, includeHidden = false } = bounds
    if (!north || !south || !east || !west) throw new Error('缺少边界参数')
    const data = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west),
      includeHidden: includeHidden === true || includeHidden === 'true'
    }
    if (data.north <= data.south || data.east <= data.west) throw new Error('边界参数不合理')
    return await VideoPointModel.findByBounds(data)
  }

  static async getStats() {
    return await VideoPointModel.getStats()
  }

  static async createVideoPoint(data) {
    const { uploadedFile, title, description, lat, lng, folderId, duration } = data
    if (!uploadedFile) throw new Error('请上传视频文件')
    if (!title || !lat || !lng) throw new Error('标题、纬度和经度为必填项')
    // 使用事务：先在事务内插入记录，事务失败时回滚；若事务外部失败则尝试删除已上载的物理文件
    const { transaction } = require('../config/database')
    let insertedId = null
    try {
      await transaction(async (db) => {
        const sql = `INSERT INTO video_points (
          title, description, video_url, thumbnail_url,
          latitude, longitude, gcj02_lat, gcj02_lng,
          file_size, file_type, duration, folder_id, is_visible, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`

        // 计算 gcj02 坐标若需要可以在 model 层做，这里尽量保持行为一致但在事务内直接写入基本字段
        const params = [
          title,
          description || '',
          uploadedFile.url,
          null,
          parseFloat(lat),
          parseFloat(lng),
          null,
          null,
          uploadedFile.size || null,
          uploadedFile.mimetype || null,
          duration ? parseInt(duration) : null,
          folderId && parseInt(folderId) !== 0 ? parseInt(folderId) : null,
          1,
          0
        ]

        const res = await db.run(sql, params)
        insertedId = res.lastID
        if (!insertedId) throw new Error('创建视频点位记录失败')
      })

      return await VideoPointModel.findById(insertedId)
    } catch (txErr) {
      // 事务或插入后处理失败，尝试删除已上载的物理文件以避免孤儿文件
      try {
        const fs = require('fs').promises
        const path = require('path')
        if (uploadedFile && uploadedFile.url) {
          const filename = path.basename(uploadedFile.url)
          await fs.unlink(path.join(process.cwd(), 'uploads', 'videos', filename)).catch(() => {})
        }
      } catch (_) {}

      throw txErr
    }
  }

  static async updateVideoPoint(id, updateData) {
    if (!id || isNaN(id)) throw new Error('无效的视频点位ID')
    const vp = await VideoPointModel.update(parseInt(id), updateData)
    if (!vp) throw new Error('视频点位不存在')
    return vp
  }

  static async deleteVideoPoint(id) {
    if (!id || isNaN(id)) throw new Error('无效的视频点位ID')
    const vp = await VideoPointModel.findById(parseInt(id))
    if (!vp) throw new Error('视频点位不存在')
    // 使用事务：删除数据库记录并在事务体内删除物理文件，文件删除失败（非 ENOENT）将触发回滚
    const { transaction } = require('../config/database')
    try {
      await transaction(async (db) => {
        const delRes = await db.run('DELETE FROM video_points WHERE id = ?', [parseInt(id)])
        if (!delRes || delRes.changes === 0) {
          throw new Error('删除数据库记录失败')
        }

        // 在事务内删除物理文件
        const fs = require('fs').promises
        const path = require('path')
        if (vp.video_url) {
          const filename = path.basename(vp.video_url)
          const videoPath = path.join(process.cwd(), 'uploads', 'videos', filename)
          try {
            await fs.unlink(videoPath)
          } catch (err) {
            if (err && err.code === 'ENOENT') {
              // 文件已不存在，忽略
            } else {
              throw err
            }
          }
        }
      })

      return true
    } catch (txErr) {
      throw txErr
    }
  }

  static async batchDeleteVideoPoints(ids) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('请提供有效的ID列表')
    const toDelete = []
    for (const id of ids) {
      try {
        const vp = await VideoPointModel.findById(parseInt(id))
        if (vp) toDelete.push(vp)
      } catch (e) {
        Logger.warn(`获取视频点位信息失败 (ID: ${id})`, e)
      }
    }
    // 使用事务：在事务内删除数据库记录并删除对应物理文件，遇到非 ENOENT 的删除错误将触发回滚
    const { transaction } = require('../config/database')
    try {
      let affected = 0
      await transaction(async (db) => {
        const { clause, params } = require('../utils/QueryBuilder').buildInClause(ids)
        const delRes = await db.run(`DELETE FROM video_points WHERE id ${clause}`, params)
        affected = delRes.changes || 0

        const fs = require('fs').promises
        const path = require('path')
        for (const vp of toDelete) {
          if (vp.video_url) {
            const filename = path.basename(vp.video_url)
            const videoPath = path.join(process.cwd(), 'uploads', 'videos', filename)
            try { await fs.unlink(videoPath) } catch (err) { if (err.code !== 'ENOENT') throw err }
          }
        }
      })
      return affected
    } catch (txErr) {
      throw txErr
    }
  }

  static async batchUpdateVideoPointVisibility(ids, isVisible) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('请提供有效的ID列表')
    return await VideoPointModel.batchUpdateVisibility(ids, isVisible)
  }

  static async batchMoveVideoPointsToFolder(ids, folderId) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('请提供有效的ID列表')
    return await VideoPointModel.batchMoveToFolder(ids, folderId)
  }

  static async updateVideoPointVisibility(id, isVisible) {
    if (!id || isNaN(id)) throw new Error('无效的视频点位ID')
    const vp = await VideoPointModel.update(parseInt(id), { is_visible: isVisible })
    if (!vp) throw new Error('视频点位不存在')
    return vp
  }

  static async moveVideoPointToFolder(id, folderId) {
    if (!id || isNaN(id)) throw new Error('无效的视频点位ID')
    const vp = await VideoPointModel.update(parseInt(id), { folder_id: folderId })
    if (!vp) throw new Error('视频点位不存在')
    return vp
  }

  static async deleteVideoFiles(videoPoint) {
    try {
      if (videoPoint.video_url) {
        const filename = path.basename(videoPoint.video_url)
        const videoPath = path.join(process.cwd(), 'uploads', 'videos', filename)
        try {
          await fs.access(videoPath)
          await fs.unlink(videoPath)
          Logger.debug('删除视频文件成功', { videoPath })
        } catch (error) {
          Logger.warn('视频文件不存在或删除失败', { videoPath, error: error.message })
        }
      }
    } catch (error) {
      Logger.warn('删除视频文件失败:', error)
    }
    // 非事务调用时使用：当文件不存在时忽略，其他错误记录并抛出以便上层决定回滚/处理
    try {
      if (videoPoint.video_url) {
        const filename = path.basename(videoPoint.video_url)
        const videoPath = path.join(process.cwd(), 'uploads', 'videos', filename)
        try {
          await fs.unlink(videoPath)
          Logger.debug('删除视频文件成功', { videoPath })
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            Logger.warn('视频文件不存在，忽略', { videoPath })
          } else {
            Logger.warn('删除视频文件失败', { videoPath, error: error.message })
            throw error
          }
        }
      }
    } catch (error) {
      Logger.warn('删除视频文件失败:', error)
      throw error
    }
  }
}

module.exports = VideoPointService



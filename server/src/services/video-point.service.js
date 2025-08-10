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
    return await VideoPointModel.create({
      title,
      description: description || '',
      videoUrl: uploadedFile.url,
      thumbnailUrl: null,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      fileSize: uploadedFile.size,
      fileType: uploadedFile.mimetype,
      duration: duration ? parseInt(duration) : null,
      folderId: folderId && parseInt(folderId) !== 0 ? parseInt(folderId) : null
    })
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
    const success = await VideoPointModel.delete(parseInt(id))
    if (!success) throw new Error('删除视频点位失败')
    await this.deleteVideoFiles(vp)
    return true
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
    const affected = await VideoPointModel.batchDelete(ids)
    for (const vp of toDelete) await this.deleteVideoFiles(vp)
    return affected
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
  }
}

module.exports = VideoPointService



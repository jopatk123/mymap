const { VideoPointService } = require('../../services')
const { successResponse, errorResponse } = require('../../utils/response')
const Logger = require('../../utils/logger')

class VideoPointMutationController {
  static async createVideoPoint(req, res) {
    try {
      const { uploadedFile } = req
      const { title, description, lat, lng, folderId, duration } = req.body
      const videoPoint = await VideoPointService.createVideoPoint({
        uploadedFile,
        title,
        description,
        lat,
        lng,
        folderId,
        duration
      })
      res.status(201).json(successResponse(videoPoint, '视频点位创建成功'))
    } catch (error) {
      Logger.error('创建视频点位失败:', error)
      if (error.message.includes('请上传视频文件') || error.message.includes('为必填项')) {
        res.status(400).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async updateVideoPoint(req, res) {
    try {
      const { id } = req.params
      const updateData = req.body
      const videoPoint = await VideoPointService.updateVideoPoint(parseInt(id), updateData)
      res.json(successResponse(videoPoint, '视频点位更新成功'))
    } catch (error) {
      Logger.error('更新视频点位失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async deleteVideoPoint(req, res) {
    try {
      const { id } = req.params
      await VideoPointService.deleteVideoPoint(parseInt(id))
      res.json(successResponse(null, '视频点位删除成功'))
    } catch (error) {
      Logger.error('删除视频点位失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async batchDeleteVideoPoints(req, res) {
    try {
      const { ids } = req.body
      const affectedRows = await VideoPointService.batchDeleteVideoPoints(ids)
      res.json(successResponse(null, `成功删除 ${affectedRows} 个视频点位`))
    } catch (error) {
      Logger.error('批量删除视频点位失败:', error)
      if (error.message.includes('请提供有效的ID列表')) {
        res.status(400).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async batchUpdateVideoPointVisibility(req, res) {
    try {
      const { ids, isVisible } = req.body
      const affectedRows = await VideoPointService.batchUpdateVideoPointVisibility(ids, isVisible)
      res.json(successResponse(null, `成功更新 ${affectedRows} 个视频点位的可见性`))
    } catch (error) {
      Logger.error('批量更新视频点位可见性失败:', error)
      if (error.message.includes('请提供有效的ID列表')) {
        res.status(400).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async batchMoveVideoPointsToFolder(req, res) {
    try {
      const { ids, folderId } = req.body
      const affectedRows = await VideoPointService.batchMoveVideoPointsToFolder(ids, folderId)
      res.json(successResponse(null, `成功移动 ${affectedRows} 个视频点位到文件夹`))
    } catch (error) {
      Logger.error('批量移动视频点位到文件夹失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }

  static async updateVideoPointVisibility(req, res) {
    try {
      const { id } = req.params
      const { isVisible } = req.body
      const videoPoint = await VideoPointService.updateVideoPointVisibility(parseInt(id), isVisible)
      res.json(successResponse(videoPoint, '视频点位可见性更新成功'))
    } catch (error) {
      Logger.error('更新视频点位可见性失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async moveVideoPointToFolder(req, res) {
    try {
      const { id } = req.params
      const { folderId } = req.body
      const videoPoint = await VideoPointService.moveVideoPointToFolder(parseInt(id), folderId)
      res.json(successResponse(videoPoint, '视频点位移动成功'))
    } catch (error) {
      Logger.error('移动视频点位到文件夹失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }
}

module.exports = VideoPointMutationController



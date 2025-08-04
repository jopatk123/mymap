const VideoPointModel = require('../models/videoPoint.model')
const path = require('path')
const fs = require('fs').promises
const Logger = require('../utils/logger')

class VideoPointController {
  // 获取视频点位列表
  static async getVideoPoints(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false
      } = req.query

      const result = await VideoPointModel.findAll({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
        folderId: folderId ? parseInt(folderId) : null,
        includeHidden: includeHidden === 'true'
      })

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages
        }
      })
    } catch (error) {
      Logger.error('获取视频点位列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取视频点位列表失败',
        error: error.message
      })
    }
  }

  // 根据ID获取视频点位详情
  static async getVideoPointById(req, res) {
    try {
      const { id } = req.params
      const videoPoint = await VideoPointModel.findById(parseInt(id))

      if (!videoPoint) {
        return res.status(404).json({
          success: false,
          message: '视频点位不存在'
        })
      }

      res.json({
        success: true,
        data: videoPoint
      })
    } catch (error) {
      Logger.error('获取视频点位详情失败:', error)
      res.status(500).json({
        success: false,
        message: '获取视频点位详情失败',
        error: error.message
      })
    }
  }

  // 根据地图边界获取视频点位
  static async getVideoPointsByBounds(req, res) {
    try {
      const { north, south, east, west, includeHidden = false } = req.query

      const videoPoints = await VideoPointModel.findByBounds({
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
        includeHidden: includeHidden === 'true'
      })

      res.json({
        success: true,
        data: videoPoints
      })
    } catch (error) {
      Logger.error('根据边界获取视频点位失败:', error)
      res.status(500).json({
        success: false,
        message: '获取视频点位失败',
        error: error.message
      })
    }
  }

  // 创建视频点位
  static async createVideoPoint(req, res) {
    try {
      const { uploadedFile } = req
      const { title, description, lat, lng, folderId, duration } = req.body

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: '请上传视频文件'
        })
      }

      if (!title || !lat || !lng) {
        return res.status(400).json({
          success: false,
          message: '标题、纬度和经度为必填项'
        })
      }

      const videoPoint = await VideoPointModel.create({
        title,
        description: description || '',
        videoUrl: uploadedFile.url,
        thumbnailUrl: null, // 不生成缩略图
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        fileSize: uploadedFile.size,
        fileType: uploadedFile.mimetype,
        duration: duration ? parseInt(duration) : null,
        folderId: (folderId && parseInt(folderId) !== 0) ? parseInt(folderId) : null
      })

      res.status(201).json({
        success: true,
        message: '视频点位创建成功',
        data: videoPoint
      })
    } catch (error) {
      Logger.error('创建视频点位失败:', error)
      res.status(500).json({
        success: false,
        message: '创建视频点位失败',
        error: error.message
      })
    }
  }

  // 更新视频点位
  static async updateVideoPoint(req, res) {
    try {
      const { id } = req.params
      const updateData = req.body

      const videoPoint = await VideoPointModel.update(parseInt(id), updateData)

      if (!videoPoint) {
        return res.status(404).json({
          success: false,
          message: '视频点位不存在'
        })
      }

      res.json({
        success: true,
        message: '视频点位更新成功',
        data: videoPoint
      })
    } catch (error) {
      Logger.error('更新视频点位失败:', error)
      res.status(500).json({
        success: false,
        message: '更新视频点位失败',
        error: error.message
      })
    }
  }

  // 删除视频点位
  static async deleteVideoPoint(req, res) {
    try {
      const { id } = req.params
      
      // 获取视频点位信息以删除文件
      const videoPoint = await VideoPointModel.findById(parseInt(id))
      if (!videoPoint) {
        return res.status(404).json({
          success: false,
          message: '视频点位不存在'
        })
      }

      const success = await VideoPointModel.delete(parseInt(id))

      if (success) {
        // 删除视频文件
        try {
          if (videoPoint.video_url) {
            const filename = path.basename(videoPoint.video_url)
            const videoPath = path.join(process.cwd(), 'uploads', 'videos', filename)
            Logger.debug('准备删除视频文件', { filename, videoPath })
            
            // 检查文件是否存在
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

        res.json({
          success: true,
          message: '视频点位删除成功'
        })
      } else {
        res.status(404).json({
          success: false,
          message: '视频点位不存在'
        })
      }
    } catch (error) {
      Logger.error('删除视频点位失败:', error)
      res.status(500).json({
        success: false,
        message: '删除视频点位失败',
        error: error.message
      })
    }
  }

  // 批量删除视频点位
  static async batchDeleteVideoPoints(req, res) {
    try {
      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的ID列表'
        })
      }

      // 先获取所有要删除的视频点位信息，用于删除物理文件
      const videoPointsToDelete = []
      for (const id of ids) {
        try {
          const videoPoint = await VideoPointModel.findById(parseInt(id))
          if (videoPoint) {
            videoPointsToDelete.push(videoPoint)
          }
        } catch (error) {
          Logger.warn(`获取视频点位信息失败 (ID: ${id})`, error)
        }
      }

      const affectedRows = await VideoPointModel.batchDelete(ids)

      // 删除物理文件
      for (const videoPoint of videoPointsToDelete) {
        try {
          if (videoPoint.video_url) {
            const filename = path.basename(videoPoint.video_url)
            const videoPath = path.join(process.cwd(), 'uploads', 'videos', filename)
            Logger.debug('准备删除视频文件', { filename, videoPath })
            
            // 检查文件是否存在
            try {
              await fs.access(videoPath)
              await fs.unlink(videoPath)
              Logger.debug('删除视频文件成功', { videoPath })
            } catch (error) {
              Logger.warn('视频文件不存在或删除失败', { videoPath, error: error.message })
            }
          }
        } catch (error) {
          Logger.warn(`删除视频文件失败 (ID: ${videoPoint.id}):`, error)
        }
      }

      res.json({
        success: true,
        message: `成功删除 ${affectedRows} 个视频点位`
      })
    } catch (error) {
      Logger.error('批量删除视频点位失败:', error)
      res.status(500).json({
        success: false,
        message: '批量删除视频点位失败',
        error: error.message
      })
    }
  }

  // 批量更新视频点位可见性
  static async batchUpdateVideoPointVisibility(req, res) {
    try {
      const { ids, isVisible } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的ID列表'
        })
      }

      const affectedRows = await VideoPointModel.batchUpdateVisibility(ids, isVisible)

      res.json({
        success: true,
        message: `成功更新 ${affectedRows} 个视频点位的可见性`
      })
    } catch (error) {
      Logger.error('批量更新视频点位可见性失败:', error)
      res.status(500).json({
        success: false,
        message: '批量更新视频点位可见性失败',
        error: error.message
      })
    }
  }

  // 批量移动视频点位到文件夹
  static async batchMoveVideoPointsToFolder(req, res) {
    try {
      const { ids, folderId } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的ID列表'
        })
      }

      const affectedRows = await VideoPointModel.batchMoveToFolder(ids, folderId)

      res.json({
        success: true,
        message: `成功移动 ${affectedRows} 个视频点位到文件夹`
      })
    } catch (error) {
      Logger.error('批量移动视频点位到文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '批量移动视频点位到文件夹失败',
        error: error.message
      })
    }
  }

  // 更新视频点位可见性
  static async updateVideoPointVisibility(req, res) {
    try {
      const { id } = req.params
      const { isVisible } = req.body

      const videoPoint = await VideoPointModel.update(parseInt(id), { is_visible: isVisible })

      if (!videoPoint) {
        return res.status(404).json({
          success: false,
          message: '视频点位不存在'
        })
      }

      res.json({
        success: true,
        message: '视频点位可见性更新成功',
        data: videoPoint
      })
    } catch (error) {
      Logger.error('更新视频点位可见性失败:', error)
      res.status(500).json({
        success: false,
        message: '更新视频点位可见性失败',
        error: error.message
      })
    }
  }

  // 移动视频点位到文件夹
  static async moveVideoPointToFolder(req, res) {
    try {
      const { id } = req.params
      const { folderId } = req.body

      const videoPoint = await VideoPointModel.update(parseInt(id), { folder_id: folderId })

      if (!videoPoint) {
        return res.status(404).json({
          success: false,
          message: '视频点位不存在'
        })
      }

      res.json({
        success: true,
        message: '视频点位移动成功',
        data: videoPoint
      })
    } catch (error) {
      Logger.error('移动视频点位到文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '移动视频点位到文件夹失败',
        error: error.message
      })
    }
  }

  // 获取视频点位统计信息
  static async getVideoPointStats(req, res) {
    try {
      const stats = await VideoPointModel.getStats()

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      Logger.error('获取视频点位统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取视频点位统计失败',
        error: error.message
      })
    }
  }
}

module.exports = VideoPointController
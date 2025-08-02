const VideoPointModel = require('../models/videoPoint.model')
const path = require('path')
const fs = require('fs').promises

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
      console.error('获取视频点位列表失败:', error)
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
      console.error('获取视频点位详情失败:', error)
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
      console.error('根据边界获取视频点位失败:', error)
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

      // 生成缩略图（这里简化处理，实际项目中可能需要使用ffmpeg等工具）
      const thumbnailUrl = uploadedFile.url.replace(/\.[^.]+$/, '_thumb.jpg')

      const videoPoint = await VideoPointModel.create({
        title,
        description: description || '',
        videoUrl: uploadedFile.url,
        thumbnailUrl,
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
      console.error('创建视频点位失败:', error)
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
      console.error('更新视频点位失败:', error)
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
        // 删除相关文件
        try {
          if (videoPoint.video_url) {
            const videoPath = path.join(process.cwd(), 'uploads', path.basename(videoPoint.video_url))
            await fs.unlink(videoPath).catch(() => {}) // 忽略文件不存在的错误
          }
          if (videoPoint.thumbnail_url) {
            const thumbPath = path.join(process.cwd(), 'uploads', path.basename(videoPoint.thumbnail_url))
            await fs.unlink(thumbPath).catch(() => {}) // 忽略文件不存在的错误
          }
        } catch (error) {
          console.warn('删除视频文件失败:', error)
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
      console.error('删除视频点位失败:', error)
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

      const affectedRows = await VideoPointModel.batchDelete(ids)

      res.json({
        success: true,
        message: `成功删除 ${affectedRows} 个视频点位`
      })
    } catch (error) {
      console.error('批量删除视频点位失败:', error)
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
      console.error('批量更新视频点位可见性失败:', error)
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
      console.error('批量移动视频点位到文件夹失败:', error)
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
      console.error('更新视频点位可见性失败:', error)
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
      console.error('移动视频点位到文件夹失败:', error)
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
      console.error('获取视频点位统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取视频点位统计失败',
        error: error.message
      })
    }
  }
}

module.exports = VideoPointController
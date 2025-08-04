const KmlFileModel = require('../models/kmlFile.model')
const KmlPointModel = require('../models/kmlPoint.model')
const kmlParserService = require('../services/kmlParser.service')
const path = require('path')
const fs = require('fs')
const Logger = require('../utils/logger')

class KmlFileController {
  // 获取KML文件列表
  static async getKmlFiles(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false
      } = req.query

      const result = await KmlFileModel.findAll({
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
      Logger.error('获取KML文件列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取KML文件列表失败',
        error: error.message
      })
    }
  }

  // 根据ID获取KML文件详情
  static async getKmlFileById(req, res) {
    try {
      const { id } = req.params
      const kmlFile = await KmlFileModel.findById(parseInt(id))

      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }

      // 获取KML文件的点位数据
      const points = await KmlPointModel.findByKmlFileId(parseInt(id))

      res.json({
        success: true,
        data: {
          ...kmlFile,
          points
        }
      })
    } catch (error) {
      Logger.error('获取KML文件详情失败:', error)
      res.status(500).json({
        success: false,
        message: '获取KML文件详情失败',
        error: error.message
      })
    }
  }

  // 获取KML文件的点位数据
  static async getKmlFilePoints(req, res) {
    try {
      const { id } = req.params
      const points = await KmlPointModel.findByKmlFileId(parseInt(id))

      res.json({
        success: true,
        data: points
      })
    } catch (error) {
      Logger.error('获取KML文件点位失败:', error)
      res.status(500).json({
        success: false,
        message: '获取KML文件点位失败',
        error: error.message
      })
    }
  }

  // 根据地图边界获取KML点位
  static async getKmlPointsByBounds(req, res) {
    try {
      const { north, south, east, west } = req.query

      const points = await KmlPointModel.findByBounds({
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      })

      res.json({
        success: true,
        data: points
      })
    } catch (error) {
      Logger.error('根据边界获取KML点位失败:', error)
      res.status(500).json({
        success: false,
        message: '获取KML点位失败',
        error: error.message
      })
    }
  }

  // 上传并解析KML文件
  static async uploadKmlFile(req, res) {
    try {
      const { uploadedFile } = req
      const { title, description, folderId } = req.body

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: '请上传KML文件'
        })
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          message: '标题为必填项'
        })
      }

      // 验证文件类型
      if (!uploadedFile.originalname.toLowerCase().endsWith('.kml')) {
        return res.status(400).json({
          success: false,
          message: '只支持KML格式文件'
        })
      }

      // 解析KML文件
      const filePath = uploadedFile.path
      const placemarks = await kmlParserService.parseKmlFile(filePath)

      if (placemarks.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'KML文件中没有找到有效的地标数据'
        })
      }

      // 创建KML文件记录
      const kmlFile = await KmlFileModel.create({
        title,
        description: description || '',
        fileUrl: uploadedFile.url,
        fileSize: uploadedFile.size,
        folderId: folderId ? parseInt(folderId) : null
      })

      // 批量创建点位数据
      const pointsData = placemarks.map(placemark => ({
        kmlFileId: kmlFile.id,
        name: placemark.name,
        description: placemark.description,
        latitude: placemark.latitude,
        longitude: placemark.longitude,
        altitude: placemark.altitude,
        pointType: placemark.pointType,
        coordinates: placemark.coordinates,
        styleData: placemark.styleData
      }))

      await KmlPointModel.batchCreate(pointsData)

      // 获取完整的KML文件信息（包含点位统计）
      const completeKmlFile = await KmlFileModel.findById(kmlFile.id)

      res.status(201).json({
        success: true,
        message: `KML文件上传成功，解析出 ${placemarks.length} 个地标`,
        data: completeKmlFile
      })
    } catch (error) {
      Logger.error('上传KML文件失败:', error)
      res.status(500).json({
        success: false,
        message: '上传KML文件失败',
        error: error.message
      })
    }
  }

  // 验证KML文件
  static async validateKmlFile(req, res) {
    try {
      const { uploadedFile } = req

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: '请上传KML文件'
        })
      }

      const validation = await kmlParserService.validateKmlFile(uploadedFile.path)

      res.json({
        success: true,
        data: validation
      })
    } catch (error) {
      Logger.error('验证KML文件失败:', error)
      res.status(500).json({
        success: false,
        message: '验证KML文件失败',
        error: error.message
      })
    }
  }

  // 更新KML文件
  static async updateKmlFile(req, res) {
    try {
      const { id } = req.params
      const updateData = req.body

      const kmlFile = await KmlFileModel.update(parseInt(id), updateData)

      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }

      res.json({
        success: true,
        message: 'KML文件更新成功',
        data: kmlFile
      })
    } catch (error) {
      Logger.error('更新KML文件失败:', error)
      res.status(500).json({
        success: false,
        message: '更新KML文件失败',
        error: error.message
      })
    }
  }

  // 删除KML文件
  static async deleteKmlFile(req, res) {
    try {
      const { id } = req.params
      
      // 获取KML文件信息以删除文件
      const kmlFile = await KmlFileModel.findById(parseInt(id))
      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }

      const success = await KmlFileModel.delete(parseInt(id))

      if (success) {
        // 删除相关文件
        try {
          if (kmlFile.file_url) {
            const filename = path.basename(kmlFile.file_url)
            const filePath = path.join(process.cwd(), 'uploads', 'kml', filename)
            Logger.debug('准备删除KML文件', { filename, filePath })
            
            // 检查文件是否存在
            try {
              await fs.access(filePath)
              Logger.debug('KML文件存在，开始删除')
            } catch (accessError) {
              Logger.warn('KML文件不存在', { filePath })
              return
            }
            
            await fs.unlink(filePath)
            Logger.debug('删除KML文件成功', { filePath })
          }
        } catch (error) {
          Logger.warn('删除KML文件失败:', error)
        }

        res.json({
          success: true,
          message: 'KML文件删除成功'
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }
    } catch (error) {
      Logger.error('删除KML文件失败:', error)
      res.status(500).json({
        success: false,
        message: '删除KML文件失败',
        error: error.message
      })
    }
  }

  // 批量删除KML文件
  static async batchDeleteKmlFiles(req, res) {
    try {
      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的ID列表'
        })
      }

      // 先获取所有要删除的KML文件信息，用于删除物理文件
      const kmlFilesToDelete = []
      for (const id of ids) {
        try {
          const kmlFile = await KmlFileModel.findById(parseInt(id))
          if (kmlFile) {
            kmlFilesToDelete.push(kmlFile)
          }
        } catch (error) {
          Logger.warn(`获取KML文件信息失败 (ID: ${id})`, error)
        }
      }

      const affectedRows = await KmlFileModel.batchDelete(ids)

      // 删除物理文件
      for (const kmlFile of kmlFilesToDelete) {
        try {
          if (kmlFile.file_url) {
            const filename = path.basename(kmlFile.file_url)
            const filePath = path.join(process.cwd(), 'uploads', 'kml', filename)
            await fs.unlink(filePath).catch(() => {}) // 忽略文件不存在的错误
          }
        } catch (error) {
          Logger.warn(`删除KML文件失败 (ID: ${kmlFile.id}):`, error)
        }
      }

      res.json({
        success: true,
        message: `成功删除 ${affectedRows} 个KML文件`
      })
    } catch (error) {
      Logger.error('批量删除KML文件失败:', error)
      res.status(500).json({
        success: false,
        message: '批量删除KML文件失败',
        error: error.message
      })
    }
  }

  // 批量更新KML文件可见性
  static async batchUpdateKmlFileVisibility(req, res) {
    try {
      const { ids, isVisible } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的ID列表'
        })
      }

      const affectedRows = await KmlFileModel.batchUpdateVisibility(ids, isVisible)

      res.json({
        success: true,
        message: `成功更新 ${affectedRows} 个KML文件的可见性`
      })
    } catch (error) {
      Logger.error('批量更新KML文件可见性失败:', error)
      res.status(500).json({
        success: false,
        message: '批量更新KML文件可见性失败',
        error: error.message
      })
    }
  }

  // 批量移动KML文件到文件夹
  static async batchMoveKmlFilesToFolder(req, res) {
    try {
      const { ids, folderId } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的ID列表'
        })
      }

      const affectedRows = await KmlFileModel.batchMoveToFolder(ids, folderId)

      res.json({
        success: true,
        message: `成功移动 ${affectedRows} 个KML文件到文件夹`
      })
    } catch (error) {
      Logger.error('批量移动KML文件到文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '批量移动KML文件到文件夹失败',
        error: error.message
      })
    }
  }

  // 更新KML文件可见性
  static async updateKmlFileVisibility(req, res) {
    try {
      const { id } = req.params
      const { isVisible } = req.body

      const kmlFile = await KmlFileModel.update(parseInt(id), { is_visible: isVisible })

      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }

      res.json({
        success: true,
        message: 'KML文件可见性更新成功',
        data: kmlFile
      })
    } catch (error) {
      Logger.error('更新KML文件可见性失败:', error)
      res.status(500).json({
        success: false,
        message: '更新KML文件可见性失败',
        error: error.message
      })
    }
  }

  // 移动KML文件到文件夹
  static async moveKmlFileToFolder(req, res) {
    try {
      const { id } = req.params
      const { folderId } = req.body

      const kmlFile = await KmlFileModel.update(parseInt(id), { folder_id: folderId })

      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }

      res.json({
        success: true,
        message: 'KML文件移动成功',
        data: kmlFile
      })
    } catch (error) {
      Logger.error('移动KML文件到文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '移动KML文件到文件夹失败',
        error: error.message
      })
    }
  }

  // 获取KML文件统计信息
  static async getKmlFileStats(req, res) {
    try {
      const stats = await KmlFileModel.getStats()

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      Logger.error('获取KML文件统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取KML文件统计失败',
        error: error.message
      })
    }
  }
}

module.exports = KmlFileController
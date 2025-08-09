const KmlFileModel = require('../models/kmlFile.model')
const KmlPointModel = require('../models/kmlPoint.model')
const kmlParserService = require('../services/kmlParser.service')
const KmlFileUtils = require('../utils/kmlFileUtils')
const Logger = require('../utils/logger')

class KmlFileBaseController {
  // 获取KML文件列表
  static async getKmlFiles(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false,
        respectFolderVisibility = false
      } = req.query

      let searchParams = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
        folderId: folderId ? parseInt(folderId) : null,
        includeHidden: includeHidden === 'true'
      }

      // 如果需要考虑文件夹可见性，获取可见文件夹列表
      if (respectFolderVisibility === 'true' || respectFolderVisibility === true) {
        const FolderModel = require('../models/folder.model')
        const visibleFolderIds = await FolderModel.getVisibleFolderIds()
        searchParams.visibleFolderIds = visibleFolderIds
      }

      const result = await KmlFileModel.findAll(searchParams)

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

  // 上传并解析KML文件
  static async uploadKmlFile(req, res) {
    try {
      const { uploadedFile } = req
      const { title, description, folderId } = req.body

      // 验证文件类型
      const typeValidation = KmlFileUtils.validateKmlFileType(uploadedFile)
      if (!typeValidation.valid) {
        return res.status(400).json({
          success: false,
          message: typeValidation.message
        })
      }

      // 验证参数
      const paramValidation = KmlFileUtils.validateUploadParams({ title })
      if (!paramValidation.valid) {
        return res.status(400).json({
          success: false,
          message: paramValidation.message
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
        await KmlFileUtils.deletePhysicalFile(kmlFile.file_url)
        
        // 清理配置信息
        const ConfigService = require('../services/ConfigService')
        await ConfigService.deleteKmlStyles(id)

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

module.exports = KmlFileBaseController
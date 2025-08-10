const KmlFileModel = require('../../models/kml-file.model')
const KmlPointModel = require('../../models/kml-point.model')
const kmlParserService = require('../../services/kml-parser.service')
const KmlFileUtils = require('../../utils/kml-file-utils')
const Logger = require('../../utils/logger')

class KmlFileBaseController {
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

      if (respectFolderVisibility === 'true' || respectFolderVisibility === true) {
        const FolderModel = require('../../models/folder.model')
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

  static async uploadKmlFile(req, res) {
    try {
      const { uploadedFile } = req
      const { title, description, folderId } = req.body

      const typeValidation = KmlFileUtils.validateKmlFileType(uploadedFile)
      if (!typeValidation.valid) {
        return res.status(400).json({
          success: false,
          message: typeValidation.message
        })
      }

      const paramValidation = KmlFileUtils.validateUploadParams({ title })
      if (!paramValidation.valid) {
        return res.status(400).json({
          success: false,
          message: paramValidation.message
        })
      }

      const filePath = uploadedFile.path
      const placemarks = await kmlParserService.parseKmlFile(filePath)

      if (placemarks.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'KML文件中没有找到有效的地标数据'
        })
      }

      const kmlFile = await KmlFileModel.create({
        title,
        description: description || '',
        fileUrl: uploadedFile.url,
        fileSize: uploadedFile.size,
        folderId: folderId ? parseInt(folderId) : null
      })

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

  static async deleteKmlFile(req, res) {
    try {
      const { id } = req.params
      const kmlFile = await KmlFileModel.findById(parseInt(id))
      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }

      const success = await KmlFileModel.delete(parseInt(id))
      if (success) {
        await KmlFileUtils.deletePhysicalFile(kmlFile.file_url)
        const ConfigService = require('../../services/config.service')
        await ConfigService.deleteKmlStyles(id)
        res.json({ success: true, message: 'KML文件删除成功' })
      } else {
        res.status(404).json({ success: false, message: 'KML文件不存在' })
      }
    } catch (error) {
      Logger.error('删除KML文件失败:', error)
      res.status(500).json({ success: false, message: '删除KML文件失败', error: error.message })
    }
  }

  static async getKmlFileStats(req, res) {
    try {
      const stats = await KmlFileModel.getStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      Logger.error('获取KML文件统计失败:', error)
      res.status(500).json({ success: false, message: '获取KML文件统计失败', error: error.message })
    }
  }
}

module.exports = KmlFileBaseController



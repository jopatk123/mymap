const KmlFileModel = require('../models/kml-file.model')
const KmlFileUtils = require('../utils/kmlFileUtils')
const Logger = require('../utils/logger')

class KmlFileBatchController {
  static async batchDeleteKmlFiles(req, res) {
    try {
      const { ids } = req.body

      const validation = KmlFileUtils.validateIdList(ids)
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        })
      }

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

      await KmlFileUtils.batchDeletePhysicalFiles(kmlFilesToDelete)

      const ConfigService = require('../services/ConfigService')
      await ConfigService.batchDeleteKmlStyles(ids.map(id => id.toString()))

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

  static async batchUpdateKmlFileVisibility(req, res) {
    try {
      const { ids, isVisible } = req.body

      const validation = KmlFileUtils.validateIdList(ids)
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
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

  static async batchMoveKmlFilesToFolder(req, res) {
    try {
      const { ids, folderId } = req.body

      const validation = KmlFileUtils.validateIdList(ids)
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
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
}

module.exports = KmlFileBatchController



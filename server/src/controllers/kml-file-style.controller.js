const KmlFileModel = require('../models/kml-file.model')
const ConfigService = require('../services/config.service')
const Logger = require('../utils/logger')

class KmlFileStyleController {
  static async getKmlFileStyles(req, res) {
    try {
      const { id } = req.params
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, message: '无效的KML文件ID' })
      }
      const styles = await ConfigService.getKmlStyles(id)
      res.json({ success: true, data: styles, message: '获取KML文件样式配置成功' })
    } catch (error) {
      Logger.error('获取KML文件样式配置失败:', error)
      res.status(500).json({ success: false, message: '获取样式配置失败', error: process.env.NODE_ENV === 'development' ? error.message : '内部服务器错误' })
    }
  }

  static async updateKmlFileStyles(req, res) {
    try {
      const { id } = req.params
      const styleConfig = req.body
      const kmlFile = await KmlFileModel.findById(parseInt(id))
      if (!kmlFile) {
        return res.status(404).json({ success: false, message: 'KML文件不存在' })
      }
      const success = await ConfigService.updateKmlStyles(id, styleConfig)
      if (success) {
        const styles = await ConfigService.getKmlStyles(id)
        res.json({ success: true, message: '样式配置更新成功', data: styles })
      } else {
        throw new Error('保存配置失败')
      }
    } catch (error) {
      Logger.error('更新KML文件样式配置失败:', error)
      res.status(500).json({ success: false, message: '更新样式配置失败', error: error.message })
    }
  }

  static async resetKmlFileStyles(req, res) {
    try {
      const { id } = req.params
      const kmlFile = await KmlFileModel.findById(parseInt(id))
      if (!kmlFile) {
        return res.status(404).json({ success: false, message: 'KML文件不存在' })
      }
      const defaultConfig = ConfigService.getDefaultConfig()
      const success = await ConfigService.updateKmlStyles(id, defaultConfig.kmlStyles.default)
      if (success) {
        const styles = await ConfigService.getKmlStyles('default')
        res.json({ success: true, message: '样式配置已重置为默认', data: styles })
      } else {
        throw new Error('重置配置失败')
      }
    } catch (error) {
      Logger.error('重置KML文件样式失败:', error)
      res.status(500).json({ success: false, message: '重置样式配置失败', error: error.message })
    }
  }

  static async batchUpdateKmlFileStyles(req, res) {
    try {
      const { styleConfigs } = req.body
      if (!Array.isArray(styleConfigs) || styleConfigs.length === 0) {
        return res.status(400).json({ success: false, message: '请提供有效的样式配置列表' })
      }
      const results = []
      for (const config of styleConfigs) {
        if (config.kmlFileId) {
          try {
            const success = await ConfigService.updateKmlStyles(config.kmlFileId, config.styles)
            if (success) {
              const styles = await ConfigService.getKmlStyles(config.kmlFileId)
              results.push({ kmlFileId: config.kmlFileId, styles })
            }
          } catch (error) {
            Logger.warn(`更新KML文件样式失败 (ID: ${config.kmlFileId}):`, error)
          }
        }
      }
      res.json({ success: true, message: `成功更新 ${results.length} 个KML文件的样式配置`, data: results })
    } catch (error) {
      Logger.error('批量更新KML文件样式配置失败:', error)
      res.status(500).json({ success: false, message: '批量更新样式配置失败', error: error.message })
    }
  }
}

module.exports = KmlFileStyleController



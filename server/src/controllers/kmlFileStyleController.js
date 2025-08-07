const KmlFileModel = require('../models/kmlFile.model')
const ConfigService = require('../services/ConfigService')
const Logger = require('../utils/logger')

class KmlFileStyleController {
  // 获取KML文件样式配置
  static async getKmlFileStyles(req, res) {
    try {
      const { id } = req.params
      const styles = await ConfigService.getKmlStyles(id)
      
      res.json({
        success: true,
        data: styles,
        message: '获取KML文件样式配置成功'
      })
    } catch (error) {
      Logger.error('获取KML文件样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '获取样式配置失败',
        error: error.message
      })
    }
  }

  // 更新KML文件样式配置
  static async updateKmlFileStyles(req, res) {
    try {
      const { id } = req.params
      const styleConfig = req.body
      
      // 验证KML文件是否存在
      const kmlFile = await KmlFileModel.findById(parseInt(id))
      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }
      
      // 更新样式配置
      const success = await ConfigService.updateKmlStyles(id, styleConfig)
      if (success) {
        const styles = await ConfigService.getKmlStyles(id)
        res.json({
          success: true,
          message: '样式配置更新成功',
          data: styles
        })
      } else {
        throw new Error('保存配置失败')
      }
    } catch (error) {
      Logger.error('更新KML文件样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新样式配置失败',
        error: error.message
      })
    }
  }

  // 重置KML文件样式为默认
  static async resetKmlFileStyles(req, res) {
    try {
      const { id } = req.params
      
      // 验证KML文件是否存在
      const kmlFile = await KmlFileModel.findById(parseInt(id))
      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在'
        })
      }
      
      // 重置为默认样式（删除自定义配置）
      const defaultConfig = ConfigService.getDefaultConfig()
      const success = await ConfigService.updateKmlStyles(id, defaultConfig.kmlStyles.default)
      
      if (success) {
        const styles = await ConfigService.getKmlStyles('default')
        res.json({
          success: true,
          message: '样式配置已重置为默认',
          data: styles
        })
      } else {
        throw new Error('重置配置失败')
      }
    } catch (error) {
      Logger.error('重置KML文件样式失败:', error)
      res.status(500).json({
        success: false,
        message: '重置样式配置失败',
        error: error.message
      })
    }
  }

  // 批量更新KML文件样式配置
  static async batchUpdateKmlFileStyles(req, res) {
    try {
      const { styleConfigs } = req.body
      
      if (!Array.isArray(styleConfigs) || styleConfigs.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的样式配置列表'
        })
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
      
      res.json({
        success: true,
        message: `成功更新 ${results.length} 个KML文件的样式配置`,
        data: results
      })
    } catch (error) {
      Logger.error('批量更新KML文件样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '批量更新样式配置失败',
        error: error.message
      })
    }
  }
}

module.exports = KmlFileStyleController
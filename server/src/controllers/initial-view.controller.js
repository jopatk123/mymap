const ConfigService = require('../services/config.service')
const { successResponse, errorResponse } = require('../utils/response')
const Logger = require('../utils/logger')

class InitialViewController {
  // 获取初始显示设置
  static async getInitialViewSettings(req, res) {
    try {
      const settings = await ConfigService.getInitialViewSettings()
      res.json(successResponse(settings, '获取初始显示设置成功'))
    } catch (error) {
      Logger.error('获取初始显示设置失败:', error)
      res.status(500).json(errorResponse('获取初始显示设置失败'))
    }
  }

  // 更新初始显示设置
  static async updateInitialViewSettings(req, res) {
    try {
      const { enabled, center, zoom } = req.body
      
      if (enabled === undefined || center === undefined || zoom === undefined) {
        return res.status(400).json(errorResponse('缺少必要的设置参数'))
      }
      
      const settings = { enabled, center, zoom }
      const success = await ConfigService.updateInitialViewSettings(settings)
      
      if (success) {
        const updatedSettings = await ConfigService.getInitialViewSettings()
        res.json(successResponse(updatedSettings, '更新初始显示设置成功'))
      } else {
        res.status(500).json(errorResponse('更新初始显示设置失败'))
      }
    } catch (error) {
      Logger.error('更新初始显示设置失败:', error)
      
      if (error.message.includes('无效') || error.message.includes('必须') || error.message.includes('超出')) {
        res.status(400).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse('更新初始显示设置失败'))
      }
    }
  }
  
  // 重置初始显示设置为默认值
  static async resetInitialViewSettings(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig()
      const defaultSettings = defaultConfig.mapSettings.initialView
      
      const success = await ConfigService.updateInitialViewSettings(defaultSettings)
      
      if (success) {
        res.json(successResponse(defaultSettings, '重置初始显示设置成功'))
      } else {
        res.status(500).json(errorResponse('重置初始显示设置失败'))
      }
    } catch (error) {
      Logger.error('重置初始显示设置失败:', error)
      res.status(500).json(errorResponse('重置初始显示设置失败'))
    }
  }
}

module.exports = InitialViewController
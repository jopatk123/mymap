const ConfigService = require('../services/ConfigService')

class PointStyleController {
  // 获取视频点位样式配置
  static async getVideoPointStyles(req, res) {
    try {
      const styles = await ConfigService.getPointStyles('video')
      res.json({
        success: true,
        data: styles,
        message: '获取视频点位样式配置成功'
      })
    } catch (error) {
      console.error('获取视频点位样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '获取视频点位样式配置失败',
        error: error.message
      })
    }
  }

  // 更新视频点位样式配置
  static async updateVideoPointStyles(req, res) {
    try {
      const success = await ConfigService.updatePointStyles('video', req.body)
      if (success) {
        const updatedStyles = await ConfigService.getPointStyles('video')
        res.json({
          success: true,
          data: updatedStyles,
          message: '更新视频点位样式配置成功'
        })
      } else {
        throw new Error('保存配置失败')
      }
    } catch (error) {
      console.error('更新视频点位样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新视频点位样式配置失败',
        error: error.message
      })
    }
  }

  // 重置视频点位样式为默认
  static async resetVideoPointStyles(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig()
      const success = await ConfigService.updatePointStyles('video', defaultConfig.pointStyles.video)
      if (success) {
        const styles = await ConfigService.getPointStyles('video')
        res.json({
          success: true,
          data: styles,
          message: '重置视频点位样式配置成功'
        })
      } else {
        throw new Error('重置配置失败')
      }
    } catch (error) {
      console.error('重置视频点位样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '重置视频点位样式配置失败',
        error: error.message
      })
    }
  }

  // 获取全景图点位样式配置
  static async getPanoramaPointStyles(req, res) {
    try {
      const styles = await ConfigService.getPointStyles('panorama')
      
      res.json({
        success: true,
        data: styles,
        message: '获取全景图点位样式配置成功'
      })
    } catch (error) {
      console.error('获取全景图点位样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '获取全景图点位样式配置失败',
        error: error.message
      })
    }
  }

  // 更新全景图点位样式配置
  static async updatePanoramaPointStyles(req, res) {
    try {
      const success = await ConfigService.updatePointStyles('panorama', req.body)
      if (success) {
        const updatedStyles = await ConfigService.getPointStyles('panorama')
        res.json({
          success: true,
          data: updatedStyles,
          message: '更新全景图点位样式配置成功'
        })
      } else {
        throw new Error('保存配置失败')
      }
    } catch (error) {
      console.error('更新全景图点位样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新全景图点位样式配置失败',
        error: error.message
      })
    }
  }

  // 重置全景图点位样式为默认
  static async resetPanoramaPointStyles(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig()
      const success = await ConfigService.updatePointStyles('panorama', defaultConfig.pointStyles.panorama)
      if (success) {
        const styles = await ConfigService.getPointStyles('panorama')
        res.json({
          success: true,
          data: styles,
          message: '重置全景图点位样式配置成功'
        })
      } else {
        throw new Error('重置配置失败')
      }
    } catch (error) {
      console.error('重置全景图点位样式配置失败:', error)
      res.status(500).json({
        success: false,
        message: '重置全景图点位样式配置失败',
        error: error.message
      })
    }
  }
}

module.exports = PointStyleController
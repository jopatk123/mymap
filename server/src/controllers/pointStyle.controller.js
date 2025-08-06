const VideoPointStyleModel = require('../models/videoPointStyle.model')
const PanoramaPointStyleModel = require('../models/panoramaPointStyle.model')

class PointStyleController {
  // 获取视频点位样式配置
  static async getVideoPointStyles(req, res) {
    try {
      const styles = await VideoPointStyleModel.getStyles()
      
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
      const styleConfig = req.body
      const updatedStyles = await VideoPointStyleModel.updateStyles(styleConfig)
      
      res.json({
        success: true,
        data: updatedStyles,
        message: '更新视频点位样式配置成功'
      })
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
      const defaultStyles = await VideoPointStyleModel.resetStyles()
      
      res.json({
        success: true,
        data: defaultStyles,
        message: '重置视频点位样式配置成功'
      })
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
      const styles = await PanoramaPointStyleModel.getStyles()
      
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
      const styleConfig = req.body
      const updatedStyles = await PanoramaPointStyleModel.updateStyles(styleConfig)
      
      res.json({
        success: true,
        data: updatedStyles,
        message: '更新全景图点位样式配置成功'
      })
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
      const defaultStyles = await PanoramaPointStyleModel.resetStyles()
      
      res.json({
        success: true,
        data: defaultStyles,
        message: '重置全景图点位样式配置成功'
      })
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
const KmlPointModel = require('../models/kmlPoint.model')
const Logger = require('../utils/logger')

class KmlPointQueryController {
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
}

module.exports = KmlPointQueryController
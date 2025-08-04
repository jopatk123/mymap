const PanoramaModel = require('../models/panorama.model')
const VideoPointModel = require('../models/videoPoint.model')
const Logger = require('../utils/logger')

class PointsController {
  // 获取所有点位（全景图 + 视频点位）
  static async getAllPoints(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false
      } = req.query

      // 并行获取全景图和视频点位
      const [panoramaResult, videoResult] = await Promise.all([
        PanoramaModel.findAll({
          page: 1,
          pageSize: 1000, // 获取所有数据，后续统一分页
          keyword,
          folderId: folderId ? parseInt(folderId) : null,
          includeHidden: includeHidden === 'true'
        }),
        VideoPointModel.findAll({
          page: 1,
          pageSize: 1000, // 获取所有数据，后续统一分页
          keyword,
          folderId: folderId ? parseInt(folderId) : null,
          includeHidden: includeHidden === 'true'
        })
      ])

      // 合并数据并添加类型标识
      const panoramas = panoramaResult.data.map(item => ({
        ...item,
        type: 'panorama',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.image_url,
        thumbnailUrl: item.thumbnail_url
      }))

      const videos = videoResult.data.map(item => ({
        ...item,
        type: 'video',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.video_url,
        thumbnailUrl: item.thumbnail_url
      }))

      // 合并并排序
      const allPoints = [...panoramas, ...videos].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )

      // 手动分页
      const total = allPoints.length
      const startIndex = (parseInt(page) - 1) * parseInt(pageSize)
      const endIndex = startIndex + parseInt(pageSize)
      const paginatedData = allPoints.slice(startIndex, endIndex)

      res.json({
        success: true,
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      })
    } catch (error) {
      Logger.error('获取所有点位失败:', error)
      res.status(500).json({
        success: false,
        message: '获取点位列表失败',
        error: error.message
      })
    }
  }

  // 根据地图边界获取所有点位
  static async getPointsByBounds(req, res) {
    try {
      const { north, south, east, west, includeHidden = false } = req.query

      const bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
        includeHidden: includeHidden === 'true'
      }

      // 并行获取全景图和视频点位
      const [panoramas, videos] = await Promise.all([
        PanoramaModel.findByBounds(bounds),
        VideoPointModel.findByBounds(bounds)
      ])

      // 添加类型标识
      const panoramaPoints = panoramas.map(item => ({
        ...item,
        type: 'panorama',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.image_url,
        thumbnailUrl: item.thumbnail_url
      }))

      const videoPoints = videos.map(item => ({
        ...item,
        type: 'video',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.video_url,
        thumbnailUrl: item.thumbnail_url
      }))

      const allPoints = [...panoramaPoints, ...videoPoints]

      res.json({
        success: true,
        data: allPoints
      })
    } catch (error) {
      Logger.error('根据边界获取点位失败:', error)
      res.status(500).json({
        success: false,
        message: '获取点位失败',
        error: error.message
      })
    }
  }

  // 获取点位统计信息
  static async getPointsStats(req, res) {
    try {
      const [panoramaStats, videoStats] = await Promise.all([
        PanoramaModel.getStats(),
        VideoPointModel.getStats()
      ])

      const stats = {
        total: panoramaStats.total + videoStats.total,
        visible: panoramaStats.visible + videoStats.visible,
        hidden: panoramaStats.hidden + videoStats.hidden,
        panoramas: panoramaStats,
        videos: videoStats
      }

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      Logger.error('获取点位统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取点位统计失败',
        error: error.message
      })
    }
  }
}

module.exports = PointsController
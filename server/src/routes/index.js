const express = require('express')
const router = express.Router()
const panoramaRoutes = require('./panorama.routes')

// API版本信息
router.get('/', (req, res) => {
  res.json({
    code: 200,
    success: true,
    message: '地图全景系统 API',
    data: {
      version: '1.0.0',
      description: '基于 Leaflet + Pannellum 的地图全景查看系统',
      endpoints: {
        panoramas: '/api/panoramas',
        health: '/api/health'
      }
    },
    timestamp: new Date().toISOString()
  })
})

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    code: 200,
    success: true,
    message: '服务运行正常',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  })
})

// 全景图相关路由
router.use('/panoramas', panoramaRoutes)

// 文件夹相关路由
const folderRoutes = require('./folder.routes')
router.use('/folders', folderRoutes)

// 视频点位相关路由
const videoPointRoutes = require('./videoPoint.routes')
router.use('/video-points', videoPointRoutes)

// KML文件相关路由
const kmlFileRoutes = require('./kmlFile.routes')
router.use('/kml-files', kmlFileRoutes)

// 统一点位相关路由（全景图 + 视频点位）
const pointsRoutes = require('./points.routes')
router.use('/points', pointsRoutes)

module.exports = router
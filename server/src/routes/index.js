const express = require('express')
const router = express.Router()
const panoramaRoutes = require('./panoramas.routes')

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
const folderRoutes = require('./folders.routes')
router.use('/folders', folderRoutes)

// 视频点位相关路由
const videoPointRoutes = require('./video-points.routes')
router.use('/video-points', videoPointRoutes)

// KML文件相关路由
const kmlFileRoutes = require('./kml-file.routes')
router.use('/kml-files', kmlFileRoutes)

// KML底图（前端专用路由）
const kmlBaseMapRoutes = require('./kml-basemap')
router.use('/kml-basemap', kmlBaseMapRoutes)

// 统一点位相关路由（全景图 + 视频点位）
const pointsRoutes = require('./points.routes')
router.use('/points', pointsRoutes)

// 高德地图代理路由（用于地址联想与 POI 搜索，避免前端直接暴露 Key）
const amapRoutes = require('./amap.routes')
router.use('/amap', amapRoutes)


// 点位样式配置路由
const pointStyleRoutes = require('./point-styles.routes')
router.use('/point-styles', pointStyleRoutes)

// 统一配置管理路由
const configRoutes = require('./config.routes')
router.use('/config', configRoutes)

module.exports = router
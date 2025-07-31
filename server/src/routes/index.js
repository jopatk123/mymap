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

module.exports = router
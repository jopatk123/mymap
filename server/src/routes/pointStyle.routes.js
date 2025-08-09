const express = require('express')
const router = express.Router()
const PointStyleController = require('../controllers/pointStyle.controller')

// 视频点位样式配置路由
router.get('/video', PointStyleController.getVideoPointStyles)
router.put('/video', PointStyleController.updateVideoPointStyles)
router.delete('/video', PointStyleController.resetVideoPointStyles)

// 全景图点位样式配置路由
router.get('/panorama', PointStyleController.getPanoramaPointStyles)
router.put('/panorama', PointStyleController.updatePanoramaPointStyles)
router.delete('/panorama', PointStyleController.resetPanoramaPointStyles)

module.exports = router
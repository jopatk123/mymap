const express = require('express')
const KMLSearchController = require('../controllers/kml-search.controller')
const router = express.Router()

/**
 * KML搜索相关路由
 */

// 搜索KML点位
router.get('/search', KMLSearchController.searchKMLPoints)

// 获取所有KML点位
router.get('/points', KMLSearchController.getAllKMLPoints)

// 根据ID获取KML点位详情
router.get('/points/:id', KMLSearchController.getKMLPointById)

module.exports = router
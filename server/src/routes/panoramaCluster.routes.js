const express = require('express')
const router = express.Router()
const KmlFileController = require('../controllers/kmlFile.controller')

// 获取全景图聚合配置
router.get('/', KmlFileController.getPanoramaClusterConfig)

// 更新全景图聚合配置
router.put('/', KmlFileController.updatePanoramaClusterConfig)

module.exports = router
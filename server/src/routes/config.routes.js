const express = require('express');
const router = express.Router();
const ConfigController = require('../controllers/config.controller');

// 完整配置管理
router.get('/', ConfigController.getConfig);
router.put('/', ConfigController.updateConfig);
router.delete('/', ConfigController.resetConfig);

// 点位样式配置
router.get('/point-styles', ConfigController.getPointStyles);
router.put('/point-styles', ConfigController.updatePointStyles);

// KML样式配置
router.get('/kml-styles', ConfigController.getKmlStyles);
router.put('/kml-styles', ConfigController.updateKmlStyles);

// 地图设置
router.get('/map-settings', ConfigController.getMapSettings);
router.put('/map-settings', ConfigController.updateMapSettings);

// 上传设置
router.get('/upload-settings', ConfigController.getUploadSettings);
router.put('/upload-settings', ConfigController.updateUploadSettings);

module.exports = router;

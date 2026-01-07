const express = require('express');
const router = express.Router();
const PointsController = require('../controllers/points.controller');
const { validateBoundsParams } = require('../middleware/validator.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

// 认证保护
router.use(requireAuth);

// 获取所有点位列表（全景图 + 视频点位）
router.get('/', PointsController.getAllPoints);

// 根据地图边界获取所有点位
router.get('/bounds', validateBoundsParams, PointsController.getPointsByBounds);

// 获取可见的KML文件（用于地图显示）
router.get('/kml/visible', PointsController.getVisibleKmlFiles);

// 获取点位统计信息
router.get('/stats', PointsController.getPointsStats);

module.exports = router;

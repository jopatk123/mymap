const express = require('express');
const router = express.Router();
const ImageSetController = require('../controllers/image-set');
const { handleImageSetUpload, handleImageSetAddImages } = require('../middleware/upload.middleware');
const {
  validateId,
  validateBatchIds,
  validateBoundsParams,
} = require('../middleware/validator.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

// 认证保护
router.use(requireAuth);

// 获取图片集列表
router.get('/', ImageSetController.getImageSets);

// 根据地图边界获取图片集
router.get('/bounds', validateBoundsParams, ImageSetController.getImageSetsByBounds);

// 获取统计信息
router.get('/stats', ImageSetController.getImageSetStats);

// 上传并创建图片集
router.post('/upload', handleImageSetUpload, ImageSetController.createImageSet);

// 批量操作路由 - 需要在具体ID路由之前定义
// 批量删除图片集
router.delete('/', validateBatchIds, ImageSetController.batchDeleteImageSets);

// 批量更新图片集可见性
router.patch('/batch/visibility', validateBatchIds, ImageSetController.batchUpdateVisibility);

// 批量移动图片集到文件夹
router.patch('/batch/move', ImageSetController.batchMoveToFolder);

// 根据ID获取图片集详情
router.get('/:id', validateId, ImageSetController.getImageSetById);

// 更新图片集
router.put('/:id', validateId, ImageSetController.updateImageSet);

// 删除图片集
router.delete('/:id', validateId, ImageSetController.deleteImageSet);

// 移动图片集到文件夹
router.patch('/:id/move', validateId, ImageSetController.moveToFolder);

// 更新图片集可见性
router.patch('/:id/visibility', validateId, ImageSetController.updateVisibility);

// 添加图片到图片集
router.post('/:id/images', validateId, handleImageSetAddImages, ImageSetController.addImages);

// 从图片集删除图片
router.delete('/:id/images/:imageId', validateId, ImageSetController.removeImage);

// 更新图片排序
router.patch('/:id/images/order', validateId, ImageSetController.updateImageOrder);

module.exports = router;

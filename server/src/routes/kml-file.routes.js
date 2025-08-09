const express = require('express')
const router = express.Router()
const KmlFileController = require('../controllers/kmlFile.controller')
const { handleKmlUpload } = require('../middleware/upload.middleware')
const { 
  validateId,
  validateBatchIds,
  validateBoundsParams
} = require('../middleware/validator.middleware')

// 获取KML文件列表
router.get('/', KmlFileController.getKmlFiles)

// 根据地图边界获取KML点位
router.get('/points/bounds', validateBoundsParams, KmlFileController.getKmlPointsByBounds)

// 获取统计信息
router.get('/stats', KmlFileController.getKmlFileStats)

// 上传KML文件
router.post('/upload', handleKmlUpload, (req, res) => {
  const { uploadedFile } = req
  const { title, description, folderId } = req.body

  // 验证必填字段
  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      message: '请上传KML文件'
    })
  }

  if (!title) {
    return res.status(400).json({
      success: false,
      message: '标题为必填项'
    })
  }

  // 调用上传KML文件的方法
  KmlFileController.uploadKmlFile(req, res)
})

// 验证KML文件
router.post('/validate', handleKmlUpload, KmlFileController.validateKmlFile)

// 批量操作路由 - 这些需要在具体ID路由之前定义
// 批量删除KML文件
router.delete('/', validateBatchIds, KmlFileController.batchDeleteKmlFiles)

// 批量更新KML文件可见性
router.put('/batch/visibility', validateBatchIds, KmlFileController.batchUpdateKmlFileVisibility)

// 批量移动KML文件到文件夹
router.put('/batch/move', KmlFileController.batchMoveKmlFilesToFolder)

// 根据ID获取KML文件详情
router.get('/:id', validateId, KmlFileController.getKmlFileById)

// 获取KML文件的点位数据
router.get('/:id/points', validateId, KmlFileController.getKmlFilePoints)

// 更新KML文件
router.put('/:id', validateId, KmlFileController.updateKmlFile)

// 删除KML文件
router.delete('/:id', validateId, KmlFileController.deleteKmlFile)

// 移动KML文件到文件夹
router.patch('/:id/move', validateId, KmlFileController.moveKmlFileToFolder)

// 更新KML文件可见性
router.patch('/:id/visibility', validateId, KmlFileController.updateKmlFileVisibility)

// 样式配置相关路由
// 获取KML文件样式配置
router.get('/:id/styles', validateId, KmlFileController.getKmlFileStyles)

// 更新KML文件样式配置
router.put('/:id/styles', validateId, KmlFileController.updateKmlFileStyles)

// 重置KML文件样式为默认
router.delete('/:id/styles', validateId, KmlFileController.resetKmlFileStyles)

// 批量更新KML文件样式配置
router.put('/styles/batch', KmlFileController.batchUpdateKmlFileStyles)

module.exports = router



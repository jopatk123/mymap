const express = require('express')
const router = express.Router()
const VideoPointController = require('../controllers/video-point')
const { handleVideoUpload } = require('../middleware/upload.middleware')
const { 
  validateId,
  validateBatchIds,
  validateBoundsParams
} = require('../middleware/validator.middleware')

// 获取视频点位列表
router.get('/', VideoPointController.getVideoPoints)

// 根据地图边界获取视频点位
router.get('/bounds', validateBoundsParams, VideoPointController.getVideoPointsByBounds)

// 获取统计信息
router.get('/stats', VideoPointController.getVideoPointStats)

// 上传视频文件
router.post('/upload', handleVideoUpload, (req, res) => {
  const { uploadedFile } = req
  const { title, description, lat, lng, folderId, duration } = req.body

  // 验证必填字段
  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      message: '请上传视频文件'
    })
  }

  if (!title || !lat || !lng) {
    return res.status(400).json({
      success: false,
      message: '标题、纬度和经度为必填项'
    })
  }

  // 验证文件类型 - 检查MIME类型或文件扩展名
  const isVideoMimeType = uploadedFile.mimetype.startsWith('video/')
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv']
  const fileExtension = require('path').extname(uploadedFile.originalname).toLowerCase()
  const isVideoExtension = videoExtensions.includes(fileExtension)
  
  if (!isVideoMimeType && !isVideoExtension) {
    return res.status(400).json({
      success: false,
      message: '只支持视频文件格式'
    })
  }

  // 调用创建视频点位的方法
  VideoPointController.createVideoPoint(req, res)
})

// 批量操作路由 - 这些需要在具体ID路由之前定义
// 批量删除视频点位
router.delete('/', validateBatchIds, VideoPointController.batchDeleteVideoPoints)

// 批量更新视频点位可见性
router.patch('/batch/visibility', validateBatchIds, VideoPointController.batchUpdateVideoPointVisibility)

// 批量移动视频点位到文件夹
router.patch('/batch/move', VideoPointController.batchMoveVideoPointsToFolder)

// 根据ID获取视频点位详情
router.get('/:id', validateId, VideoPointController.getVideoPointById)

// 更新视频点位
router.put('/:id', validateId, VideoPointController.updateVideoPoint)

// 删除视频点位
router.delete('/:id', validateId, VideoPointController.deleteVideoPoint)

// 移动视频点位到文件夹
router.patch('/:id/move', validateId, VideoPointController.moveVideoPointToFolder)

// 更新视频点位可见性
router.patch('/:id/visibility', validateId, VideoPointController.updateVideoPointVisibility)

module.exports = router



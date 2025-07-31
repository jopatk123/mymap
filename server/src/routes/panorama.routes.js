const express = require('express')
const router = express.Router()
const PanoramaController = require('../controllers/panorama.controller')
const { 
  validatePanoramaData,
  validateUpdatePanoramaData,
  validateSearchParams,
  validateBoundsParams,
  validateId,
  validateBatchIds
} = require('../middleware/validator.middleware')
const { handleSingleUpload, handleBatchUpload } = require('../middleware/upload.middleware')

// 获取全景图列表
router.get('/', PanoramaController.getPanoramas)

// 根据地图边界获取全景图
router.get('/bounds', validateBoundsParams, PanoramaController.getPanoramasByBounds)

// 获取附近的全景图
router.get('/nearby', PanoramaController.getNearbyPanoramas)

// 搜索全景图
router.get('/search', validateSearchParams, PanoramaController.searchPanoramas)

// 获取统计信息
router.get('/stats', PanoramaController.getStats)

// 坐标转换
router.get('/convert-coordinate', PanoramaController.convertCoordinate)

// 根据ID获取全景图详情
router.get('/:id', validateId, PanoramaController.getPanoramaById)

// 创建全景图
router.post('/', validatePanoramaData, PanoramaController.createPanorama)

// 单文件上传
router.post('/upload', handleSingleUpload, (req, res) => {
  const { uploadedFile } = req
  const { title, description, lat, lng } = req.body
  
  // 构建全景图数据
  const panoramaData = {
    title: title || '未命名全景图',
    description: description || '',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    imageUrl: uploadedFile.imageUrl,
    thumbnailUrl: uploadedFile.thumbnailUrl,
    fileSize: uploadedFile.size,
    fileType: uploadedFile.mimetype
  }
  
  // 将数据添加到请求体中，然后调用创建控制器
  req.body = panoramaData
  PanoramaController.createPanorama(req, res)
})

// 批量文件上传
router.post('/batch-upload', handleBatchUpload, async (req, res) => {
  try {
    const { uploadedFiles } = req
    const results = []
    
    // 为每个文件创建全景图记录
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const panoramaData = {
        title: `全景图 ${i + 1}`,
        description: `批量上传的全景图 - ${file.originalName}`,
        lat: 39.9042, // 默认坐标，用户需要后续修改
        lng: 116.4074,
        imageUrl: file.imageUrl,
        thumbnailUrl: file.thumbnailUrl,
        fileSize: file.size,
        fileType: file.mimetype
      }
      
      try {
        // 创建临时请求对象
        const tempReq = { body: panoramaData }
        const tempRes = {
          status: () => tempRes,
          json: (data) => data
        }
        
        const result = await PanoramaController.createPanorama(tempReq, tempRes)
        results.push({
          success: true,
          file: file.originalName,
          data: result
        })
      } catch (error) {
        results.push({
          success: false,
          file: file.originalName,
          error: error.message
        })
      }
    }
    
    res.json({
      code: 200,
      success: true,
      message: '批量上传完成',
      data: {
        total: uploadedFiles.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    })
  } catch (error) {
    console.error('批量上传处理失败:', error)
    res.status(500).json({
      code: 500,
      success: false,
      message: '批量上传处理失败',
      data: null
    })
  }
})

// 更新全景图
router.put('/:id', validateId, validateUpdatePanoramaData, PanoramaController.updatePanorama)

// 删除全景图
router.delete('/:id', validateId, PanoramaController.deletePanorama)

// 批量删除全景图
router.delete('/', validateBatchIds, PanoramaController.batchDeletePanoramas)

module.exports = router
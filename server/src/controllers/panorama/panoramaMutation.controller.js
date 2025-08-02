const PanoramaService = require('../../services/panorama.service')
const { successResponse, errorResponse } = require('../../utils/response')

class PanoramaMutationController {
  // 创建全景图
  static async createPanorama(req, res) {
    try {
      const { title, description, lat, lng, imageUrl, thumbnailUrl, fileSize, fileType } = req.body
      
      // 基本验证
      if (!title || !lat || !lng || !imageUrl) {
        return res.status(400).json(errorResponse('缺少必要参数'))
      }
      
      const panoramaData = {
        title,
        description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        imageUrl,
        thumbnailUrl,
        fileSize: fileSize ? parseInt(fileSize) : null,
        fileType
      }
      
      // 验证坐标范围
      if (panoramaData.lat < -90 || panoramaData.lat > 90 || 
          panoramaData.lng < -180 || panoramaData.lng > 180) {
        return res.status(400).json(errorResponse('坐标参数超出有效范围'))
      }
      
      const panorama = await PanoramaService.createPanorama(panoramaData)
      
      res.status(201).json(successResponse(panorama, '创建全景图成功'))
    } catch (error) {
      console.error('创建全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  // 更新全景图
  static async updatePanorama(req, res) {
    try {
      const { id } = req.params
      const { title, description, lat, lng, imageUrl, thumbnailUrl } = req.body
      
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      
      const panoramaData = {}
      
      if (title !== undefined) panoramaData.title = title
      if (description !== undefined) panoramaData.description = description
      if (imageUrl !== undefined) panoramaData.imageUrl = imageUrl
      if (thumbnailUrl !== undefined) panoramaData.thumbnailUrl = thumbnailUrl
      
      if (lat !== undefined && lng !== undefined) {
        panoramaData.lat = parseFloat(lat)
        panoramaData.lng = parseFloat(lng)
        
        // 验证坐标范围
        if (panoramaData.lat < -90 || panoramaData.lat > 90 || 
            panoramaData.lng < -180 || panoramaData.lng > 180) {
          return res.status(400).json(errorResponse('坐标参数超出有效范围'))
        }
      }
      
      const panorama = await PanoramaService.updatePanorama(parseInt(id), panoramaData)
      
      res.json(successResponse(panorama, '更新全景图成功'))
    } catch (error) {
      console.error('更新全景图失败:', error)
      
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }
  
  // 删除全景图
  static async deletePanorama(req, res) {
    try {
      const { id } = req.params
      
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      
      const result = await PanoramaService.deletePanorama(parseInt(id))
      
      res.json(successResponse(result, '删除全景图成功'))
    } catch (error) {
      console.error('删除全景图失败:', error)
      
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }
  
  // 批量删除全景图
  static async batchDeletePanoramas(req, res) {
    try {
      const { ids } = req.body
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse('请提供有效的ID列表'))
      }
      
      // 验证所有ID都是数字
      const validIds = ids.filter(id => !isNaN(id)).map(id => parseInt(id))
      
      if (validIds.length === 0) {
        return res.status(400).json(errorResponse('没有有效的ID'))
      }
      
      const result = await PanoramaService.batchDeletePanoramas(validIds)
      
      res.json(successResponse(result, '批量删除全景图成功'))
    } catch (error) {
      console.error('批量删除全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
}

module.exports = PanoramaMutationController
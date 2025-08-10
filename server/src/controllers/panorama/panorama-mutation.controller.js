// 兼容旧命名，转发到新文件
const { PanoramaMutationService } = require('../../services')
const { successResponse, errorResponse } = require('../../utils/response')

class PanoramaMutationController {
  static async createPanorama(req, res) {
    try {
      const { title, description, lat, lng, imageUrl, thumbnailUrl, fileSize, fileType, folderId } = req.body
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
        fileType,
        folderId: folderId !== undefined ? (folderId ? parseInt(folderId) : null) : null
      }
      if (panoramaData.lat < -90 || panoramaData.lat > 90 || panoramaData.lng < -180 || panoramaData.lng > 180) {
        return res.status(400).json(errorResponse('坐标参数超出有效范围'))
      }
      const panorama = await PanoramaMutationService.createPanorama(panoramaData)
      res.status(201).json(successResponse(panorama, '创建全景图成功'))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('创建全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }

  static async updatePanorama(req, res) {
    try {
      const { id } = req.params
      const { title, description, lat, lng, imageUrl, thumbnailUrl, folderId, isVisible, sortOrder } = req.body
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      const panoramaData = {}
      if (title !== undefined) panoramaData.title = title
      if (description !== undefined) panoramaData.description = description
      if (imageUrl !== undefined) panoramaData.imageUrl = imageUrl
      if (thumbnailUrl !== undefined) panoramaData.thumbnailUrl = thumbnailUrl
      if (folderId !== undefined) panoramaData.folderId = folderId
      if (isVisible !== undefined) panoramaData.isVisible = isVisible
      if (sortOrder !== undefined) panoramaData.sortOrder = sortOrder
      if (lat !== undefined && lng !== undefined) {
        panoramaData.lat = parseFloat(lat)
        panoramaData.lng = parseFloat(lng)
        if (panoramaData.lat < -90 || panoramaData.lat > 90 || panoramaData.lng < -180 || panoramaData.lng > 180) {
          return res.status(400).json(errorResponse('坐标参数超出有效范围'))
        }
      }
      const panorama = await PanoramaMutationService.updatePanorama(parseInt(id), panoramaData)
      res.json(successResponse(panorama, '更新全景图成功'))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('更新全景图失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async deletePanorama(req, res) {
    try {
      const { id } = req.params
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      const result = await PanoramaMutationService.deletePanorama(parseInt(id))
      res.json(successResponse(result, '删除全景图成功'))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('删除全景图失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async batchDeletePanoramas(req, res) {
    try {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse('请提供有效的ID列表'))
      }
      const validIds = ids.filter(id => !isNaN(id)).map(id => parseInt(id))
      if (validIds.length === 0) {
        return res.status(400).json(errorResponse('没有有效的ID'))
      }
      const result = await PanoramaMutationService.batchDeletePanoramas(validIds)
      res.json(successResponse(result, '批量删除全景图成功'))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('批量删除全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }

  static async movePanoramaToFolder(req, res) {
    try {
      const { id } = req.params
      const { folderId } = req.body
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      const panorama = await PanoramaMutationService.movePanoramaToFolder(parseInt(id), folderId || null)
      res.json(successResponse(panorama, '移动全景图成功'))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('移动全景图失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async batchMovePanoramasToFolder(req, res) {
    try {
      const { ids, folderId } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse('请提供有效的ID列表'))
      }
      const validIds = ids.filter(id => !isNaN(id)).map(id => parseInt(id))
      if (validIds.length === 0) {
        return res.status(400).json(errorResponse('没有有效的ID'))
      }
      const result = await PanoramaMutationService.batchMovePanoramasToFolder(validIds, folderId || null)
      res.json(successResponse(result, '批量移动全景图成功'))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('批量移动全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }

  static async updatePanoramaVisibility(req, res) {
    try {
      const { id } = req.params
      const { isVisible } = req.body
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      if (typeof isVisible !== 'boolean') {
        return res.status(400).json(errorResponse('isVisible必须是布尔值'))
      }
      const panorama = await PanoramaMutationService.updatePanoramaVisibility(parseInt(id), isVisible)
      res.json(successResponse(panorama, `全景图已${isVisible ? '显示' : '隐藏'}`))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('更新全景图可见性失败:', error)
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }

  static async batchUpdatePanoramaVisibility(req, res) {
    try {
      const { ids, isVisible } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse('请提供有效的ID列表'))
      }
      if (typeof isVisible !== 'boolean') {
        return res.status(400).json(errorResponse('isVisible必须是布尔值'))
      }
      const validIds = ids.filter(id => !isNaN(id)).map(id => parseInt(id))
      if (validIds.length === 0) {
        return res.status(400).json(errorResponse('没有有效的ID'))
      }
      const result = await PanoramaMutationService.batchUpdatePanoramaVisibility(validIds, isVisible)
      res.json(successResponse(result, `批量${isVisible ? '显示' : '隐藏'}全景图成功`))
    } catch (error) {
      const Logger = require('../../utils/logger')
      Logger.error('批量更新全景图可见性失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
}

module.exports = PanoramaMutationController



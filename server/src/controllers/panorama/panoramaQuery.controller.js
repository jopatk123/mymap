const { PanoramaQueryService } = require('../../services')
const { successResponse, errorResponse } = require('../../utils/response')

class PanoramaQueryController {
  // 获取全景图列表
  static async getPanoramas(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        keyword = '',
        folderId,
        includeHidden = false
      } = req.query
      
      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        sortBy,
        sortOrder,
        keyword,
        folderId: folderId ? parseInt(folderId) : null,
        includeHidden: includeHidden === 'true'
      }
      
      const result = await PanoramaQueryService.getPanoramas(options)
      
      res.json(successResponse(result, '获取全景图列表成功'))
    } catch (error) {
      Logger.error('获取全景图列表失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  // 根据ID获取全景图详情
  static async getPanoramaById(req, res) {
    try {
      const { id } = req.params
      
      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的全景图ID'))
      }
      
      const panorama = await PanoramaQueryService.getPanoramaById(parseInt(id))
      
      res.json(successResponse(panorama, '获取全景图详情成功'))
    } catch (error) {
      Logger.error('获取全景图详情失败:', error)
      
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message))
      } else {
        res.status(500).json(errorResponse(error.message))
      }
    }
  }
  
  // 根据地图边界获取全景图
  static async getPanoramasByBounds(req, res) {
    try {
      const { north, south, east, west } = req.query
      
      // 验证边界参数
      if (!north || !south || !east || !west) {
        return res.status(400).json(errorResponse('缺少边界参数'))
      }
      
      const bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      }
      
      // 验证边界值的合理性
      if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
        return res.status(400).json(errorResponse('边界参数不合理'))
      }
      
      const panoramas = await PanoramaQueryService.getPanoramasByBounds(bounds)
      
      res.json(successResponse(panoramas, '根据边界获取全景图成功'))
    } catch (error) {
      Logger.error('根据边界获取全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  // 获取附近的全景图
  static async getNearbyPanoramas(req, res) {
    try {
      const { lat, lng, radius = 1000 } = req.query
      
      if (!lat || !lng) {
        return res.status(400).json(errorResponse('缺少坐标参数'))
      }
      
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)
      const searchRadius = parseInt(radius)
      
      // 验证坐标范围
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json(errorResponse('坐标参数超出有效范围'))
      }
      
      const panoramas = await PanoramaQueryService.getNearbyPanoramas(latitude, longitude, searchRadius)
      
      res.json(successResponse(panoramas, '获取附近全景图成功'))
    } catch (error) {
      Logger.error('获取附近全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  // 搜索全景图
  static async searchPanoramas(req, res) {
    try {
      const {
        keyword = '',
        lat,
        lng,
        radius,
        dateFrom,
        dateTo,
        page = 1,
        pageSize = 20
      } = req.query
      
      const searchParams = {
        keyword,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
      
      // 位置搜索参数
      if (lat && lng) {
        searchParams.lat = parseFloat(lat)
        searchParams.lng = parseFloat(lng)
        searchParams.radius = radius ? parseInt(radius) : 1000
        
        // 验证坐标范围
        if (searchParams.lat < -90 || searchParams.lat > 90 || 
            searchParams.lng < -180 || searchParams.lng > 180) {
          return res.status(400).json(errorResponse('坐标参数超出有效范围'))
        }
      }
      
      // 日期范围参数
      if (dateFrom) searchParams.dateFrom = dateFrom
      if (dateTo) searchParams.dateTo = dateTo
      
      const result = await PanoramaQueryService.searchPanoramas(searchParams)
      
      res.json(successResponse(result, '搜索全景图成功'))
    } catch (error) {
      Logger.error('搜索全景图失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  // 获取统计信息
  static async getStats(req, res) {
    try {
      const stats = await PanoramaQueryService.getStats()
      
      res.json(successResponse(stats, '获取统计信息成功'))
    } catch (error) {
      Logger.error('获取统计信息失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
}

module.exports = PanoramaQueryController
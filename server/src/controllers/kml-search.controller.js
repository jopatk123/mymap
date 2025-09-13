const KMLSearchService = require('../services/kml-search.service')
const Logger = require('../utils/logger')
const { successResponse, errorResponse } = require('../utils/response')

class KMLSearchController {
  /**
   * 搜索KML点位
   */
  static async searchKMLPoints(req, res) {
    try {
      const { 
        keyword = '',
        files = [] // 可选：指定搜索的KML文件列表
      } = req.query
      
      if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 1) {
        return res.status(400).json(errorResponse('搜索关键词不能为空'))
      }
      
  const kmlFiles = Array.isArray(files) ? files : (files ? [files] : [])

  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100
  const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0

  Logger.debug('KML搜索接口参数', { keyword: keyword.trim(), files: kmlFiles, limit, offset })

  const results = await KMLSearchService.searchKMLPoints(keyword.trim(), kmlFiles, { limit, offset })
      
      res.json(successResponse(results, '搜索KML点位成功'))
    } catch (error) {
      Logger.error('搜索KML点位失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  /**
   * 获取所有KML点位
   */
  static async getAllKMLPoints(req, res) {
    try {
      const { files = [] } = req.query
      const kmlFiles = Array.isArray(files) ? files : (files ? [files] : [])
      
      const results = await KMLSearchService.getAllKMLPoints(kmlFiles)
      
      res.json(successResponse(results, '获取所有KML点位成功'))
    } catch (error) {
      Logger.error('获取所有KML点位失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
  
  /**
   * 根据ID获取KML点位详情
   */
  static async getKMLPointById(req, res) {
    try {
      const { id } = req.params
      
      if (!id) {
        return res.status(400).json(errorResponse('点位ID不能为空'))
      }
      
      // 获取所有点位，然后根据ID查找
      const allPoints = await KMLSearchService.getAllKMLPoints()
      const point = allPoints.find(p => p.id === id)
      
      if (!point) {
        return res.status(404).json(errorResponse('未找到指定的KML点位'))
      }
      
      res.json(successResponse(point, '获取KML点位详情成功'))
    } catch (error) {
      Logger.error('获取KML点位详情失败:', error)
      res.status(500).json(errorResponse(error.message))
    }
  }
}

module.exports = KMLSearchController
const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const Logger = require('../utils/logger')

// 简单内存缓存：缓存每个解析过的 KML 文件点位以及文件修改时间，用于避免重复解析
const kmlParseCache = {}

class KMLSearchService {
  /**
   * 搜索KML文件中的点位
   * @param {string} keyword - 搜索关键词
   * @param {Array<string>} kmlFiles - KML文件路径数组
   * @returns {Promise<Array>} 搜索结果
   */
  static async searchKMLPoints(keyword, kmlFiles = [], options = {}) {
    try {
      const limit = parseInt(options.limit, 10) || 100
      const offset = parseInt(options.offset, 10) || 0

      Logger.debug('搜索KML点位', { keyword, requestedFiles: kmlFiles.length, limit, offset })
      
      if (!keyword || typeof keyword !== 'string') {
        return []
      }
      
      const searchKeyword = keyword.toLowerCase().trim()
      if (!searchKeyword) {
        return []
      }
      
  const results = []
      
      // 如果没有指定文件，则搜索默认的KML文件
      const filesToSearch = kmlFiles.length > 0 ? kmlFiles : await this.getDefaultKMLFiles()
      
      // 遍历文件并收集匹配，支持提前终止以节省开销
      for (const kmlFile of filesToSearch) {
        Logger.debug('开始处理KML文件', { file: kmlFile })
        const points = await this.parseKMLFile(kmlFile)
        if (!points || points.length === 0) {
          Logger.debug('KML文件无点位或解析结果为空', { file: kmlFile })
          continue
        }

        const matchedPoints = this.searchPointsInFile(points, searchKeyword, kmlFile)
        if (matchedPoints && matchedPoints.length > 0) {
          results.push(...matchedPoints)
        }

        // 如果已收集到足够（offset + limit），则可以停止继续解析剩余文件
        if (results.length >= offset + limit) {
          Logger.debug('已收集足够匹配项，终止进一步文件解析', { collected: results.length, needed: offset + limit })
          break
        }
      }
      
      Logger.debug('KML点位搜索完成', {
        keyword,
        totalResults: results.length,
        returned: Math.max(0, results.length - offset) > 0 ? Math.min(limit, Math.max(0, results.length - offset)) : 0,
        fileCount: filesToSearch.length
      })

      // 应用 offset 与 limit
      const paginated = results.slice(offset, offset + limit)
      return paginated
    } catch (error) {
      Logger.error('搜索KML点位失败', error)
      throw new Error(`搜索KML点位失败: ${error.message}`)
    }
  }
  
  /**
   * 获取默认的KML文件列表
   * @returns {Promise<Array<string>>}
   */
  static async getDefaultKMLFiles() {
    const defaultFiles = ['示例.kml', '资源图层.kml']

    // 候选目录：当前工作目录（通常是 server/）、上一级目录（项目根）以及可选的环境变量指定目录
    const candidates = []
    const cwd = path.resolve(process.cwd())
    candidates.push(cwd)
    candidates.push(path.resolve(cwd, '..'))
    if (process.env.KML_DIR) candidates.push(path.resolve(process.env.KML_DIR))

    const existingFiles = []
    for (const dir of candidates) {
      try {
        for (const file of defaultFiles) {
          const filePath = path.join(dir, file)
          if (fs.existsSync(filePath)) {
            existingFiles.push(filePath)
          }
        }
      } catch (e) {
        Logger.warn('检查候选目录时出错', { dir, error: e.message })
      }
    }

    // 去重并返回
    const unique = Array.from(new Set(existingFiles))
    Logger.debug('getDefaultKMLFiles candidates', { candidates, found: unique })
    return unique
  }
  
  /**
   * 解析KML文件
   * @param {string} kmlFilePath - KML文件路径
   * @returns {Promise<Array>} 解析出的点位数据
   */
  static async parseKMLFile(kmlFilePath) {
    try {
      if (!fs.existsSync(kmlFilePath)) {
        Logger.warn(`KML文件不存在: ${kmlFilePath}`)
        return []
      }

      // 检查文件修改时间，使用缓存（避免每次请求都重新解析大文件）
      let stat
      try {
        stat = fs.statSync(kmlFilePath)
      } catch (e) {
        Logger.warn('获取KML文件状态失败', { file: kmlFilePath, error: e.message })
        stat = null
      }

      const mtime = stat ? stat.mtimeMs : null
      const cacheEntry = kmlParseCache[kmlFilePath]
      if (cacheEntry && cacheEntry.mtime === mtime && Array.isArray(cacheEntry.points)) {
        Logger.debug('KML解析命中缓存', { file: kmlFilePath, cachedCount: cacheEntry.points.length })
        return cacheEntry.points
      }

      const xmlContent = fs.readFileSync(kmlFilePath, 'utf8')
      const parser = new xml2js.Parser({ 
        explicitArray: false,
        ignoreAttrs: true,
        trim: true
      })
      
      const result = await parser.parseStringPromise(xmlContent)
      
      if (!result.kml || !result.kml.Document) {
        Logger.warn(`KML文件格式无效: ${kmlFilePath}`)
        return []
      }
      
      const document = result.kml.Document
      let placemarks = []
      
      if (document.Placemark) {
        placemarks = Array.isArray(document.Placemark) 
          ? document.Placemark 
          : [document.Placemark]
      }
      
      const points = []
      for (const placemark of placemarks) {
        const point = this.parsePlacemark(placemark)
        if (point) {
          points.push(point)
        }
      }

      Logger.debug(`解析KML文件完成: ${path.basename(kmlFilePath)}`, {
        pointCount: points.length
      })

      // 更新缓存
      try {
        kmlParseCache[kmlFilePath] = { mtime, points }
      } catch (e) {
        Logger.warn('更新KML解析缓存失败', { file: kmlFilePath, error: e.message })
      }

      return points
    } catch (error) {
      Logger.error(`解析KML文件失败: ${kmlFilePath}`, error)
      return []
    }
  }
  
  /**
   * 解析单个地标点
   * @param {Object} placemark - KML地标对象
   * @returns {Object|null} 解析后的点位信息
   */
  static parsePlacemark(placemark) {
    try {
      if (!placemark.Point || !placemark.Point.coordinates) {
        return null
      }
      
      const coordinates = placemark.Point.coordinates.trim()
      const [lng, lat, altitude] = coordinates.split(',').map(coord => parseFloat(coord.trim()))
      
      if (isNaN(lng) || isNaN(lat)) {
        return null
      }
      
      return {
        name: placemark.name || '',
        description: placemark.description || '',
        longitude: lng,
        latitude: lat,
        altitude: altitude || 0,
        coordinates
      }
    } catch (error) {
      Logger.warn('解析地标点失败', error)
      return null
    }
  }
  
  /**
   * 在点位数据中搜索匹配的项
   * @param {Array} points - 点位数组
   * @param {string} keyword - 搜索关键词
   * @param {string} sourceFile - 来源文件路径
   * @returns {Array} 匹配的点位
   */
  static searchPointsInFile(points, keyword, sourceFile) {
    const results = []
    
    for (const point of points) {
      const name = (point.name || '').toLowerCase()
      const description = (point.description || '').toLowerCase()
      
      // 模糊匹配 name 和 description 字段
      if (name.includes(keyword) || description.includes(keyword)) {
        results.push({
          id: `${path.basename(sourceFile)}_${point.name}_${point.latitude}_${point.longitude}`,
          name: point.name,
          description: point.description,
          latitude: point.latitude,
          longitude: point.longitude,
          altitude: point.altitude,
          coordinates: point.coordinates,
          sourceFile: path.basename(sourceFile),
          sourceFilePath: sourceFile,
          // 标记匹配的字段，用于前端高亮显示
          matchedFields: {
            name: name.includes(keyword),
            description: description.includes(keyword)
          }
        })
      }
    }
    
    return results
  }
  
  /**
   * 获取所有KML文件中的点位（不搜索，返回全部）
   * @param {Array<string>} kmlFiles - KML文件路径数组
   * @returns {Promise<Array>} 所有点位数据
   */
  static async getAllKMLPoints(kmlFiles = []) {
    try {
      const filesToParse = kmlFiles.length > 0 ? kmlFiles : await this.getDefaultKMLFiles()
      const allPoints = []
      
      for (const kmlFile of filesToParse) {
        const points = await this.parseKMLFile(kmlFile)
        for (const point of points) {
          allPoints.push({
            id: `${path.basename(kmlFile)}_${point.name}_${point.latitude}_${point.longitude}`,
            name: point.name,
            description: point.description,
            latitude: point.latitude,
            longitude: point.longitude,
            altitude: point.altitude,
            coordinates: point.coordinates,
            sourceFile: path.basename(kmlFile),
            sourceFilePath: kmlFile
          })
        }
      }
      
      Logger.debug('获取所有KML点位完成', { 
        fileCount: filesToParse.length,
        totalPoints: allPoints.length 
      })
      
      return allPoints
    } catch (error) {
      Logger.error('获取所有KML点位失败', error)
      throw new Error(`获取所有KML点位失败: ${error.message}`)
    }
  }
}

module.exports = KMLSearchService
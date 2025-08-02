const xml2js = require('xml2js')
const fs = require('fs').promises

class KmlParserService {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    })
  }

  // 解析KML文件
  async parseKmlFile(filePath) {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf8')
      const result = await this.parser.parseStringPromise(xmlContent)
      
      return this.extractPlacemarks(result)
    } catch (error) {
      console.error('解析KML文件失败:', error)
      throw new Error('KML文件格式错误或无法读取')
    }
  }

  // 解析KML字符串内容
  async parseKmlString(xmlContent) {
    try {
      const result = await this.parser.parseStringPromise(xmlContent)
      return this.extractPlacemarks(result)
    } catch (error) {
      console.error('解析KML字符串失败:', error)
      throw new Error('KML内容格式错误')
    }
  }

  // 提取地标信息
  extractPlacemarks(kmlData) {
    const placemarks = []
    
    try {
      // 获取Document或根节点
      const document = kmlData.kml?.Document || kmlData.kml
      if (!document) {
        throw new Error('无效的KML结构')
      }

      // 处理Placemark数组或单个Placemark
      const placemarkData = document.Placemark
      if (!placemarkData) {
        return placemarks
      }

      const placemarkArray = Array.isArray(placemarkData) ? placemarkData : [placemarkData]

      for (const placemark of placemarkArray) {
        const extractedPlacemark = this.extractPlacemark(placemark)
        if (extractedPlacemark) {
          placemarks.push(extractedPlacemark)
        }
      }

      return placemarks
    } catch (error) {
      console.error('提取地标信息失败:', error)
      throw error
    }
  }

  // 提取单个地标
  extractPlacemark(placemark) {
    try {
      const name = placemark.name || placemark.n || '未命名地标'
      const description = placemark.description || ''
      
      // 提取样式信息
      const styleData = this.extractStyleData(placemark)
      
      // 提取几何信息
      const geometry = this.extractGeometry(placemark)
      if (!geometry) {
        console.warn('地标缺少几何信息:', name)
        return null
      }

      return {
        name,
        description,
        ...geometry,
        styleData
      }
    } catch (error) {
      console.error('提取地标失败:', error)
      return null
    }
  }

  // 提取几何信息
  extractGeometry(placemark) {
    try {
      // 检查Point
      if (placemark.Point) {
        const coordinates = this.parseCoordinates(placemark.Point.coordinates)
        if (coordinates.length > 0) {
          const [longitude, latitude, altitude = 0] = coordinates[0]
          return {
            pointType: 'Point',
            latitude,
            longitude,
            altitude,
            coordinates: { points: coordinates }
          }
        }
      }

      // 检查LineString
      if (placemark.LineString) {
        const coordinates = this.parseCoordinates(placemark.LineString.coordinates)
        if (coordinates.length > 0) {
          // 使用第一个点作为代表坐标
          const [longitude, latitude, altitude = 0] = coordinates[0]
          return {
            pointType: 'LineString',
            latitude,
            longitude,
            altitude,
            coordinates: { points: coordinates }
          }
        }
      }

      // 检查Polygon
      if (placemark.Polygon) {
        const outerBoundary = placemark.Polygon.outerBoundaryIs?.LinearRing?.coordinates ||
                             placemark.Polygon.outerBoundaryIs?.coordinates
        
        if (outerBoundary) {
          const coordinates = this.parseCoordinates(outerBoundary)
          if (coordinates.length > 0) {
            // 计算多边形中心点作为代表坐标
            const center = this.calculatePolygonCenter(coordinates)
            return {
              pointType: 'Polygon',
              latitude: center.latitude,
              longitude: center.longitude,
              altitude: center.altitude,
              coordinates: { 
                outer: coordinates,
                inner: this.extractInnerBoundaries(placemark.Polygon)
              }
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('提取几何信息失败:', error)
      return null
    }
  }

  // 解析坐标字符串
  parseCoordinates(coordinateString) {
    try {
      if (!coordinateString) return []
      
      const coordStr = coordinateString.trim()
      const points = coordStr.split(/\s+/)
      
      return points.map(point => {
        const coords = point.split(',').map(Number)
        return coords.length >= 2 ? coords : null
      }).filter(Boolean)
    } catch (error) {
      console.error('解析坐标失败:', error)
      return []
    }
  }

  // 计算多边形中心点
  calculatePolygonCenter(coordinates) {
    try {
      if (coordinates.length === 0) {
        return { latitude: 0, longitude: 0, altitude: 0 }
      }

      let totalLat = 0
      let totalLng = 0
      let totalAlt = 0
      let count = 0

      for (const coord of coordinates) {
        if (coord.length >= 2) {
          totalLng += coord[0]
          totalLat += coord[1]
          totalAlt += coord[2] || 0
          count++
        }
      }

      return {
        longitude: count > 0 ? totalLng / count : 0,
        latitude: count > 0 ? totalLat / count : 0,
        altitude: count > 0 ? totalAlt / count : 0
      }
    } catch (error) {
      console.error('计算多边形中心点失败:', error)
      return { latitude: 0, longitude: 0, altitude: 0 }
    }
  }

  // 提取内边界
  extractInnerBoundaries(polygon) {
    try {
      const innerBoundaries = []
      const innerBoundaryIs = polygon.innerBoundaryIs
      
      if (innerBoundaryIs) {
        const innerArray = Array.isArray(innerBoundaryIs) ? innerBoundaryIs : [innerBoundaryIs]
        
        for (const inner of innerArray) {
          const coordinates = this.parseCoordinates(inner.LinearRing?.coordinates)
          if (coordinates.length > 0) {
            innerBoundaries.push(coordinates)
          }
        }
      }
      
      return innerBoundaries
    } catch (error) {
      console.error('提取内边界失败:', error)
      return []
    }
  }

  // 提取样式数据
  extractStyleData(placemark) {
    try {
      const styleData = {}
      
      // 从ExtendedData提取样式信息
      if (placemark.ExtendedData?.Data) {
        const dataArray = Array.isArray(placemark.ExtendedData.Data) 
          ? placemark.ExtendedData.Data 
          : [placemark.ExtendedData.Data]
        
        for (const data of dataArray) {
          if (data.name && data.value) {
            styleData[data.name] = data.value
          }
        }
      }

      // 提取styleUrl
      if (placemark.styleUrl) {
        styleData.styleUrl = placemark.styleUrl
      }

      return styleData
    } catch (error) {
      console.error('提取样式数据失败:', error)
      return {}
    }
  }

  // 验证KML文件格式
  async validateKmlFile(filePath) {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf8')
      return this.validateKmlString(xmlContent)
    } catch (error) {
      return {
        valid: false,
        error: '无法读取文件: ' + error.message
      }
    }
  }

  // 验证KML字符串格式
  async validateKmlString(xmlContent) {
    try {
      const result = await this.parser.parseStringPromise(xmlContent)
      
      if (!result.kml) {
        return {
          valid: false,
          error: '不是有效的KML文件格式'
        }
      }

      const placemarks = this.extractPlacemarks(result)
      
      return {
        valid: true,
        placemarkCount: placemarks.length,
        placemarks: placemarks.slice(0, 5) // 返回前5个地标作为预览
      }
    } catch (error) {
      return {
        valid: false,
        error: 'KML格式错误: ' + error.message
      }
    }
  }
}

module.exports = new KmlParserService()
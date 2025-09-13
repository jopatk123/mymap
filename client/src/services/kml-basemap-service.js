/**
 * KML底图服务
 * 负责KML底图文件的管理和点位数据的处理
 */
export class KMLBaseMapService {
  constructor() {
  this.baseUrl = '/api/kml-basemap'
  }

  /**
   * 上传KML底图文件
   * @param {File} file KML文件
   * @returns {Promise<Object>} 上传结果
   */
  async uploadKMLFile(file, options = {}) {
    const formData = new FormData()
    // backend expects field name 'file'
    formData.append('file', file)
    if (options.isBasemap) {
      // send as string flag; backend will coerce
      formData.append('isBasemap', '1')
    }
    if (options.title) {
      formData.append('title', options.title)
    }
    if (options.description) {
      formData.append('description', options.description)
    }
    if (options.folderId !== undefined && options.folderId !== null) {
      formData.append('folderId', options.folderId)
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    })
    
      if (!response.ok) {
        // try to extract server response for better diagnostics
        let bodyText = null
        try {
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const j = await response.json()
            bodyText = JSON.stringify(j)
          } else {
            bodyText = await response.text()
          }
        } catch (e) {
          bodyText = `<unable to read response body: ${e.message}>`
        }

        throw new Error(`KML文件上传失败: HTTP ${response.status} ${response.statusText} - ${bodyText}`)
    }

  const json = await response.json()
  if (json && json.success) return json.data || json
  throw new Error(json?.message || 'KML文件上传失败')
  }

  /**
   * 获取KML底图列表
   * @returns {Promise<Array>} KML文件列表
   */
  async getKMLFiles() {
  // 仅获取底图文件，调用 /files 列表端点，添加时间戳避免缓存
  const url = `${this.baseUrl}/files?basemapOnly=true&_t=${Date.now()}`
    let response
    try {
      response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
    } catch (e) {
      throw new Error('获取KML文件列表失败: 网络错误')
    }

    // 处理 304 (Not Modified) — 返回缓存内容（如果有）
    if (response.status === 304) {
      return this._cachedFiles || []
    }

    if (!response.ok) {
      throw new Error('获取KML文件列表失败')
    }

    let json = null
    try {
      json = await response.json()
    } catch (e) {
      // 空响应体或解析失败，回退缓存
      return this._cachedFiles || []
    }

    let files = []
    if (json && Array.isArray(json.data)) files = json.data
    else if (Array.isArray(json)) files = json

    // 缓存结果以应对 304 或解析失败情况
    this._cachedFiles = files
    return files
  }

  /**
   * 删除KML底图文件
   * @param {string} fileId 文件ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteKMLFile(fileId) {
    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error('删除KML文件失败')
    }
  const json = await response.json()
  if (json && json.success) return json
  throw new Error(json?.message || '删除KML文件失败')
  }

  /**
   * 获取KML文件的点位数据
   * @param {string} fileId 文件ID
   * @returns {Promise<Array>} 点位数据列表
   */
  async getKMLPoints(fileId) {
    const response = await fetch(`${this.baseUrl}/${fileId}/points`)
    if (!response.ok) {
      throw new Error('获取KML点位数据失败')
    }

    const json = await response.json()
    if (json && Array.isArray(json.data)) return json.data
    if (Array.isArray(json)) return json
    return []
  }

  /**
   * 解析KML文件内容
   * @param {string} kmlContent KML文件内容
   * @returns {Array} 解析后的点位数据
   */
  parseKMLContent(kmlContent) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(kmlContent, 'text/xml')
    const placemarks = doc.querySelectorAll('Placemark')
    
    const points = []
    
    placemarks.forEach(placemark => {
      const name = placemark.querySelector('name')?.textContent || ''
      const description = placemark.querySelector('description')?.textContent || ''
      const coordinates = placemark.querySelector('coordinates')?.textContent?.trim()
      
      if (coordinates) {
        const [lng, lat, alt] = coordinates.split(',').map(Number)
        if (!isNaN(lng) && !isNaN(lat)) {
          points.push({
            id: crypto.randomUUID(),
            name,
            description,
            latitude: lat,
            longitude: lng,
            altitude: alt || 0,
            visible: false // 默认不显示
          })
        }
      }
    })
    
    return points
  }

  /**
   * 生成KML文件内容
   * @param {Array} points 点位数据
   * @param {string} title 文件标题
   * @returns {string} KML文件内容
   */
  generateKMLContent(points, title = '导出的KML文件') {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
<Document>
<name>${title}</name>`

    const placemarks = points.map(point => `
<Placemark>
  <name>${point.name}</name>
  <description>${point.description}</description>
  <Point>
    <coordinates>${point.longitude},${point.latitude},${point.altitude || 0}</coordinates>
  </Point>
</Placemark>`).join('')

    const kmlFooter = `
</Document>
</kml>`

    return kmlHeader + placemarks + kmlFooter
  }
}

export const kmlBaseMapService = new KMLBaseMapService()

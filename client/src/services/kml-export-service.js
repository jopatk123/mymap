/**
 * KML数据导出服务
 * 负责将选中的KML点位数据导出为各种格式
 */
export class KMLExportService {
  
  /**
   * 导出点位数据为CSV格式
   * @param {Array} points 点位数据数组
   * @param {string} filename 文件名（不含扩展名）
   * @returns {Promise<void>}
   */
  async exportToCSV(points, filename = 'kml_points') {
    if (!points || points.length === 0) {
      throw new Error('没有可导出的点位数据')
    }

    // CSV头部
    const headers = ['序号', '名称', '描述', '纬度', '经度', '海拔']
    
    // 构建CSV内容
    const csvRows = [
      headers.join(','), // 头部行
      ...points.map((point, index) => [
        index + 1,
        `"${this.escapeCsvValue(point.name || '')}"`,
        `"${this.escapeCsvValue(point.description || '')}"`,
        point.latitude || '',
        point.longitude || '',
        point.altitude || 0
      ].join(','))
    ]
    
  // Use CRLF for better compatibility with Excel on Windows
  const csvContent = csvRows.join('\r\n')
  this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8')
  }

  /**
   * 导出点位数据为KML格式
   * @param {Array} points 点位数据数组
   * @param {string} filename 文件名（不含扩展名）
   * @param {string} title KML文档标题
   * @returns {Promise<void>}
   */
  async exportToKML(points, filename = 'exported_points', title = '导出的点位数据') {
    if (!points || points.length === 0) {
      throw new Error('没有可导出的点位数据')
    }

  const kmlContent = this.generateKMLContent(points, title)
  // include charset so consumers know the encoding
  this.downloadFile(kmlContent, `${filename}.kml`, 'application/vnd.google-earth.kml+xml;charset=utf-8')
  }

  /**
   * 导出点位数据为JSON格式
   * @param {Array} points 点位数据数组
   * @param {string} filename 文件名（不含扩展名）
   * @returns {Promise<void>}
   */
  async exportToJSON(points, filename = 'kml_points') {
    if (!points || points.length === 0) {
      throw new Error('没有可导出的点位数据')
    }

    const exportData = {
      exportTime: new Date().toISOString(),
      totalCount: points.length,
      points: points.map(point => ({
        name: point.name,
        description: point.description,
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: point.altitude || 0
      }))
    }

  const jsonContent = JSON.stringify(exportData, null, 2)
  this.downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8')
  }

  /**
   * 生成KML文件内容
   * @param {Array} points 点位数据
   * @param {string} title 文件标题
   * @returns {string} KML文件内容
   */
  generateKMLContent(points, title) {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
<Document>
<name>${this.escapeXML(title)}</name>
<description>导出时间: ${new Date().toLocaleString()}</description>`

    const placemarks = points.map(point => `
<Placemark>
  <name>${this.escapeXML(point.name || '')}</name>
  <description>${this.escapeXML(point.description || '')}</description>
  <Point>
    <coordinates>${point.longitude || 0},${point.latitude || 0},${point.altitude || 0}</coordinates>
  </Point>
</Placemark>`).join('')

    const kmlFooter = `
</Document>
</kml>`

    return kmlHeader + placemarks + kmlFooter
  }

  /**
   * 转义CSV值中的特殊字符
   * @param {string} value 原始值
   * @returns {string} 转义后的值
   */
  escapeCsvValue(value) {
    if (typeof value !== 'string') return value
    // 转义双引号
    return value.replace(/"/g, '""')
  }

  /**
   * 转义XML中的特殊字符
   * @param {string} value 原始值
   * @returns {string} 转义后的值
   */
  escapeXML(value) {
    if (typeof value !== 'string') return value
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * 下载文件到本地
   * @param {string} content 文件内容
   * @param {string} filename 文件名
   * @param {string} mimeType MIME类型
   */
  downloadFile(content, filename, mimeType) {
    // 添加BOM以确保Excel正确显示中文
    const BOM = mimeType.includes('csv') ? '\uFEFF' : ''
    const blob = new Blob([BOM + content], { type: mimeType })
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // Sanitize filename to avoid invalid characters
    link.download = this.sanitizeFilename(filename)
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理URL对象；延迟 revoke 可提高兼容性
    setTimeout(() => {
      try { window.URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
    }, 500)
  }

  /**
   * 清理并限制下载文件名，去除文件系统/URI 中不允许的字符
   * @param {string} filename 原始文件名
   * @returns {string} 清理后的文件名
   */
  sanitizeFilename(filename) {
    if (typeof filename !== 'string' || filename.trim() === '') return 'download'
    // 移除控制字符、/ \ ? % * : | " < > 等并保留点和下划线
    const cleaned = filename.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    // 限制长度（保守处理，保留扩展名）
    if (cleaned.length <= 200) return cleaned
    const parts = cleaned.split('.')
    if (parts.length > 1) {
      const ext = parts.pop()
      const base = parts.join('.')
      return base.slice(0, 180) + '.' + ext
    }
    return cleaned.slice(0, 200)
  }

  /**
   * 统计导出数据
   * @param {Array} points 点位数据
   * @returns {Object} 统计信息
   */
  getExportStatistics(points) {
    if (!points || points.length === 0) {
      return {
        totalCount: 0,
        hasName: 0,
        hasDescription: 0,
        hasAltitude: 0
      }
    }

    return {
      totalCount: points.length,
      hasName: points.filter(p => p.name && p.name.trim()).length,
      hasDescription: points.filter(p => p.description && p.description.trim()).length,
      hasAltitude: points.filter(p => p.altitude && p.altitude !== 0).length
    }
  }
}

export const kmlExportService = new KMLExportService()

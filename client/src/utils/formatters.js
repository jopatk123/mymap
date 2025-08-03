// 前端格式化工具
export class Formatters {
  // 格式化文件大小
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // 格式化日期
  static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!date) return ''
    
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
  }
  
  // 格式化距离
  static formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}米`
    } else {
      return `${(meters / 1000).toFixed(1)}公里`
    }
  }
  
  // 格式化坐标
  static formatCoordinate(lat, lng, precision = 6) {
    if (lat === null || lng === null || lat === undefined || lng === undefined) {
      return ''
    }
    
    return `${parseFloat(lat).toFixed(precision)}, ${parseFloat(lng).toFixed(precision)}`
  }
  
  // 截断文本
  static truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  // 格式化数字
  static formatNumber(num, precision = 0) {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return Number(num).toFixed(precision)
  }
}
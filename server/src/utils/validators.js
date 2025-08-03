const { COORDINATE_BOUNDS } = require('../constants/coordinates')

class Validators {
  // 验证坐标
  static validateCoordinate(lat, lng) {
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, message: '坐标必须为数字' }
    }
    
    if (latitude < COORDINATE_BOUNDS.LATITUDE.MIN || latitude > COORDINATE_BOUNDS.LATITUDE.MAX) {
      return { valid: false, message: `纬度必须在 ${COORDINATE_BOUNDS.LATITUDE.MIN} 到 ${COORDINATE_BOUNDS.LATITUDE.MAX} 之间` }
    }
    
    if (longitude < COORDINATE_BOUNDS.LONGITUDE.MIN || longitude > COORDINATE_BOUNDS.LONGITUDE.MAX) {
      return { valid: false, message: `经度必须在 ${COORDINATE_BOUNDS.LONGITUDE.MIN} 到 ${COORDINATE_BOUNDS.LONGITUDE.MAX} 之间` }
    }
    
    return { valid: true, latitude, longitude }
  }
  
  // 验证分页参数
  static validatePagination(page, pageSize, maxPageSize = 100) {
    const pageNum = parseInt(page) || 1
    const size = parseInt(pageSize) || 20
    
    return {
      page: Math.max(1, pageNum),
      pageSize: Math.min(Math.max(1, size), maxPageSize)
    }
  }
  
  // 验证排序参数
  static validateSort(sortBy, sortOrder, allowedFields) {
    const field = allowedFields.includes(sortBy) ? sortBy : allowedFields[0]
    const order = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    return { sortBy: field, sortOrder: order }
  }
  
  // 验证搜索半径
  static validateRadius(radius, min = 100, max = 50000) {
    const r = parseFloat(radius)
    if (isNaN(r)) return null
    
    return Math.min(Math.max(r, min), max)
  }
  
  // 验证ID数组
  static validateIds(ids) {
    if (!Array.isArray(ids)) return []
    
    return ids
      .map(id => parseInt(id))
      .filter(id => !isNaN(id) && id > 0)
  }
  
  // 验证字符串长度
  static validateStringLength(str, maxLength = 255) {
    if (typeof str !== 'string') return ''
    return str.slice(0, maxLength).trim()
  }
}

module.exports = Validators
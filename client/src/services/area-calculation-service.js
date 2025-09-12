/**
 * 区域计算服务
 * 负责地理区域相关的计算功能
 */
export class AreaCalculationService {
  
  /**
   * 判断点是否在圆形区域内
   * @param {Object} point 点位坐标 {latitude, longitude}
   * @param {Object} center 圆心坐标 {latitude, longitude}
   * @param {number} radius 半径（米）
   * @returns {boolean} 是否在圆形区域内
   */
  isPointInCircle(point, center, radius) {
    const distance = this.calculateDistance(
      point.latitude, 
      point.longitude, 
      center.latitude, 
      center.longitude
    )
    return distance <= radius
  }

  /**
   * 判断点是否在多边形区域内
   * @param {Object} point 点位坐标 {latitude, longitude}
   * @param {Array} polygon 多边形顶点数组 [{latitude, longitude}, ...]
   * @returns {boolean} 是否在多边形区域内
   */
  isPointInPolygon(point, polygon) {
    if (polygon.length < 3) return false
    
    const x = point.longitude
    const y = point.latitude
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude
      const yi = polygon[i].latitude
      const xj = polygon[j].longitude
      const yj = polygon[j].latitude
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    
    return inside
  }

  /**
   * 计算两点间距离（使用Haversine公式）
   * @param {number} lat1 第一个点的纬度
   * @param {number} lng1 第一个点的经度
   * @param {number} lat2 第二个点的纬度
   * @param {number} lng2 第二个点的经度
   * @returns {number} 距离（米）
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000 // 地球半径（米）
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * 将角度转换为弧度
   * @param {number} degrees 角度
   * @returns {number} 弧度
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  /**
   * 根据圆心和半径生成圆形路径点
   * @param {Object} center 圆心坐标 {latitude, longitude}
   * @param {number} radius 半径（米）
   * @param {number} segments 分段数，默认64
   * @returns {Array} 圆形路径点数组
   */
  generateCirclePoints(center, radius, segments = 64) {
    const points = []
    const radiusInDegrees = radius / 111320 // 大约的度数转换（在赤道附近）
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      const lat = center.latitude + radiusInDegrees * Math.cos(angle)
      const lng = center.longitude + radiusInDegrees * Math.sin(angle) / Math.cos(this.toRadians(center.latitude))
      
      points.push({ latitude: lat, longitude: lng })
    }
    
    return points
  }

  /**
   * 计算多边形的中心点
   * @param {Array} polygon 多边形顶点数组
   * @returns {Object} 中心点坐标 {latitude, longitude}
   */
  getPolygonCenter(polygon) {
    if (polygon.length === 0) return null
    
    let totalLat = 0
    let totalLng = 0
    
    polygon.forEach(point => {
      totalLat += point.latitude
      totalLng += point.longitude
    })
    
    return {
      latitude: totalLat / polygon.length,
      longitude: totalLng / polygon.length
    }
  }

  /**
   * 计算多边形的面积（平方米）
   * @param {Array} polygon 多边形顶点数组
   * @returns {number} 面积（平方米）
   */
  calculatePolygonArea(polygon) {
    if (polygon.length < 3) return 0
    
    let area = 0
    const radiusSquared = 6371000 * 6371000 // 地球半径的平方
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      const lat1 = this.toRadians(polygon[i].latitude)
      const lat2 = this.toRadians(polygon[j].latitude)
      const lng1 = this.toRadians(polygon[i].longitude)
      const lng2 = this.toRadians(polygon[j].longitude)
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }
    
    area = Math.abs(area * radiusSquared / 2)
    return area
  }
}

export const areaCalculationService = new AreaCalculationService()

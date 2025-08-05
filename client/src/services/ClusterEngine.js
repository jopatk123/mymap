/**
 * 点位聚合引擎
 * 用于处理地图上点位的聚合显示
 */
class ClusterEngine {
  constructor(config = {}) {
    this.radius = config.cluster_radius || config.radius || 50
    this.minPoints = config.cluster_min_points || config.minPoints || 2
    this.maxZoom = config.cluster_max_zoom || config.maxZoom || 16
    this.iconColor = config.cluster_icon_color || config.iconColor || '#409EFF'
    this.textColor = config.cluster_text_color || config.textColor || '#FFFFFF'
    this.enabled = config.cluster_enabled !== undefined ? config.cluster_enabled : config.enabled !== false
  }

  /**
   * 对点位进行聚合
   * @param {Array} points 点位数组
   * @param {number} zoom 当前缩放级别
   * @returns {Array} 聚合后的点位数组
   */
  cluster(points, zoom) {
    // 如果未启用聚合或缩放级别超过最大聚合级别，不进行聚合
    if (!this.enabled || zoom > this.maxZoom) {
      return points.map(point => ({
        ...point,
        isCluster: false,
        clusterSize: 1
      }))
    }

    const clusters = []
    const processed = new Set()

    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue

      const point = points[i]
      const cluster = {
        id: `cluster_${Date.now()}_${i}`,
        latitude: point.latitude || point.lat,
        longitude: point.longitude || point.lng,
        lat: point.latitude || point.lat,
        lng: point.longitude || point.lng,
        isCluster: false,
        points: [point],
        clusterSize: 1,
        type: point.type || 'cluster'
      }

      // 查找半径内的其他点
      for (let j = i + 1; j < points.length; j++) {
        if (processed.has(j)) continue

        const otherPoint = points[j]
        const distance = this.calculatePixelDistance(
          { lat: point.latitude || point.lat, lng: point.longitude || point.lng },
          { lat: otherPoint.latitude || otherPoint.lat, lng: otherPoint.longitude || otherPoint.lng },
          zoom
        )

        if (distance <= this.radius) {
          cluster.points.push(otherPoint)
          cluster.clusterSize++
          processed.add(j)
        }
      }

      // 如果聚合点数达到最小要求，标记为聚合
      if (cluster.clusterSize >= this.minPoints) {
        cluster.isCluster = true
        
        // 计算聚合中心点
        const center = this.calculateClusterCenter(cluster.points)
        cluster.latitude = center.lat
        cluster.longitude = center.lng
        cluster.lat = center.lat
        cluster.lng = center.lng
        
        // 设置聚合样式
        cluster.iconColor = this.iconColor
        cluster.textColor = this.textColor
      } else {
        // 不够聚合条件，保持原点
        cluster.isCluster = false
        cluster.clusterSize = 1
        // 保持原点的所有属性
        Object.assign(cluster, point)
      }

      clusters.push(cluster)
      processed.add(i)
    }

    return clusters
  }

  /**
   * 计算两点间的像素距离
   * @param {Object} point1 第一个点 {lat, lng}
   * @param {Object} point2 第二个点 {lat, lng}
   * @param {number} zoom 缩放级别
   * @returns {number} 像素距离
   */
  calculatePixelDistance(point1, point2, zoom) {
    // 将地理坐标转换为屏幕像素距离
    const scale = Math.pow(2, zoom)
    const lat1Rad = (point1.lat * Math.PI) / 180
    const lat2Rad = (point2.lat * Math.PI) / 180
    const deltaLat = lat2Rad - lat1Rad
    const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180

    const a = 
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = 6371 * c * 1000 // 距离（米）

    // 转换为像素距离（简化计算）
    // 在赤道处，1度经度约等于111320米
    // 在不同缩放级别下，每像素代表的距离不同
    const metersPerPixel = (156412 * Math.cos(lat1Rad)) / scale
    const pixelDistance = distance / metersPerPixel

    return pixelDistance
  }

  /**
   * 计算聚合中心点
   * @param {Array} points 点位数组
   * @returns {Object} 中心点坐标 {lat, lng}
   */
  calculateClusterCenter(points) {
    const totalLat = points.reduce((sum, p) => sum + (p.latitude || p.lat), 0)
    const totalLng = points.reduce((sum, p) => sum + (p.longitude || p.lng), 0)
    
    return {
      lat: totalLat / points.length,
      lng: totalLng / points.length
    }
  }

  /**
   * 更新聚合配置
   * @param {Object} config 新的配置
   */
  updateConfig(config) {
    this.radius = config.cluster_radius || config.radius || this.radius
    this.minPoints = config.cluster_min_points || config.minPoints || this.minPoints
    this.maxZoom = config.cluster_max_zoom || config.maxZoom || this.maxZoom
    this.iconColor = config.cluster_icon_color || config.iconColor || this.iconColor
    this.textColor = config.cluster_text_color || config.textColor || this.textColor
    this.enabled = config.cluster_enabled !== undefined ? config.cluster_enabled : 
                   config.enabled !== undefined ? config.enabled : this.enabled
  }

  /**
   * 获取聚合图标大小
   * @param {number} count 聚合点数
   * @returns {number} 图标大小
   */
  getClusterIconSize(count) {
    if (count < 10) return 30
    if (count < 25) return 40
    if (count < 50) return 50
    return 60
  }
}

export default ClusterEngine
import { defaultStyles } from '@/constants/map.js';

/**
 * 样式渲染引擎
 * 用于将样式配置应用到地图元素上
 */
class StyleRenderer {
  constructor() {
    this.styleCache = new Map()
  }

  /**
   * 渲染线样式
   * @param {Object} line 线数据
   * @param {Object} styleConfig 样式配置
   * @returns {Object} Leaflet样式对象
   */
  renderLineStyle(line, styleConfig) {
    const cacheKey = `line_${JSON.stringify(styleConfig)}`
    
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)
    }

    const style = {
      color: styleConfig.line_color || defaultStyles.line_color,
      weight: styleConfig.line_width || defaultStyles.line_width,
      opacity: styleConfig.line_opacity || defaultStyles.line_opacity,
      lineCap: 'round',
      lineJoin: 'round'
    }

    // 设置线条样式
    switch (styleConfig.line_style) {
      case 'dashed':
        style.dashArray = '10,5'
        break
      case 'dotted':
        style.dashArray = '2,3'
        break
      case 'dash-dot':
        style.dashArray = '10,5,2,5'
        break
      case 'solid':
      default:
        style.dashArray = null
        break
    }

    this.styleCache.set(cacheKey, style)
    return style
  }

  /**
   * 渲染面样式
   * @param {Object} polygon 面数据
   * @param {Object} styleConfig 样式配置
   * @returns {Object} Leaflet样式对象
   */
  renderPolygonStyle(polygon, styleConfig) {
    const cacheKey = `polygon_${JSON.stringify(styleConfig)}`
    
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)
    }

    const style = {
      fillColor: styleConfig.polygon_fill_color || defaultStyles.polygon_fill_color,
      fillOpacity: styleConfig.polygon_fill_opacity || defaultStyles.polygon_fill_opacity,
      color: styleConfig.polygon_stroke_color || defaultStyles.polygon_stroke_color,
      weight: styleConfig.polygon_stroke_width || defaultStyles.polygon_stroke_width,
      opacity: 1
    }

    // 设置边框样式
    switch (styleConfig.polygon_stroke_style) {
      case 'dashed':
        style.dashArray = '8,4'
        break
      case 'dotted':
        style.dashArray = '2,2'
        break
      case 'solid':
      default:
        style.dashArray = null
        break
    }

    this.styleCache.set(cacheKey, style)
    return style
  }

  /**
   * 渲染聚合图标样式
   * @param {Object} cluster 聚合数据
   * @param {Object} styleConfig 样式配置
   * @returns {Object} 聚合图标HTML和样式
   */
  renderClusterStyle(cluster, styleConfig) {
    const count = cluster.clusterSize || cluster.points?.length || 1
    const iconColor = styleConfig.cluster_icon_color || '#409EFF'
    const textColor = styleConfig.cluster_text_color || '#FFFFFF'
    
    // 根据聚合数量确定图标大小
    let size = 30
    if (count >= 10) size = 40
    if (count >= 25) size = 50
    if (count >= 50) size = 60

    const html = `
      <div class="cluster-marker" style="
        background-color: ${iconColor};
        color: ${textColor};
        width: ${size}px;
        height: ${size}px;
        line-height: ${size}px;
        border-radius: 50%;
        text-align: center;
        font-weight: bold;
        font-size: ${Math.min(size / 3, 16)}px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${count}
      </div>
    `

    return {
      html,
      className: 'cluster-marker-container',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    }
  }

  /**
   * 清除样式缓存
   */
  clearCache() {
    this.styleCache.clear()
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      size: this.styleCache.size,
      keys: Array.from(this.styleCache.keys())
    }
  }
}

export default StyleRenderer
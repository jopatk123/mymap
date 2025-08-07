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
   * 渲染点样式
   * @param {Object} point 点数据
   * @param {Object} styleConfig 样式配置
   * @returns {Object} 点样式配置
   */
  renderPointStyle(point, styleConfig) {
    const cacheKey = `point_${JSON.stringify(styleConfig)}`
    
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)
    }

    const pointSize = styleConfig.point_size || defaultStyles.point_size
    const pointColor = styleConfig.point_color || defaultStyles.point_color
    const pointOpacity = styleConfig.point_opacity || defaultStyles.point_opacity
    const iconType = styleConfig.point_icon_type || 'circle'

    const style = {
      size: pointSize,
      color: pointColor,
      opacity: pointOpacity,
      iconType: iconType
    }

    this.styleCache.set(cacheKey, style)
    return style
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
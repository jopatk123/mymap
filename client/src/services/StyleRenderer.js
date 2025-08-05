/**
 * 样式渲染引擎
 * 用于将样式配置应用到地图元素上
 */
class StyleRenderer {
  constructor() {
    this.styleCache = new Map()
  }

  /**
   * 渲染点样式
   * @param {Object} point 点位数据
   * @param {Object} styleConfig 样式配置
   * @returns {Object} Leaflet样式对象
   */
  renderPointStyle(point, styleConfig) {
    const cacheKey = `point_${JSON.stringify(styleConfig)}`
    
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)
    }

    const style = {
      color: styleConfig.point_color || '#ff7800',
      fillColor: styleConfig.point_color || '#ff7800',
      fillOpacity: styleConfig.point_opacity || 1.0,
      weight: 2,
      opacity: styleConfig.point_opacity || 1.0,
      radius: styleConfig.point_size || 8
    }

    // 根据图标类型调整样式
    switch (styleConfig.point_icon_type) {
      case 'circle':
        style.radius = styleConfig.point_size || 8
        break
      case 'square':
        style.radius = styleConfig.point_size || 8
        style.className = 'square-marker'
        break
      case 'triangle':
        style.radius = styleConfig.point_size || 8
        style.className = 'triangle-marker'
        break
      case 'diamond':
        style.radius = styleConfig.point_size || 8
        style.className = 'diamond-marker'
        break
      case 'marker':
        style.radius = styleConfig.point_size || 8
        style.className = 'marker-style'
        break
    }

    this.styleCache.set(cacheKey, style)
    return style
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
      color: styleConfig.line_color || '#ff7800',
      weight: styleConfig.line_width || 2,
      opacity: styleConfig.line_opacity || 0.8,
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
      fillColor: styleConfig.polygon_fill_color || '#ff7800',
      fillOpacity: styleConfig.polygon_fill_opacity || 0.3,
      color: styleConfig.polygon_stroke_color || '#ff7800',
      weight: styleConfig.polygon_stroke_width || 2,
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
   * 生成标签样式
   * @param {Object} styleConfig 样式配置
   * @returns {Object} 标签样式
   */
  renderLabelStyle(styleConfig) {
    return {
      fontSize: `${styleConfig.point_label_size || 12}px`,
      color: styleConfig.point_label_color || '#000000',
      fontWeight: '500',
      textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
      padding: '2px 4px',
      borderRadius: '3px',
      backgroundColor: 'rgba(255,255,255,0.8)',
      border: '1px solid rgba(0,0,0,0.1)'
    }
  }

  /**
   * 创建自定义CSS样式
   * @param {Object} styleConfig 样式配置
   * @returns {string} CSS样式字符串
   */
  generateCustomCSS(styleConfig) {
    return `
      .square-marker {
        border-radius: 0 !important;
      }
      
      .triangle-marker {
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        border-radius: 0 !important;
      }
      
      .diamond-marker {
        transform: rotate(45deg);
        border-radius: 0 !important;
      }
      
      .marker-style {
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
      }
      
      .cluster-marker-container {
        background: transparent !important;
        border: none !important;
      }
      
      .kml-point-label {
        font-size: ${styleConfig.point_label_size || 12}px;
        color: ${styleConfig.point_label_color || '#000000'};
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
        padding: 2px 4px;
        border-radius: 3px;
        background-color: rgba(255,255,255,0.8);
        border: 1px solid rgba(0,0,0,0.1);
        white-space: nowrap;
      }
    `
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
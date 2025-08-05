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
    const cacheKey = `point_${point.properties.name}_${JSON.stringify(styleConfig)}`;
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey);
    }

    const showLabel = styleConfig.point_label_size && styleConfig.point_label_size > 0;

    // 如果不显示标签，使用简单的圆形标记以提高性能
    if (!showLabel) {
      const simpleStyle = {
        renderer: L.canvas(), // 强制使用Canvas渲染器
        color: styleConfig.point_color || '#ff7800',
        fillColor: styleConfig.point_color || '#ff7800',
        fillOpacity: styleConfig.point_opacity || 1.0,
        weight: 1,
        radius: styleConfig.point_size || 8,
      };
      this.styleCache.set(cacheKey, simpleStyle);
      return simpleStyle;
    }

    // 如果显示标签，则创建自定义的DivIcon
    const pointSize = styleConfig.point_size || 8;
    const labelSize = styleConfig.point_label_size || 12;
    const pointColor = styleConfig.point_color || '#ff7800';
    const labelColor = styleConfig.point_label_color || '#000000';
    const pointOpacity = styleConfig.point_opacity || 1.0;

    const iconHtml = `
      <div class="kml-point-marker-container">
        <div class="kml-point-marker" style="
          width: ${pointSize * 2}px;
          height: ${pointSize * 2}px;
          background-color: ${pointColor};
          opacity: ${pointOpacity};
          border-radius: 50%;
        "></div>
        <div class="kml-point-label" style="
          font-size: ${labelSize}px;
          color: ${labelColor};
          transform: translate(-50%, ${pointSize}px);
        ">
          ${point.name}
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'kml-point-icon',
      iconSize: [pointSize * 2, pointSize * 2 + labelSize + 5],
      iconAnchor: [pointSize, pointSize],
    });
    
    this.styleCache.set(cacheKey, { icon });
    return { icon };
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
    // Base styles for custom point markers with labels
    return `
      .kml-point-icon {
        background: transparent !important;
        border: none !important;
      }
      .kml-point-marker-container {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .kml-point-marker {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      .kml-point-label {
        position: absolute;
        left: 50%;
        top: 100%;
        transform: translateX(-50%);
        margin-top: 2px;
        padding: 2px 5px;
        background-color: rgba(255, 255, 255, 0.75);
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        white-space: nowrap;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
      }
      .cluster-marker-container {
        background: transparent !important;
        border: none !important;
      }
    `;
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
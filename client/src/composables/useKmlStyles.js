import { ref, reactive } from 'vue'
import { kmlApi } from '@/api/kml.js'
import StyleRenderer from '@/services/StyleRenderer.js'

export function useKmlStyles() {
  const styleRenderer = new StyleRenderer()
  const kmlStyles = ref(new Map()) // kmlFileId -> styleConfig
  const loading = ref(false)

  /**
   * 加载KML文件的样式配置
   * @param {number} kmlFileId KML文件ID
   * @returns {Object} 样式配置
   */
  const loadKmlFileStyles = async (kmlFileId) => {
    try {
      loading.value = true
      const response = await kmlApi.getKmlFileStyles(kmlFileId)
      const styles = response.data
      
      kmlStyles.value.set(kmlFileId, styles)
      return styles
    } catch (error) {
      console.error(`加载KML文件 ${kmlFileId} 样式失败:`, error)
      // 返回默认样式
      const defaultStyles = getDefaultStyles()
      kmlStyles.value.set(kmlFileId, defaultStyles)
      return defaultStyles
    } finally {
      loading.value = false
    }
  }

  /**
   * 批量加载多个KML文件的样式配置
   * @param {Array} kmlFileIds KML文件ID数组
   * @returns {Map} 样式配置映射
   */
  const loadMultipleKmlFileStyles = async (kmlFileIds) => {
    try {
      loading.value = true
      const promises = kmlFileIds.map(id => loadKmlFileStyles(id))
      await Promise.all(promises)
      return kmlStyles.value
    } catch (error) {
      console.error('批量加载KML文件样式失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新KML文件样式配置
   * @param {number} kmlFileId KML文件ID
   * @param {Object} styleConfig 样式配置
   * @returns {Object} 更新后的样式配置
   */
  const updateKmlFileStyles = async (kmlFileId, styleConfig) => {
    try {
      loading.value = true
      const response = await kmlApi.updateKmlFileStyles(kmlFileId, styleConfig)
      const updatedStyles = response.data
      
      kmlStyles.value.set(kmlFileId, updatedStyles)
      
      // 清除样式缓存，强制重新渲染
      styleRenderer.clearCache()
      
      return updatedStyles
    } catch (error) {
      console.error(`更新KML文件 ${kmlFileId} 样式失败:`, error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置KML文件样式为默认
   * @param {number} kmlFileId KML文件ID
   * @returns {Object} 默认样式配置
   */
  const resetKmlFileStyles = async (kmlFileId) => {
    try {
      loading.value = true
      const response = await kmlApi.resetKmlFileStyles(kmlFileId)
      const defaultStyles = response.data
      
      kmlStyles.value.set(kmlFileId, defaultStyles)
      
      // 清除样式缓存
      styleRenderer.clearCache()
      
      return defaultStyles
    } catch (error) {
      console.error(`重置KML文件 ${kmlFileId} 样式失败:`, error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取KML文件的样式配置
   * @param {number} kmlFileId KML文件ID
   * @returns {Object} 样式配置
   */
  const getKmlFileStyles = (kmlFileId) => {
    return kmlStyles.value.get(kmlFileId) || getDefaultStyles()
  }

  /**
   * 渲染点位样式
   * @param {Object} point 点位数据
   * @param {number} kmlFileId KML文件ID
   * @returns {Object} Leaflet样式对象
   */
  const renderPointStyle = (point, kmlFileId) => {
    const styleConfig = getKmlFileStyles(kmlFileId)
    return styleRenderer.renderPointStyle(point, styleConfig)
  }

  /**
   * 渲染线条样式
   * @param {Object} line 线条数据
   * @param {number} kmlFileId KML文件ID
   * @returns {Object} Leaflet样式对象
   */
  const renderLineStyle = (line, kmlFileId) => {
    const styleConfig = getKmlFileStyles(kmlFileId)
    return styleRenderer.renderLineStyle(line, styleConfig)
  }

  /**
   * 渲染面样式
   * @param {Object} polygon 面数据
   * @param {number} kmlFileId KML文件ID
   * @returns {Object} Leaflet样式对象
   */
  const renderPolygonStyle = (polygon, kmlFileId) => {
    const styleConfig = getKmlFileStyles(kmlFileId)
    return styleRenderer.renderPolygonStyle(polygon, styleConfig)
  }


  /**
   * 生成自定义CSS样式
   * @param {number} kmlFileId KML文件ID
   * @returns {string} CSS样式字符串
   */
  const generateCustomCSS = (kmlFileId) => {
    const styleConfig = getKmlFileStyles(kmlFileId)
    return styleRenderer.generateCustomCSS(styleConfig)
  }

  /**
   * 获取默认样式配置
   * @returns {Object} 默认样式配置
   */
  const getDefaultStyles = () => {
    return {
      // 点样式配置
      point_color: '#ff7800',
      point_size: 8,
      point_opacity: 1.0,
      point_label_size: 12,
      point_label_color: '#000000',
      
      // 线样式配置
      line_color: '#ff7800',
      line_width: 2,
      line_opacity: 0.8,
      line_style: 'solid',
      
      // 面样式配置
      polygon_fill_color: '#ff7800',
      polygon_fill_opacity: 0.3,
      polygon_stroke_color: '#ff7800',
      polygon_stroke_width: 2,
      polygon_stroke_style: 'solid',
      
    }
  }

  /**
   * 清除所有样式缓存
   */
  const clearStyleCache = () => {
    styleRenderer.clearCache()
    kmlStyles.value.clear()
  }

  /**
   * 获取样式缓存统计信息
   * @returns {Object} 缓存统计
   */
  const getStyleCacheStats = () => {
    return {
      renderer: styleRenderer.getCacheStats(),
      kmlStyles: {
        size: kmlStyles.value.size,
        keys: Array.from(kmlStyles.value.keys())
      }
    }
  }

  return {
    // 状态
    kmlStyles,
    loading,
    
    // 方法
    loadKmlFileStyles,
    loadMultipleKmlFileStyles,
    updateKmlFileStyles,
    resetKmlFileStyles,
    getKmlFileStyles,
    
    // 渲染方法
    renderPointStyle,
    renderLineStyle,
    renderPolygonStyle,
    generateCustomCSS,
    
    // 工具方法
    getDefaultStyles,
    clearStyleCache,
    getStyleCacheStats
  }
}
import { ref, reactive } from 'vue'
import { kmlApi } from '@/api/kml.js'
import ClusterEngine from '@/services/ClusterEngine.js'

export function useClusterManager() {
  const panoramaClusterEngine = ref(null)
  const kmlClusterEngines = ref(new Map()) // kmlFileId -> ClusterEngine
  const panoramaClusterConfig = ref(null)
  const loading = ref(false)

  /**
   * 初始化聚合引擎
   */
  const initClusterEngines = async () => {
    try {
      loading.value = true
      
      // 初始化全景图聚合引擎
      await initPanoramaClusterEngine()
      
      // 初始化KML聚合引擎
      await initKmlClusterEngines()
      
    } catch (error) {
      console.error('初始化聚合引擎失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化全景图聚合引擎
   */
  const initPanoramaClusterEngine = async () => {
    try {
      const response = await kmlApi.getPanoramaClusterConfig()
      const config = response.data
      
      panoramaClusterConfig.value = config
      panoramaClusterEngine.value = new ClusterEngine(config)
      
      console.log('全景图聚合引擎初始化完成:', config)
    } catch (error) {
      console.error('初始化全景图聚合引擎失败:', error)
      // 使用默认配置
      const defaultConfig = {
        cluster_enabled: true,
        cluster_radius: 50,
        cluster_min_points: 2,
        cluster_max_zoom: 16,
        cluster_icon_color: '#67C23A',
        cluster_text_color: '#FFFFFF'
      }
      panoramaClusterConfig.value = defaultConfig
      panoramaClusterEngine.value = new ClusterEngine(defaultConfig)
    }
  }

  /**
   * 初始化KML聚合引擎
   */
  const initKmlClusterEngines = async () => {
    try {
      // 获取所有可见的KML文件
      const response = await kmlApi.getKmlFiles({ includeHidden: false })
      const kmlFiles = response.data.data || []
      
      // 为每个KML文件创建聚合引擎
      for (const kmlFile of kmlFiles) {
        try {
          const styleResponse = await kmlApi.getKmlFileStyles(kmlFile.id)
          const styleConfig = styleResponse.data
          
          if (styleConfig.cluster_enabled) {
            const engine = new ClusterEngine(styleConfig)
            kmlClusterEngines.value.set(kmlFile.id, engine)
            console.log(`KML文件 ${kmlFile.id} 聚合引擎初始化完成`)
          }
        } catch (error) {
          console.warn(`初始化KML文件 ${kmlFile.id} 聚合引擎失败:`, error)
        }
      }
      
      console.log(`KML聚合引擎初始化完成，共 ${kmlClusterEngines.value.size} 个引擎`)
    } catch (error) {
      console.error('初始化KML聚合引擎失败:', error)
    }
  }

  /**
   * 聚合全景图点位
   * @param {Array} panoramas 全景图数组
   * @param {number} zoom 当前缩放级别
   * @returns {Array} 聚合后的全景图数组
   */
  const clusterPanoramas = (panoramas, zoom) => {
    if (!panoramaClusterEngine.value || !Array.isArray(panoramas)) {
      return panoramas || []
    }
    
    try {
      const clustered = panoramaClusterEngine.value.cluster(panoramas, zoom)
      console.log(`全景图聚合完成: ${panoramas.length} -> ${clustered.length}`)
      return clustered
    } catch (error) {
      console.error('全景图聚合失败:', error)
      return panoramas
    }
  }

  /**
   * 聚合KML点位
   * @param {number} kmlFileId KML文件ID
   * @param {Array} points 点位数组
   * @param {number} zoom 当前缩放级别
   * @returns {Array} 聚合后的点位数组
   */
  const clusterKmlPoints = (kmlFileId, points, zoom) => {
    const engine = kmlClusterEngines.value.get(kmlFileId)
    
    if (!engine || !Array.isArray(points)) {
      return points || []
    }
    
    try {
      const clustered = engine.cluster(points, zoom)
      console.log(`KML文件 ${kmlFileId} 聚合完成: ${points.length} -> ${clustered.length}`)
      return clustered
    } catch (error) {
      console.error(`KML文件 ${kmlFileId} 聚合失败:`, error)
      return points
    }
  }

  /**
   * 更新全景图聚合配置
   * @param {Object} config 新的配置
   */
  const updatePanoramaClusterConfig = async (config) => {
    try {
      loading.value = true
      
      const response = await kmlApi.updatePanoramaClusterConfig(config)
      const updatedConfig = response.data
      
      panoramaClusterConfig.value = updatedConfig
      
      if (panoramaClusterEngine.value) {
        panoramaClusterEngine.value.updateConfig(updatedConfig)
      } else {
        panoramaClusterEngine.value = new ClusterEngine(updatedConfig)
      }
      
      console.log('全景图聚合配置更新完成:', updatedConfig)
      return updatedConfig
    } catch (error) {
      console.error('更新全景图聚合配置失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新KML文件聚合配置
   * @param {number} kmlFileId KML文件ID
   * @param {Object} styleConfig 样式配置（包含聚合配置）
   */
  const updateKmlClusterConfig = (kmlFileId, styleConfig) => {
    try {
      if (styleConfig.cluster_enabled) {
        // 创建或更新聚合引擎
        let engine = kmlClusterEngines.value.get(kmlFileId)
        if (engine) {
          engine.updateConfig(styleConfig)
        } else {
          engine = new ClusterEngine(styleConfig)
          kmlClusterEngines.value.set(kmlFileId, engine)
        }
        console.log(`KML文件 ${kmlFileId} 聚合配置更新完成`)
      } else {
        // 禁用聚合，移除引擎
        kmlClusterEngines.value.delete(kmlFileId)
        console.log(`KML文件 ${kmlFileId} 聚合已禁用`)
      }
    } catch (error) {
      console.error(`更新KML文件 ${kmlFileId} 聚合配置失败:`, error)
    }
  }

  /**
   * 获取全景图聚合配置
   * @returns {Object} 全景图聚合配置
   */
  const getPanoramaClusterConfig = () => {
    return panoramaClusterConfig.value
  }

  /**
   * 获取KML文件聚合引擎
   * @param {number} kmlFileId KML文件ID
   * @returns {ClusterEngine|null} 聚合引擎
   */
  const getKmlClusterEngine = (kmlFileId) => {
    return kmlClusterEngines.value.get(kmlFileId) || null
  }

  /**
   * 检查KML文件是否启用聚合
   * @param {number} kmlFileId KML文件ID
   * @returns {boolean} 是否启用聚合
   */
  const isKmlClusterEnabled = (kmlFileId) => {
    const engine = kmlClusterEngines.value.get(kmlFileId)
    return engine ? engine.enabled : false
  }

  /**
   * 检查全景图是否启用聚合
   * @returns {boolean} 是否启用聚合
   */
  const isPanoramaClusterEnabled = () => {
    return panoramaClusterEngine.value ? panoramaClusterEngine.value.enabled : false
  }

  /**
   * 清除所有聚合引擎
   */
  const clearAllEngines = () => {
    panoramaClusterEngine.value = null
    kmlClusterEngines.value.clear()
    panoramaClusterConfig.value = null
    console.log('所有聚合引擎已清除')
  }

  /**
   * 获取聚合引擎统计信息
   * @returns {Object} 统计信息
   */
  const getClusterStats = () => {
    return {
      panoramaEngine: {
        enabled: isPanoramaClusterEnabled(),
        config: panoramaClusterConfig.value
      },
      kmlEngines: {
        count: kmlClusterEngines.value.size,
        engines: Array.from(kmlClusterEngines.value.entries()).map(([id, engine]) => ({
          kmlFileId: id,
          enabled: engine.enabled,
          config: {
            radius: engine.radius,
            minPoints: engine.minPoints,
            maxZoom: engine.maxZoom
          }
        }))
      }
    }
  }

  return {
    // 状态
    panoramaClusterEngine,
    kmlClusterEngines,
    panoramaClusterConfig,
    loading,
    
    // 初始化方法
    initClusterEngines,
    initPanoramaClusterEngine,
    initKmlClusterEngines,
    
    // 聚合方法
    clusterPanoramas,
    clusterKmlPoints,
    
    // 配置更新方法
    updatePanoramaClusterConfig,
    updateKmlClusterConfig,
    
    // 查询方法
    getPanoramaClusterConfig,
    getKmlClusterEngine,
    isKmlClusterEnabled,
    isPanoramaClusterEnabled,
    
    // 工具方法
    clearAllEngines,
    getClusterStats
  }
}
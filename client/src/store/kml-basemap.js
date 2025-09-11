import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { kmlBaseMapService } from '@/services/kml-basemap-service.js'
import { areaCalculationService } from '@/services/area-calculation-service.js'

export const useKMLBaseMapStore = defineStore('kmlBaseMap', () => {
  // 状态
  const kmlFiles = ref([]) // KML底图文件列表
  const kmlPoints = ref([]) // 所有KML点位数据
  const visiblePoints = ref([]) // 当前显示的点位
  const areas = ref([]) // 选择的区域列表
  const loading = ref(false)
  
  // 计算属性
  const totalPointsCount = computed(() => kmlPoints.value.length)
  const visiblePointsCount = computed(() => visiblePoints.value.length)
  const areasCount = computed(() => areas.value.length)
  
  // 获取KML文件列表
  const fetchKMLFiles = async () => {
    try {
      loading.value = true
      const files = await kmlBaseMapService.getKMLFiles()
      if (!Array.isArray(files)) {
        console.error('fetchKMLFiles: expected array, got', files)
        kmlFiles.value = []
        return
      }

      kmlFiles.value = files

      // 加载所有KML文件的点位数据
      await loadAllKMLPoints()
    } catch (error) {
      console.error('获取KML文件失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 加载所有KML点位数据
  const loadAllKMLPoints = async () => {
    try {
      const allPoints = []
      
      for (const file of kmlFiles.value) {
        const points = await kmlBaseMapService.getKMLPoints(file.id)
        allPoints.push(...points.map(point => ({
          ...point,
          sourceFile: file.name,
          fileId: file.id
        })))
      }
      
      kmlPoints.value = allPoints
    } catch (error) {
      console.error('加载KML点位数据失败:', error)
      throw error
    }
  }
  
  // 上传KML文件
  const uploadKMLFile = async (file, options = {}) => {
    try {
      loading.value = true
      const isBasemap = options.isBasemap === true || file?.isBasemap === true
      // forward title/description/folderId from options to backend
      const payloadOptions = {
        isBasemap,
        title: options.title,
        description: options.description,
        folderId: options.folderId
      }
      const result = await kmlBaseMapService.uploadKMLFile(file, payloadOptions)
      
      // 重新获取文件列表
      await fetchKMLFiles()
      
      return result
    } catch (error) {
      console.error('上传KML文件失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 删除KML文件
  const deleteKMLFile = async (fileId) => {
    try {
      loading.value = true
      await kmlBaseMapService.deleteKMLFile(fileId)
      
      // 从状态中移除相关数据
      kmlFiles.value = kmlFiles.value.filter(file => file.id !== fileId)
      kmlPoints.value = kmlPoints.value.filter(point => point.fileId !== fileId)
      updateVisiblePoints()
      
    } catch (error) {
      console.error('删除KML文件失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 添加区域
  const addArea = (area) => {
    areas.value.push({
      id: crypto.randomUUID(),
      ...area,
      createdAt: new Date()
    })
    updateVisiblePoints()
  }
  
  // 添加圆形区域
  const addCircleArea = (center, radius) => {
    addArea({
      type: 'circle',
      center,
      radius,
      name: `圆形区域 (半径: ${radius}m)`
    })
  }
  
  // 添加自定义区域
  const addCustomArea = (polygon, name = '自定义区域') => {
    addArea({
      type: 'polygon',
      polygon,
      name
    })
  }
  
  // 清除所有区域
  const clearAllAreas = () => {
    areas.value = []
    visiblePoints.value = []
  }
  
  // 删除指定区域
  const removeArea = (areaId) => {
    areas.value = areas.value.filter(area => area.id !== areaId)
    updateVisiblePoints()
  }
  
  // 更新可见点位
  const updateVisiblePoints = () => {
    if (areas.value.length === 0) {
      visiblePoints.value = []
      return
    }
    
    const visible = []
    
    for (const point of kmlPoints.value) {
      let isVisible = false
      
      for (const area of areas.value) {
        if (area.type === 'circle') {
          if (areaCalculationService.isPointInCircle(point, area.center, area.radius)) {
            isVisible = true
            break
          }
        } else if (area.type === 'polygon') {
          if (areaCalculationService.isPointInPolygon(point, area.polygon)) {
            isVisible = true
            break
          }
        }
      }
      
      if (isVisible) {
        visible.push({
          ...point,
          visible: true
        })
      }
    }
    
    visiblePoints.value = visible
  }
  
  // 获取区域内的点位
  const getPointsInArea = (areaId) => {
    const area = areas.value.find(a => a.id === areaId)
    if (!area) return []
    
    return kmlPoints.value.filter(point => {
      if (area.type === 'circle') {
        return areaCalculationService.isPointInCircle(point, area.center, area.radius)
      } else if (area.type === 'polygon') {
        return areaCalculationService.isPointInPolygon(point, area.polygon)
      }
      return false
    })
  }
  
  // 切换区域显示状态
  const toggleAreaVisibility = (areaId) => {
    const area = areas.value.find(a => a.id === areaId)
    if (area) {
      area.visible = !area.visible
      updateVisiblePoints()
    }
  }
  
  // 重置状态
  const resetState = () => {
    kmlFiles.value = []
    kmlPoints.value = []
    visiblePoints.value = []
    areas.value = []
    loading.value = false
  }
  
  return {
    // 状态
    kmlFiles,
    kmlPoints,
    visiblePoints,
    areas,
    loading,
    
    // 计算属性
    totalPointsCount,
    visiblePointsCount,
    areasCount,
    
    // 方法
    fetchKMLFiles,
    loadAllKMLPoints,
    uploadKMLFile,
    deleteKMLFile,
    addArea,
    addCircleArea,
    addCustomArea,
    clearAllAreas,
    removeArea,
    updateVisiblePoints,
    getPointsInArea,
    toggleAreaVisibility,
    resetState
  }
})

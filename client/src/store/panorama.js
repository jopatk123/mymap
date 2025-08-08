import { defineStore } from 'pinia'
import { pointsApi } from '@/api/points.js'
import { 
  getPanoramaById, 
  getPanoramasByBounds,
  createPanorama,
  updatePanorama,
  deletePanorama,
  getNearbyPanoramas
} from '@/api/panorama.js'

export const usePanoramaStore = defineStore('panorama', {
  state: () => ({
    // 数据状态
    panoramas: [],
    currentPanorama: null,
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0
    },
    searchParams: {},
    mapBounds: null,
    
    // UI 状态
    loading: false,
    error: null,
    selectedIds: [],
    batchMode: false,
    currentOperation: null
  }),
  
  getters: {
    // 数据 getters
    getPanoramaById: (state) => (id) => {
      return state.panoramas.find(p => p.id === id)
    },
    
    visiblePanoramas: (state) => {
      if (!state.mapBounds) return state.panoramas
      
      return state.panoramas.filter(panorama => {
        const lat = panorama.gcj02Lat || panorama.lat
        const lng = panorama.gcj02Lng || panorama.lng
        const { north, south, east, west } = state.mapBounds
        
        return lat >= south && lat <= north && lng >= west && lng <= east
      })
    },
    
    hasMore: (state) => {
      const { page, pageSize, total } = state.pagination
      return page * pageSize < total
    },
    
    // UI getters
    hasSelected: (state) => state.selectedIds.length > 0,
    selectedCount: (state) => state.selectedIds.length,
    isAllSelected: (state) => (totalCount) => {
      return state.selectedIds.length === totalCount && totalCount > 0
    },
    isIndeterminate: (state) => (totalCount) => {
      return state.selectedIds.length > 0 && state.selectedIds.length < totalCount
    }
  },
  
  actions: {
    // 数据操作方法
    setPanoramas(panoramas, append = false) {
      if (append) {
        this.panoramas.push(...panoramas)
      } else {
        this.panoramas = panoramas
      }
    },
    
    addPanorama(panorama) {
      this.panoramas.unshift(panorama)
    },
    
    updatePanorama(id, updatedPanorama) {
      const index = this.panoramas.findIndex(p => p.id === id)
      if (index > -1) {
        this.panoramas[index] = updatedPanorama
      }
      
      if (this.currentPanorama?.id === id) {
        this.currentPanorama = updatedPanorama
      }
    },
    
    removePanorama(id) {
      const index = this.panoramas.findIndex(p => p.id === id)
      if (index > -1) {
        this.panoramas.splice(index, 1)
      }
      
      if (this.currentPanorama?.id === id) {
        this.currentPanorama = null
      }
    },
    
    removePanoramas(ids) {
      this.panoramas = this.panoramas.filter(p => !ids.includes(p.id))
      
      if (this.currentPanorama && ids.includes(this.currentPanorama.id)) {
        this.currentPanorama = null
      }
    },
    
    batchUpdatePanoramas(ids, updates) {
      this.panoramas = this.panoramas.map(p => {
        if (ids.includes(p.id)) {
          return { ...p, ...updates }
        }
        return p
      })
    },
    
    setCurrentPanorama(panorama) {
      this.currentPanorama = panorama
    },
    
    clearCurrentPanorama() {
      this.currentPanorama = null
    },
    
    setPagination(pagination) {
      this.pagination = {
        ...this.pagination,
        ...pagination,
        total: Number(pagination.total) || 0
      }
    },
    
    setSearchParams(params) {
      this.searchParams = { ...params }
      this.pagination.page = 1
    },
    
    clearSearchParams() {
      this.searchParams = {}
      this.pagination.page = 1
    },
    
    setMapBounds(bounds) {
      this.mapBounds = bounds
    },
    
    // UI 操作方法
    setLoading(loading, operation = null) {
      this.loading = loading
      this.currentOperation = loading ? operation : null
    },
    
    setError(error) {
      this.error = error
    },
    
    clearError() {
      this.error = null
    },
    
    toggleBatchMode() {
      this.batchMode = !this.batchMode
      if (!this.batchMode) {
        this.selectedIds = []
      }
    },
    
    setBatchMode(enabled) {
      this.batchMode = enabled
      if (!enabled) {
        this.selectedIds = []
      }
    },
    
    selectPanorama(id) {
      if (!this.selectedIds.includes(id)) {
        this.selectedIds.push(id)
      }
    },
    
    deselectPanorama(id) {
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      }
    },
    
    toggleSelection(id) {
      if (this.selectedIds.includes(id)) {
        this.deselectPanorama(id)
      } else {
        this.selectPanorama(id)
      }
    },
    
    selectAll(ids) {
      this.selectedIds = [...ids]
    },
    
    clearSelection() {
      this.selectedIds = []
    },
    
    invertSelection(allIds) {
      const unselected = allIds.filter(id => !this.selectedIds.includes(id))
      this.selectedIds = unselected
    },
    
    // API 调用方法
    async fetchPanoramas(params = {}) {
      try {
        this.setLoading(true, 'fetching')
        this.clearError()
        
        const response = await pointsApi.getAllPoints({
          page: this.pagination.page,
          pageSize: this.pagination.pageSize,
          ...this.searchParams,
          ...params
        })
        
        // 过滤掉KML文件，只保留有有效坐标的点位
        console.log('🔍 Store原始数据:', response.data.length, response.data)
        
        const filteredData = response.data.filter(point => {
          // 排除KML文件
          if (point.type === 'kml') {
            console.log('❌ Store过滤掉KML文件:', point)
            return false
          }
          
          // 确保有有效的坐标
          const lat = point.lat || point.latitude
          const lng = point.lng || point.longitude
          const isValid = lat != null && lng != null && !isNaN(lat) && !isNaN(lng)
          
          if (!isValid) {
            console.log('❌ Store过滤掉无效坐标的点位:', { point, lat, lng })
          }
          
          return isValid
        })
        
        console.log('✅ Store过滤后的数据:', filteredData.length, filteredData)
        this.setPanoramas(filteredData, params.append)
        this.setPagination(response.pagination)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async fetchPanoramasByBounds(bounds) {
      try {
        this.setLoading(true, 'fetching')
        this.clearError()
        
        this.setMapBounds(bounds)
        const response = await getPanoramasByBounds(bounds)
        this.setPanoramas(response.data || response)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async fetchPanoramaDetail(id) {
      try {
        this.setLoading(true, 'fetching')
        this.clearError()
        
        const response = await getPanoramaById(id)
        this.setCurrentPanorama(response)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async createPanoramaAsync(panoramaData) {
      try {
        this.setLoading(true, 'creating')
        this.clearError()
        
        const response = await createPanorama(panoramaData)
        this.addPanorama(response)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async updatePanoramaAsync(id, panoramaData) {
      try {
        this.setLoading(true, 'updating')
        this.clearError()
        
        const response = await updatePanorama(id, panoramaData)
        this.updatePanorama(id, response)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async deletePanoramaAsync(id) {
      try {
        this.setLoading(true, 'deleting')
        this.clearError()
        
        await deletePanorama(id)
        this.removePanorama(id)
        
        return true
      } catch (error) {
        if (error.response?.status === 404) {
          this.removePanorama(id)
          return true
        }
        
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async fetchNearbyPanoramas(lat, lng, radius = 1000) {
      try {
        this.setLoading(true, 'fetching')
        this.clearError()
        
        const response = await getNearbyPanoramas(lat, lng, radius)
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async handleSearch(params) {
      if (params.keyword?.trim()) {
        this.setSearchParams(params)
      } else {
        this.clearSearchParams()
      }
      
      return await this.fetchPanoramas()
    },
    
    async loadMore() {
      if (!this.hasMore || this.loading) return
      
      this.pagination.page += 1
      return await this.fetchPanoramas({ append: true })
    },
    
    async refresh() {
      this.pagination.page = 1
      return await this.fetchPanoramas()
    },
    
    async batchDeletePanoramas(ids) {
      try {
        this.setLoading(true, 'deleting')
        this.clearError()
        
        const { batchDeletePanoramas } = await import('@/api/panorama.js')
        await batchDeletePanoramas(ids)
        
        this.removePanoramas(ids)
        this.clearSelection()
        
        return true
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async movePanoramaToFolder(id, folderId) {
      try {
        this.setLoading(true, 'updating')
        this.clearError()
        
        const { movePanoramaToFolder } = await import('@/api/panorama.js')
        const response = await movePanoramaToFolder(id, folderId)
        
        this.updatePanorama(id, { ...this.getPanoramaById(id), folderId })
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async batchMovePanoramasToFolder(ids, folderId) {
      try {
        this.setLoading(true, 'updating')
        this.clearError()
        
        const { batchMovePanoramasToFolder } = await import('@/api/panorama.js')
        const response = await batchMovePanoramasToFolder(ids, folderId)
        
        this.batchUpdatePanoramas(ids, { folderId })
        this.clearSelection()
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async updatePanoramaVisibility(id, isVisible) {
      try {
        this.setLoading(true, 'updating')
        this.clearError()
        
        const { updatePanoramaVisibility } = await import('@/api/panorama.js')
        const response = await updatePanoramaVisibility(id, isVisible)
        
        this.updatePanorama(id, { ...this.getPanoramaById(id), isVisible })
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    async batchUpdatePanoramaVisibility(ids, isVisible) {
      try {
        this.setLoading(true, 'updating')
        this.clearError()
        
        const { batchUpdatePanoramaVisibility } = await import('@/api/panorama.js')
        const response = await batchUpdatePanoramaVisibility(ids, isVisible)
        
        this.batchUpdatePanoramas(ids, { isVisible })
        this.clearSelection()
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 重置状态
    reset() {
      this.panoramas = []
      this.currentPanorama = null
      this.pagination = {
        page: 1,
        pageSize: 20,
        total: 0
      }
      this.searchParams = {}
      this.mapBounds = null
      this.loading = false
      this.error = null
      this.selectedIds = []
      this.batchMode = false
      this.currentOperation = null
    }
  }
})



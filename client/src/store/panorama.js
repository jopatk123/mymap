import { defineStore } from 'pinia'
import { 
  getPanoramas, 
  getPanoramaById, 
  getPanoramasByBounds,
  createPanorama,
  updatePanorama,
  deletePanorama,
  getNearbyPanoramas
} from '@/api/panorama.js'

export const usePanoramaStore = defineStore('panorama', {
  state: () => ({
    // 全景图列表
    panoramas: [],
    // 当前选中的全景图
    currentPanorama: null,
    // 加载状态
    loading: false,
    // 错误信息
    error: null,
    // 分页信息
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0
    },
    // 搜索条件
    searchParams: {},
    // 地图边界
    mapBounds: null
  }),
  
  getters: {
    // 获取指定ID的全景图
    getPanoramaById: (state) => (id) => {
      return state.panoramas.find(p => p.id === id)
    },
    
    // 获取可见区域内的全景图
    visiblePanoramas: (state) => {
      if (!state.mapBounds) return state.panoramas
      
      return state.panoramas.filter(panorama => {
        const { lat, lng } = panorama
        const { north, south, east, west } = state.mapBounds
        
        return lat >= south && lat <= north && lng >= west && lng <= east
      })
    },
    
    // 是否有更多数据
    hasMore: (state) => {
      const { page, pageSize, total } = state.pagination
      return page * pageSize < total
    }
  },
  
  actions: {
    // 设置加载状态
    setLoading(loading) {
      this.loading = loading
    },
    
    // 设置错误信息
    setError(error) {
      this.error = error
    },
    
    // 设置地图边界
    setMapBounds(bounds) {
      this.mapBounds = bounds
    },
    
    // 获取全景图列表
    async fetchPanoramas(params = {}) {
      try {
        this.setLoading(true)
        this.setError(null)
        
        const response = await getPanoramas({
          page: this.pagination.page,
          pageSize: this.pagination.pageSize,
          ...this.searchParams,
          ...params
        })
        
        if (params.append) {
          // 追加数据（用于分页加载）
          this.panoramas.push(...response.data)
        } else {
          // 替换数据
          this.panoramas = response.data
        }
        
        // 更新分页信息
        this.pagination = {
          ...this.pagination,
          ...response.pagination
        }
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 根据地图边界获取全景图
    async fetchPanoramasByBounds(bounds) {
      try {
        this.setLoading(true)
        this.setError(null)
        this.setMapBounds(bounds)
        
        const response = await getPanoramasByBounds(bounds)
        this.panoramas = response.data || response
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 获取全景图详情
    async fetchPanoramaDetail(id) {
      try {
        this.setLoading(true)
        this.setError(null)
        
        const response = await getPanoramaById(id)
        this.currentPanorama = response
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 创建全景图
    async createPanorama(panoramaData) {
      try {
        this.setLoading(true)
        this.setError(null)
        
        const response = await createPanorama(panoramaData)
        
        // 添加到列表开头
        this.panoramas.unshift(response)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 更新全景图
    async updatePanorama(id, panoramaData) {
      try {
        this.setLoading(true)
        this.setError(null)
        
        const response = await updatePanorama(id, panoramaData)
        
        // 更新列表中的数据
        const index = this.panoramas.findIndex(p => p.id === id)
        if (index > -1) {
          this.panoramas[index] = response
        }
        
        // 更新当前全景图
        if (this.currentPanorama?.id === id) {
          this.currentPanorama = response
        }
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 删除全景图
    async deletePanorama(id) {
      try {
        this.setLoading(true)
        this.setError(null)
        
        await deletePanorama(id)
        
        // 从列表中移除
        const index = this.panoramas.findIndex(p => p.id === id)
        if (index > -1) {
          this.panoramas.splice(index, 1)
        }
        
        // 清除当前全景图
        if (this.currentPanorama?.id === id) {
          this.currentPanorama = null
        }
        
        return true
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 获取附近的全景图
    async fetchNearbyPanoramas(lat, lng, radius = 1000) {
      try {
        this.setLoading(true)
        this.setError(null)
        
        const response = await getNearbyPanoramas(lat, lng, radius)
        
        return response
      } catch (error) {
        this.setError(error.message)
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 设置搜索参数
    setSearchParams(params) {
      this.searchParams = { ...params }
      this.pagination.page = 1 // 重置页码
    },
    
    // 清除搜索参数
    clearSearchParams() {
      this.searchParams = {}
      this.pagination.page = 1
    },
    
    // 加载更多
    async loadMore() {
      if (!this.hasMore || this.loading) return
      
      this.pagination.page += 1
      return await this.fetchPanoramas({ append: true })
    },
    
    // 刷新数据
    async refresh() {
      this.pagination.page = 1
      return await this.fetchPanoramas()
    },
    
    // 设置当前全景图
    setCurrentPanorama(panorama) {
      this.currentPanorama = panorama
    },
    
    // 清除当前全景图
    clearCurrentPanorama() {
      this.currentPanorama = null
    },
    
    // 重置状态
    reset() {
      this.panoramas = []
      this.currentPanorama = null
      this.loading = false
      this.error = null
      this.pagination = {
        page: 1,
        pageSize: 20,
        total: 0
      }
      this.searchParams = {}
      this.mapBounds = null
    }
  }
})
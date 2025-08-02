/**
 * 地图页面业务逻辑服务
 */
export class MapService {
  constructor(panoramaStore, appStore) {
    this.panoramaStore = panoramaStore
    this.appStore = appStore
  }

  /**
   * 初始化应用
   */
  async initApp() {
    this.appStore.initApp()
    await this.loadInitialData()
  }

  /**
   * 加载初始数据
   */
  async loadInitialData() {
    try {
      await this.panoramaStore.fetchPanoramas()
    } catch (error) {
      throw new Error('加载数据失败: ' + error.message)
    }
  }

  /**
   * 处理全景图标记点击
   */
  handlePanoramaClick(panorama, callback) {
    this.panoramaStore.setCurrentPanorama(panorama)
    if (callback) callback(panorama)
  }

  /**
   * 处理地图点击
   */
  handleMapClick(latlng) {
    console.log('地图点击坐标:', latlng)
    // 可以在这里添加新增全景图的逻辑
  }

  /**
   * 选择全景图
   */
  selectPanorama(panorama, mapRef) {
    this.panoramaStore.setCurrentPanorama(panorama)
    
    // 地图定位到该全景图
    if (mapRef?.value) {
      mapRef.value.setCenter(panorama.lat, panorama.lng, 16)
    }
    
    return panorama
  }

  /**
   * 定位到全景图
   */
  locatePanorama(panorama, mapRef) {
    if (mapRef?.value) {
      mapRef.value.setCenter(panorama.lat, panorama.lng, 18)
    }
  }

  /**
   * 搜索处理
   */
  async handleSearch(keyword) {
    if (keyword.trim()) {
      this.panoramaStore.setSearchParams({ 
        keyword: keyword.trim() 
      })
    } else {
      this.panoramaStore.clearSearchParams()
    }
    
    await this.panoramaStore.fetchPanoramas()
  }

  /**
   * 排序变化处理
   */
  async handleSortChange(sortBy) {
    this.panoramaStore.setSearchParams({ 
      ...this.panoramaStore.searchParams,
      sortBy 
    })
    
    await this.panoramaStore.fetchPanoramas()
  }

  /**
   * 刷新数据
   */
  async refreshData() {
    await this.panoramaStore.refresh()
  }

  /**
   * 加载更多
   */
  async loadMore() {
    await this.panoramaStore.loadMore()
  }

  /**
   * 处理全景图删除
   */
  async handlePanoramaDeleted(deletedId, mapRef, currentPanorama, selectedPanorama) {
    try {
      // 从store中移除已删除的全景图
      await this.panoramaStore.deletePanorama(deletedId)
      
      // 重新加载地图标记
      if (mapRef?.value) {
        mapRef.value.clearMarkers()
        mapRef.value.addPanoramaMarkers(this.panoramaStore.visiblePanoramas)
      }
      
      // 清空选择状态
      const result = { currentPanorama: null, selectedPanorama: null }
      
      if (currentPanorama?.value?.id === deletedId) {
        currentPanorama.value = null
        result.currentPanorama = null
      }
      if (selectedPanorama?.value?.id === deletedId) {
        selectedPanorama.value = null
        result.selectedPanorama = null
      }
      
      return result
    } catch (error) {
      console.error('删除全景图后更新失败:', error)
      throw new Error('更新失败，请刷新页面')
    }
  }

  /**
   * 图片加载错误处理
   */
  handleImageError(event) {
    event.target.src = '/default-panorama.jpg'
  }

  /**
   * 格式化坐标
   */
  formatCoordinate(lat, lng) {
    if (!lat || !lng) return '未知位置'
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    if (!dateString) return '未知时间'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }
}
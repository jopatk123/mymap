/**
 * 全景图查看器业务逻辑服务
 */
import { getPanoramaById } from '@/api/panorama.js'

export class PanoramaViewerService {
  constructor() {
    this.panorama = null
    this.isLoading = false
    this.error = ''
  }

  /**
   * 加载全景图数据
   */
  async loadPanorama(route) {
    const id = route.params.id || route.query.id
    const imageFromQuery = route.query.image
    
    if (!id && !imageFromQuery) {
      throw new Error('未提供全景图ID')
    }
    
    this.isLoading = true
    this.error = ''
    
    try {
      // 如果有图片URL参数，直接使用
      if (imageFromQuery) {
        return this._createDirectPanorama(route, imageFromQuery)
      }

      // 从API加载
      return await this._loadFromAPI(id)
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * 创建直接模式全景图对象
   */
  _createDirectPanorama(route, imageUrl) {
    const decodedImageUrl = decodeURIComponent(imageUrl)
    
    this.panorama = {
      id: route.params.id || 'direct',
      title: route.query.title ? decodeURIComponent(route.query.title) : '全景图',
      imageUrl: decodedImageUrl,
      lat: route.query.lat || 0,
      lng: route.query.lng || 0,
      createdAt: route.query.createdAt || new Date().toISOString()
    }
    
    return this.panorama
  }

  /**
   * 从API加载全景图数据
   */
  async _loadFromAPI(id) {
    console.log('开始加载全景图ID:', id)
    const response = await getPanoramaById(id)
    console.log('API响应:', response)
    
    const data = response.data || response
    if (!data) {
      throw new Error('全景图不存在')
    }
    
    if (!data.imageUrl) {
      throw new Error('全景图地址不存在')
    }
    
    this.panorama = data
    console.log('全景图数据:', data)
    
    return this.panorama
  }

  /**
   * 格式化坐标
   */
  formatCoordinate(lat, lng) {
    if (!lat || !lng) return '未知'
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    if (!dateString) return '未知'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  /**
   * 获取当前全景图数据
   */
  getPanorama() {
    return this.panorama
  }

  /**
   * 获取加载状态
   */
  getLoadingState() {
    return {
      isLoading: this.isLoading,
      error: this.error
    }
  }
}
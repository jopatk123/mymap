import { getPanoramaById } from '@/api/panorama.js';

export class PanoramaViewerService {
  constructor() {
    this.panorama = null;
    this.isLoading = false;
    this.error = '';
  }

  async loadPanorama(route) {
    const id = route.params.id || route.query.id;
    const imageFromQuery = route.query.image;

    if (!id && !imageFromQuery) {
      throw new Error('未提供全景图ID');
    }

    this.isLoading = true;
    this.error = '';

    try {
      if (imageFromQuery) {
        return this._createDirectPanorama(route, imageFromQuery);
      }
      return await this._loadFromAPI(id);
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  _createDirectPanorama(route, imageUrl) {
    const decodedImageUrl = decodeURIComponent(imageUrl);

    this.panorama = {
      id: route.params.id || 'direct',
      title: route.query.title ? decodeURIComponent(route.query.title) : '全景图',
      imageUrl: decodedImageUrl,
      lat: route.query.lat || 0,
      lng: route.query.lng || 0,
      createdAt: route.query.createdAt || new Date().toISOString(),
    };

    return this.panorama;
  }

  async _loadFromAPI(id) {
    const response = await getPanoramaById(id);
    const data = response.data || response;
    if (!data) {
      throw new Error('全景图不存在');
    }
    if (!data.imageUrl) {
      throw new Error('全景图地址不存在');
    }
    this.panorama = data;
    return this.panorama;
  }

  formatCoordinate(lat, lng) {
    if (!lat || !lng) return '未知';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  formatDate(dateString) {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN');
  }

  getPanorama() {
    return this.panorama;
  }

  getLoadingState() {
    return {
      isLoading: this.isLoading,
      error: this.error,
    };
  }
}

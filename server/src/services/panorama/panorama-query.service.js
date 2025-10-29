const PanoramaModel = require('../../models/panorama.model');
const Formatters = require('../../utils/formatters');
const Logger = require('../../utils/logger');
const { PANORAMA } = require('../../constants/errors');

class PanoramaQueryService {
  static async getPanoramas(options = {}) {
    try {
      Logger.debug('获取全景图列表', options);
      const result = await PanoramaModel.findAll(options);
      return Formatters.formatPaginatedResponse(result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      Logger.error('获取全景图列表失败', error);
      throw new Error(`${PANORAMA.NOT_FOUND.message}: ${error.message}`);
    }
  }

  static async getPanoramaById(id, ownerId = null) {
    try {
      Logger.debug('根据ID获取全景图', { id });
      const panorama = await PanoramaModel.findById(id, ownerId || undefined);
      if (!panorama) {
        throw new Error(PANORAMA.NOT_FOUND.message);
      }
      return Formatters.formatPanorama(panorama);
    } catch (error) {
      Logger.error('获取全景图详情失败', error);
      throw new Error(`获取全景图详情失败: ${error.message}`);
    }
  }

  static async getPanoramasByBounds(bounds, ownerId = null) {
    try {
      Logger.debug('根据边界获取全景图', bounds);
      const panoramas = await PanoramaModel.findByBounds(bounds, ownerId || undefined);
      return Formatters.formatPanoramas(panoramas);
    } catch (error) {
      Logger.error('根据边界获取全景图失败', error);
      throw new Error(`根据边界获取全景图失败: ${error.message}`);
    }
  }

  static async getNearbyPanoramas(lat, lng, radius = 1000, ownerId = null) {
    try {
      Logger.debug('获取附近全景图', { lat, lng, radius });
      const panoramas = await PanoramaModel.findNearby(lat, lng, radius, ownerId || undefined);
      return Formatters.formatPanoramas(panoramas);
    } catch (error) {
      Logger.error('获取附近全景图失败', error);
      throw new Error(`获取附近全景图失败: ${error.message}`);
    }
  }

  static async searchPanoramas(searchParams) {
    try {
      Logger.debug('搜索全景图', searchParams);
      const result = await PanoramaModel.search(searchParams);
      return Formatters.formatPaginatedResponse(result.data, result.pagination);
    } catch (error) {
      Logger.error('搜索全景图失败', error);
      throw new Error(`搜索全景图失败: ${error.message}`);
    }
  }

  static async getStats(ownerId = null) {
    try {
      Logger.debug('获取统计信息');
      return await PanoramaModel.getStats(ownerId || undefined);
    } catch (error) {
      Logger.error('获取统计信息失败', error);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }
}

module.exports = PanoramaQueryService;

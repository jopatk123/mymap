const ImageSetService = require('../../services/image-set.service');
const { successResponse, errorResponse } = require('../../utils/response');
const Logger = require('../../utils/logger');

class ImageSetQueryController {
  /**
   * 获取图片集列表
   */
  static async getImageSets(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false,
      } = req.query;
      const ownerId = req.user?.id;

      const options = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
        folderId: folderId ? parseInt(folderId) : null,
        includeHidden: includeHidden === 'true',
        ownerId,
      };

      const result = await ImageSetService.getImageSets(options);

      res.json(successResponse(result, '获取图片集列表成功'));
    } catch (error) {
      Logger.error('获取图片集列表失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * 根据ID获取图片集详情
   */
  static async getImageSetById(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user?.id;

      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的图片集ID'));
      }

      const imageSet = await ImageSetService.getImageSetById(parseInt(id), ownerId);

      res.json(successResponse(imageSet, '获取图片集详情成功'));
    } catch (error) {
      Logger.error('获取图片集详情失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 根据地图边界获取图片集
   */
  static async getImageSetsByBounds(req, res) {
    try {
      const { north, south, east, west, includeHidden = false } = req.query;
      const ownerId = req.user?.id;

      if (!north || !south || !east || !west) {
        return res.status(400).json(errorResponse('缺少边界参数'));
      }

      const bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
        includeHidden: includeHidden === 'true',
        ownerId,
      };

      if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
        return res.status(400).json(errorResponse('边界参数不合理'));
      }

      const imageSets = await ImageSetService.getImageSetsByBounds(bounds);

      res.json(successResponse(imageSets, '根据边界获取图片集成功'));
    } catch (error) {
      Logger.error('根据边界获取图片集失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * 获取图片集统计信息
   */
  static async getImageSetStats(req, res) {
    try {
      const ownerId = req.user?.id;
      const stats = await ImageSetService.getStats(ownerId);
      res.json(successResponse(stats, '获取图片集统计成功'));
    } catch (error) {
      Logger.error('获取图片集统计失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }
}

module.exports = ImageSetQueryController;

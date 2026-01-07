const { VideoPointService } = require('../../services');
const { successResponse, errorResponse } = require('../../utils/response');
const Logger = require('../../utils/logger');

class VideoPointQueryController {
  // 获取视频点位列表
  static async getVideoPoints(req, res) {
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

      const result = await VideoPointService.getVideoPoints(options);

      res.json(successResponse(result, '获取视频点位列表成功'));
    } catch (error) {
      Logger.error('获取视频点位列表失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  // 根据ID获取视频点位详情
  static async getVideoPointById(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user?.id;

      if (!id || isNaN(id)) {
        return res.status(400).json(errorResponse('无效的视频点位ID'));
      }

      const videoPoint = await VideoPointService.getVideoPointById(parseInt(id), ownerId);

      res.json(successResponse(videoPoint, '获取视频点位详情成功'));
    } catch (error) {
      Logger.error('获取视频点位详情失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  // 根据地图边界获取视频点位
  static async getVideoPointsByBounds(req, res) {
    try {
      const { north, south, east, west, includeHidden = false } = req.query;
      const ownerId = req.user?.id;

      // 验证边界参数
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

      // 验证边界值的合理性
      if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
        return res.status(400).json(errorResponse('边界参数不合理'));
      }

      const videoPoints = await VideoPointService.getVideoPointsByBounds(bounds);

      res.json(successResponse(videoPoints, '根据边界获取视频点位成功'));
    } catch (error) {
      Logger.error('根据边界获取视频点位失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  // 获取视频点位统计信息
  static async getVideoPointStats(req, res) {
    try {
      const ownerId = req.user?.id;
      const stats = await VideoPointService.getStats(ownerId);
      res.json(successResponse(stats, '获取视频点位统计成功'));
    } catch (error) {
      Logger.error('获取视频点位统计失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }
}

module.exports = VideoPointQueryController;

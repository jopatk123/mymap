const PanoramaModel = require('../models/panorama.model');
const VideoPointModel = require('../models/video-point.model');
const ImageSetModel = require('../models/image-set.model');
const KmlFileModel = require('../models/kml-file.model');
const FolderModel = require('../models/folder.model');
const Logger = require('../utils/logger');

class PointsController {
  // 获取所有点位（全景图 + 视频点位，不包括KML文件）
  static async getAllPoints(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false,
        respectFolderVisibility = true, // 新增参数，控制是否考虑文件夹可见性
      } = req.query;
      const ownerId = req.user?.id;

      const baseParams = {
        keyword,
        folderId: folderId ? parseInt(folderId) : null,
        includeHidden: includeHidden === 'true',
        ownerId,
      };

      // 如果需要考虑文件夹可见性，获取可见文件夹列表
      if (respectFolderVisibility === 'true' || respectFolderVisibility === true) {
        try {
          const visibleFolderIds = await FolderModel.getVisibleFolderIds(ownerId);
          baseParams.visibleFolderIds = visibleFolderIds;
        } catch (folderError) {
          Logger.warn('获取可见文件夹ID失败，使用默认设置:', folderError);
          // 如果获取可见文件夹失败，不设置visibleFolderIds，这样会返回所有数据
        }
      }

      const fetchAllPages = async (model, params, { chunkSize = 5000, maxPages = 20 } = {}) => {
        const data = [];
        let currentPage = 1;
        let totalPages = 1;

        while (currentPage <= totalPages && currentPage <= maxPages) {
          const result = await model.findAll({
            ...params,
            page: currentPage,
            pageSize: chunkSize,
          });

          if (Array.isArray(result?.data)) {
            data.push(...result.data);
          }

          totalPages = result?.totalPages || Math.ceil((result?.total || 0) / chunkSize) || 1;
          currentPage += 1;
        }

        if (currentPage <= totalPages) {
          Logger.warn(
            '点位数量超过分页抓取上限，已截断返回: currentPage=%s, totalPages=%s',
            currentPage,
            totalPages
          );
        }

        return data;
      };

      // 并行获取全景图和视频点位（不包括KML文件）
      const [panoramasRaw, videosRaw, imageSetsRaw] = await Promise.all([
        fetchAllPages(PanoramaModel, baseParams),
        fetchAllPages(VideoPointModel, baseParams),
        fetchAllPages(ImageSetModel, baseParams),
      ]);

      // 合并数据并添加类型标识
      const panoramas = panoramasRaw.map((item) => ({
        ...item,
        type: 'panorama',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.image_url,
        thumbnailUrl: item.thumbnail_url,
      }));

      const videos = videosRaw.map((item) => ({
        ...item,
        type: 'video',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.video_url,
        videoUrl: item.video_url, // 添加 videoUrl 字段供前端识别
        thumbnailUrl: item.thumbnail_url,
      }));

      const imageSets = imageSetsRaw.map((item) => ({
        ...item,
        type: 'image-set',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.cover_url,
        coverUrl: item.cover_url,
        thumbnailUrl: item.thumbnail_url,
        imageCount: item.image_count,
      }));

      // 合并并排序（不包括KML文件）
      const allPoints = [...panoramas, ...videos, ...imageSets].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      // 手动分页
      const total = allPoints.length;
      const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
      const endIndex = startIndex + parseInt(pageSize);
      const paginatedData = allPoints.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      Logger.error('获取所有点位失败:', error);
      res.status(500).json({
        success: false,
        message: '获取点位列表失败',
        error: error.message,
      });
    }
  }

  // 根据地图边界获取所有点位
  static async getPointsByBounds(req, res) {
    try {
      const {
        north,
        south,
        east,
        west,
        includeHidden = false,
        respectFolderVisibility = true,
      } = req.query;
      const ownerId = req.user?.id;

      const bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
        includeHidden: includeHidden === 'true',
        ownerId,
      };

      // 如果需要考虑文件夹可见性，获取可见文件夹列表
      if (respectFolderVisibility === 'true' || respectFolderVisibility === true) {
        const visibleFolderIds = await FolderModel.getVisibleFolderIds(ownerId);
        bounds.visibleFolderIds = visibleFolderIds;
      }

      // 并行获取全景图和视频点位
      const [panoramas, videos, imageSets] = await Promise.all([
        PanoramaModel.findByBounds(bounds),
        VideoPointModel.findByBounds(bounds),
        ImageSetModel.findByBounds(bounds),
      ]);

      // 添加类型标识
      const panoramaPoints = panoramas.map((item) => ({
        ...item,
        type: 'panorama',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.image_url,
        thumbnailUrl: item.thumbnail_url,
      }));

      const videoPoints = videos.map((item) => ({
        ...item,
        type: 'video',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.video_url,
        videoUrl: item.video_url, // 添加 videoUrl 字段供前端识别
        thumbnailUrl: item.thumbnail_url,
      }));

      const imageSetPoints = imageSets.map((item) => ({
        ...item,
        type: 'image-set',
        lat: item.latitude,
        lng: item.longitude,
        gcj02Lat: item.gcj02_lat,
        gcj02Lng: item.gcj02_lng,
        url: item.cover_url,
        coverUrl: item.cover_url,
        thumbnailUrl: item.thumbnail_url,
        imageCount: item.image_count,
      }));

      const allPoints = [...panoramaPoints, ...videoPoints, ...imageSetPoints];

      res.json({
        success: true,
        data: allPoints,
      });
    } catch (error) {
      Logger.error('根据边界获取点位失败:', error);
      res.status(500).json({
        success: false,
        message: '获取点位失败',
        error: error.message,
      });
    }
  }

  // 获取可见的KML文件（用于地图显示）
  static async getVisibleKmlFiles(req, res) {
    try {
      const { respectFolderVisibility = true } = req.query;
      const ownerId = req.user?.id;

      let searchParams = {
        page: 1,
        pageSize: 1000,
        includeHidden: false, // KML文件本身必须是可见的
        ownerId,
      };

      // 如果需要考虑文件夹可见性，获取可见文件夹列表
      if (respectFolderVisibility === 'true' || respectFolderVisibility === true) {
        const visibleFolderIds = await FolderModel.getVisibleFolderIds(ownerId);
        searchParams.visibleFolderIds = visibleFolderIds;
      }

      const kmlResult = await KmlFileModel.findAll(searchParams);

      const kmls = kmlResult.data.map((item) => ({
        ...item,
        type: 'kml',
        url: item.file_url,
        filePath: item.file_url,
      }));

      res.json({
        success: true,
        data: kmls,
      });
    } catch (error) {
      Logger.error('获取可见KML文件失败:', error);
      res.status(500).json({
        success: false,
        message: '获取可见KML文件失败',
        error: error.message,
      });
    }
  }

  // 获取点位统计信息
  static async getPointsStats(req, res) {
    try {
      const ownerId = req.user?.id;
      const [panoramaStats, videoStats, imageSetStats] = await Promise.all([
        PanoramaModel.getStats(ownerId),
        VideoPointModel.getStats(ownerId),
        ImageSetModel.getStats(ownerId),
      ]);

      const stats = {
        total: panoramaStats.total + videoStats.total + imageSetStats.total,
        visible: panoramaStats.visible + videoStats.visible + (imageSetStats.visible || 0),
        hidden: panoramaStats.hidden + videoStats.hidden + (imageSetStats.hidden || 0),
        panoramas: panoramaStats,
        videos: videoStats,
        imageSets: imageSetStats,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      Logger.error('获取点位统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取点位统计失败',
        error: error.message,
      });
    }
  }
}

module.exports = PointsController;

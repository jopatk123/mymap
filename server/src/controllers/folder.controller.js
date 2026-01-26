const FolderModel = require('../models/folder.model');
const PanoramaModel = require('../models/panorama.model');
const Logger = require('../utils/logger');

class FolderController {
  // 获取文件夹树
  static async getFolders(req, res) {
    try {
      const ownerId = req.user?.id;
      const folders = await FolderModel.findAll(ownerId);

      // 为每个文件夹添加内容数量
      const addContentCount = async (folderList) => {
        for (const folder of folderList) {
          folder.panoramaCount = parseInt(await FolderModel.getPanoramaCount(folder.id, ownerId));
          folder.videoPointCount = parseInt(await FolderModel.getVideoPointCount(folder.id, ownerId));
          folder.kmlFileCount = parseInt(await FolderModel.getKmlFileCount(folder.id, ownerId));
          folder.imageSetCount = parseInt(await FolderModel.getImageSetCount(folder.id, ownerId));
          folder.totalCount = folder.panoramaCount + folder.videoPointCount + folder.kmlFileCount + folder.imageSetCount;
          if (folder.children) {
            await addContentCount(folder.children);
          }
        }
      };

      await addContentCount(folders);

      res.json({
        success: true,
        data: folders,
      });
    } catch (error) {
      Logger.error('获取文件夹失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文件夹失败: ' + error.message,
      });
    }
  }

  // 获取文件夹列表（平铺）
  static async getFoldersFlat(req, res) {
    try {
      const ownerId = req.user?.id;
      const folders = await FolderModel.findAllFlat(ownerId);

      // 为每个文件夹添加内容计数
      for (const folder of folders) {
        folder.panoramaCount = parseInt(await FolderModel.getPanoramaCount(folder.id, ownerId));
        folder.videoPointCount = parseInt(await FolderModel.getVideoPointCount(folder.id, ownerId));
        folder.kmlFileCount = parseInt(await FolderModel.getKmlFileCount(folder.id, ownerId));
        folder.imageSetCount = parseInt(await FolderModel.getImageSetCount(folder.id, ownerId));
        folder.totalCount = folder.panoramaCount + folder.videoPointCount + folder.kmlFileCount + folder.imageSetCount;
      }

      res.json({
        success: true,
        data: folders,
      });
    } catch (error) {
      Logger.error('获取文件夹列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文件夹列表失败: ' + error.message,
      });
    }
  }

  // 创建文件夹
  static async createFolder(req, res) {
    try {
      const { name, parentId, isVisible = true, sortOrder = 0 } = req.body;
      const ownerId = req.user?.id;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '文件夹名称不能为空',
        });
      }

      const folder = await FolderModel.create({
        name: name.trim(),
        parentId: parentId || null,
        isVisible,
        sortOrder,
        ownerId,
      });

      res.json({
        success: true,
        data: folder,
        message: '文件夹创建成功',
      });
    } catch (error) {
      Logger.error('创建文件夹失败:', error);
      res.status(500).json({
        success: false,
        message: '创建文件夹失败: ' + error.message,
      });
    }
  }

  // 更新文件夹
  static async updateFolder(req, res) {
    try {
      const { id } = req.params;
      const { name, parentId, isVisible, sortOrder } = req.body;
      const ownerId = req.user?.id;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '文件夹名称不能为空',
        });
      }

      const folder = await FolderModel.update(id, {
        name: name.trim(),
        parentId: parentId || null,
        isVisible,
        sortOrder,
      }, ownerId);

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在',
        });
      }

      res.json({
        success: true,
        data: folder,
        message: '文件夹更新成功',
      });
    } catch (error) {
      Logger.error('更新文件夹失败:', error);
      res.status(500).json({
        success: false,
        message: '更新文件夹失败: ' + error.message,
      });
    }
  }

  // 删除文件夹
  static async deleteFolder(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user?.id;

      const success = await FolderModel.delete(id, ownerId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在',
        });
      }

      res.json({
        success: true,
        message: '文件夹删除成功',
      });
    } catch (error) {
      Logger.error('删除文件夹失败:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 移动文件夹
  static async moveFolder(req, res) {
    try {
      const { id } = req.params;
      const { parentId } = req.body;
      const ownerId = req.user?.id;

      const folder = await FolderModel.move(id, parentId || null, ownerId);

      res.json({
        success: true,
        data: folder,
        message: '文件夹移动成功',
      });
    } catch (error) {
      Logger.error('移动文件夹失败:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // 更新文件夹可见性
  static async updateFolderVisibility(req, res) {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;
      const ownerId = req.user?.id;

      const folder = await FolderModel.updateVisibility(id, isVisible, ownerId);

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在',
        });
      }

      res.json({
        success: true,
        data: folder,
        message: `文件夹已${isVisible ? '显示' : '隐藏'}`,
      });
    } catch (error) {
      Logger.error('更新文件夹可见性失败:', error);
      res.status(500).json({
        success: false,
        message: '更新文件夹可见性失败: ' + error.message,
      });
    }
  }

  // 获取文件夹中的全景图
  static async getFolderPanoramas(req, res) {
    try {
      const { id } = req.params;
      const { includeHidden = false } = req.query;
      const ownerId = req.user?.id;

      const panoramas = await PanoramaModel.findByFolder(id, {
        includeHidden: includeHidden === 'true',
        ownerId,
      });

      res.json({
        success: true,
        data: panoramas,
      });
    } catch (error) {
      Logger.error('获取文件夹全景图失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文件夹全景图失败: ' + error.message,
      });
    }
  }

  // 移动全景图到文件夹
  static async movePanoramasToFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { panoramaIds } = req.body;
      const ownerId = req.user?.id;

      if (!Array.isArray(panoramaIds) || panoramaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要移动的全景图',
        });
      }

      const affectedRows = await PanoramaModel.batchMoveToFolder(panoramaIds, folderId || null, ownerId);

      res.json({
        success: true,
        data: { affectedRows },
        message: `成功移动 ${affectedRows} 个全景图`,
      });
    } catch (error) {
      Logger.error('移动全景图失败:', error);
      res.status(500).json({
        success: false,
        message: '移动全景图失败: ' + error.message,
      });
    }
  }

  // 获取文件夹内容（所有文件类型）
  static async getFolderContents(req, res) {
    try {
      const { folderId } = req.params;
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        includeHidden = false,
        fileType = 'all', // all, panorama, video, kml
        includeSubfolders = false,
        includeAll = false,
      } = req.query;

      const ownerId = req.user?.id;

      // 处理包含子文件夹逻辑：构建 folderId 列表
      let folderIdParam = folderId === '0' ? 0 : parseInt(folderId) || null;
      const includeChildren = includeSubfolders === 'true' || includeSubfolders === true;

      if (includeChildren) {
        if (folderIdParam === 0 || folderIdParam === null) {
          const allFolders = await FolderModel.findAllFlat(ownerId);
          const allFolderIds = allFolders.map((f) => f.id);
          folderIdParam = [0, ...allFolderIds];
        } else {
          const descendantIds = await FolderModel.getDescendantIds(folderIdParam, ownerId);
          folderIdParam = descendantIds.length > 0 ? descendantIds : [folderIdParam];
        }
      }

      // 规范化 keyword：去除首尾空白，防止仅为空格时误触发模糊匹配
      const normalizedKeyword =
        keyword !== undefined && keyword !== null ? String(keyword).trim() : '';

      const searchParams = {
        page: 1, // 先获取所有数据，然后统一分页
        pageSize: includeAll === 'true' || includeAll === true ? 1000000 : 1000, // 下载全部时放大上限
        keyword: normalizedKeyword,
        folderId: folderIdParam,
        includeHidden: includeHidden === 'true',
        ownerId, // 添加 ownerId 以确保数据隔离
      };

      let allResults = [];

      if (fileType === 'all' || fileType === 'panorama') {
        try {
          const panoramaResult = await PanoramaModel.findAll(searchParams);
          const panoramasWithType = panoramaResult.data.map((item) => ({
            ...item,
            fileType: 'panorama',
            displayType: '全景图',
            type: 'panorama', // 添加type字段以保持一致性
          }));
          allResults = allResults.concat(panoramasWithType);
        } catch (error) {
          Logger.error('获取全景图数据失败:', error);
          // 不要直接返回错误，而是记录错误并继续处理其他类型
          Logger.error('全景图查询失败，跳过: %s', error.message);
        }
      }

      if (fileType === 'all' || fileType === 'video') {
        try {
          const VideoPointModel = require('../models/video-point.model');
          const videoResult = await VideoPointModel.findAll(searchParams);
          const videosWithType = videoResult.data.map((item) => ({
            ...item,
            fileType: 'video',
            displayType: '视频点位',
            type: 'video', // 添加type字段以保持一致性
          }));
          allResults = allResults.concat(videosWithType);
        } catch (error) {
          Logger.error('获取视频点位数据失败:', error);
          Logger.error('视频点位查询失败，跳过: %s', error.message);
        }
      }

      if (fileType === 'all' || fileType === 'kml') {
        try {
          const KmlFileModel = require('../models/kml-file.model');
          // 透传 basemap 相关参数
          const includeBasemap =
            req.query.includeBasemap === 'true' || req.query.includeBasemap === true;
          const basemapOnly = req.query.basemapOnly === 'true' || req.query.basemapOnly === true;
          const kmlResult = await KmlFileModel.findAll({
            ...searchParams,
            includeBasemap,
            basemapOnly,
          });
          const kmlsWithType = kmlResult.data.map((item) => ({
            ...item,
            fileType: 'kml',
            displayType: 'KML文件',
            type: 'kml', // 添加type字段以保持一致性
            // 为KML文件添加一些兼容字段
            latitude: null,
            longitude: null,
            lat: null,
            lng: null,
            image_url: item.file_url,
            url: item.file_url,
          }));
          allResults = allResults.concat(kmlsWithType);
        } catch (error) {
          Logger.error('获取KML文件数据失败:', error);
          Logger.error('KML文件查询失败，跳过: %s', error.message);
        }
      }

      if (fileType === 'all' || fileType === 'image-set') {
        try {
          const ImageSetModel = require('../models/image-set.model');
          const imageSetResult = await ImageSetModel.findAll(searchParams);
          const imageSetsWithType = imageSetResult.data.map((item) => ({
            ...item,
            fileType: 'image-set',
            displayType: '图片集',
            type: 'image-set',
            image_url: item.cover_url,
            url: item.cover_url,
          }));
          allResults = allResults.concat(imageSetsWithType);
        } catch (error) {
          Logger.error('获取图片集数据失败:', error);
          Logger.error('图片集查询失败，跳过: %s', error.message);
        }
      }

      // 按创建时间排序
      allResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 手动分页
      const total = allResults.length;
      const includeAllFlag = includeAll === 'true' || includeAll === true;
      const currentPage = includeAllFlag ? 1 : parseInt(page);
      const currentPageSize = includeAllFlag ? total || 1 : parseInt(pageSize);
      const startIndex = includeAllFlag ? 0 : (currentPage - 1) * currentPageSize;
      const endIndex = includeAllFlag ? total : startIndex + currentPageSize;
      const paginatedResults = allResults.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedResults,
        pagination: {
          page: currentPage,
          pageSize: currentPageSize,
          total: total,
          totalPages: Math.ceil(total / currentPageSize),
        },
      });
    } catch (error) {
      Logger.error('获取文件夹内容失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文件夹内容失败: ' + error.message,
      });
    }
  }
}

module.exports = FolderController;

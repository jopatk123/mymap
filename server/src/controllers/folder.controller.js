const FolderModel = require('../models/folder.model');
const PanoramaModel = require('../models/panorama.model');
const Logger = require('../utils/logger');
const {
  addContentCountRecursive,
  addContentCountFlat,
  resolveFolderIdParam,
  normalizeKeyword,
  fetchFolderContents,
} = require('../services/folder.service');

class FolderController {
  // 获取文件夹树
  static async getFolders(req, res) {
    try {
      const ownerId = req.user?.id;
      const folders = await FolderModel.findAll(ownerId);

      await addContentCountRecursive(folders, ownerId);

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

      await addContentCountFlat(folders, ownerId);

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

      const folderIdParam = await resolveFolderIdParam({
        folderId,
        includeSubfolders,
        ownerId,
      });

      const normalizedKeyword = normalizeKeyword(keyword);

      const searchParams = {
        page: 1, // 先获取所有数据，然后统一分页
        pageSize: includeAll === 'true' || includeAll === true ? 1000000 : 1000, // 下载全部时放大上限
        keyword: normalizedKeyword,
        folderId: folderIdParam,
        includeHidden: includeHidden === 'true',
        ownerId, // 添加 ownerId 以确保数据隔离
      };

      const includeBasemap =
        req.query.includeBasemap === 'true' || req.query.includeBasemap === true;
      const basemapOnly = req.query.basemapOnly === 'true' || req.query.basemapOnly === true;
      const allResults = await fetchFolderContents({
        ownerId,
        fileType,
        searchParams,
        includeBasemap,
        basemapOnly,
      });

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

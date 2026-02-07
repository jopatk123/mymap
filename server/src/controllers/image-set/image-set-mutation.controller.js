const ImageSetService = require('../../services/image-set.service');
const { successResponse, errorResponse } = require('../../utils/response');
const Logger = require('../../utils/logger');

class ImageSetMutationController {
  /**
   * 创建图片集
   */
  static async createImageSet(req, res) {
    try {
      const { uploadedFiles } = req;
      const { title, description, lat, lng, folderId } = req.body;
      const ownerId = req.user?.id;

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json(errorResponse('请上传图片文件'));
      }

      if (!title) {
        return res.status(400).json(errorResponse('图片集标题为必填项'));
      }

      // 验证经纬度：必须同时填写或同时为空
      const hasLat = lat !== null && lat !== undefined && lat !== '';
      const hasLng = lng !== null && lng !== undefined && lng !== '';
      
      // 如果只填了一个，报错
      if (hasLat && !hasLng) {
        return res.status(400).json(errorResponse('请同时填写纬度和经度，或两者都不填'));
      }
      if (!hasLat && hasLng) {
        return res.status(400).json(errorResponse('请同时填写纬度和经度，或两者都不填'));
      }
      
      // 如果都未填写，使用默认值（纬度26，经度119）
      const finalLat = hasLat ? parseFloat(lat) : 26;
      const finalLng = hasLng ? parseFloat(lng) : 119;
      
      // 验证经纬度值的有效性
      if (isNaN(finalLat) || finalLat < -90 || finalLat > 90) {
        return res.status(400).json(errorResponse('纬度必须在 -90 到 90 之间'));
      }
      if (isNaN(finalLng) || finalLng < -180 || finalLng > 180) {
        return res.status(400).json(errorResponse('经度必须在 -180 到 180 之间'));
      }

      // 构建图片列表
      const images = uploadedFiles.map((file, index) => ({
        imageUrl: file.imageUrl,
        thumbnailUrl: file.thumbnailUrl,
        fileName: file.originalName,
        fileSize: file.size,
        fileType: file.mimetype,
        width: file.width,
        height: file.height,
        sortOrder: index,
      }));

      const imageSet = await ImageSetService.createImageSet({
        title,
        description,
        lat: finalLat,
        lng: finalLng,
        folderId: folderId ? parseInt(folderId) : null,
        images,
        ownerId,
      });

      res.status(201).json(successResponse(imageSet, '图片集创建成功'));
    } catch (error) {
      Logger.error('创建图片集失败:', error);
      if (error.message.includes('为必填项')) {
        res.status(400).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 更新图片集
   */
  static async updateImageSet(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const ownerId = req.user?.id;

      const imageSet = await ImageSetService.updateImageSet(parseInt(id), updateData, ownerId);

      res.json(successResponse(imageSet, '图片集更新成功'));
    } catch (error) {
      Logger.error('更新图片集失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 删除图片集
   */
  static async deleteImageSet(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user?.id;

      await ImageSetService.deleteImageSet(parseInt(id), ownerId);

      res.json(successResponse(null, '图片集删除成功'));
    } catch (error) {
      Logger.error('删除图片集失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 批量删除图片集
   */
  static async batchDeleteImageSets(req, res) {
    try {
      const { ids } = req.body;
      const ownerId = req.user?.id;

      const affectedRows = await ImageSetService.batchDeleteImageSets(ids, ownerId);

      res.json(successResponse(null, `成功删除 ${affectedRows} 个图片集`));
    } catch (error) {
      Logger.error('批量删除图片集失败:', error);
      if (error.message.includes('请提供有效的ID列表')) {
        res.status(400).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 批量更新图片集可见性
   */
  static async batchUpdateVisibility(req, res) {
    try {
      const { ids, isVisible } = req.body;
      const ownerId = req.user?.id;

      const result = await ImageSetService.batchUpdateVisibility(ids, isVisible, ownerId);

      res.json(successResponse(result, `成功更新 ${result.length} 个图片集的可见性`));
    } catch (error) {
      Logger.error('批量更新图片集可见性失败:', error);
      if (error.message.includes('请提供有效的ID列表')) {
        res.status(400).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 批量移动图片集到文件夹
   */
  static async batchMoveToFolder(req, res) {
    try {
      const { ids, folderId } = req.body;
      const ownerId = req.user?.id;

      const result = await ImageSetService.batchMoveToFolder(ids, folderId, ownerId);

      res.json(successResponse(result, `成功移动 ${result.length} 个图片集到文件夹`));
    } catch (error) {
      Logger.error('批量移动图片集到文件夹失败:', error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * 更新图片集可见性
   */
  static async updateVisibility(req, res) {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;
      const ownerId = req.user?.id;

      const imageSet = await ImageSetService.updateVisibility(parseInt(id), isVisible, ownerId);

      res.json(successResponse(imageSet, '图片集可见性更新成功'));
    } catch (error) {
      Logger.error('更新图片集可见性失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 移动图片集到文件夹
   */
  static async moveToFolder(req, res) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;
      const ownerId = req.user?.id;

      const imageSet = await ImageSetService.moveToFolder(parseInt(id), folderId, ownerId);

      res.json(successResponse(imageSet, '图片集移动成功'));
    } catch (error) {
      Logger.error('移动图片集到文件夹失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 添加图片到图片集
   */
  static async addImages(req, res) {
    try {
      const { id } = req.params;
      const { uploadedFiles } = req;
      const ownerId = req.user?.id;

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json(errorResponse('请上传图片文件'));
      }

      const images = uploadedFiles.map((file, index) => ({
        imageUrl: file.imageUrl,
        thumbnailUrl: file.thumbnailUrl,
        fileName: file.originalName,
        fileSize: file.size,
        fileType: file.mimetype,
        width: file.width,
        height: file.height,
        sortOrder: index,
      }));

      const imageSet = await ImageSetService.addImages(parseInt(id), images, ownerId);

      res.json(successResponse(imageSet, '图片添加成功'));
    } catch (error) {
      Logger.error('添加图片失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 从图片集删除图片
   */
  static async removeImage(req, res) {
    try {
      const { id, imageId } = req.params;
      const ownerId = req.user?.id;

      const imageSet = await ImageSetService.removeImage(parseInt(id), parseInt(imageId), ownerId);

      res.json(successResponse(imageSet, '图片删除成功'));
    } catch (error) {
      Logger.error('删除图片失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }

  /**
   * 更新图片排序
   */
  static async updateImageOrder(req, res) {
    try {
      const { id } = req.params;
      const { imageOrders } = req.body;
      const ownerId = req.user?.id;

      const imageSet = await ImageSetService.updateImageOrder(parseInt(id), imageOrders, ownerId);

      res.json(successResponse(imageSet, '图片排序更新成功'));
    } catch (error) {
      Logger.error('更新图片排序失败:', error);
      if (error.message.includes('不存在')) {
        res.status(404).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse(error.message));
      }
    }
  }
}

module.exports = ImageSetMutationController;

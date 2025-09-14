const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger');

class KmlFileUtils {
  /**
   * 删除KML物理文件
   * @param {string} fileUrl - 文件URL
   */
  static async deletePhysicalFile(fileUrl) {
    if (!fileUrl) return true;

    // 允许 fileUrl 为 /uploads/... 的绝对路径或相对路径，优先使用原始路径重建绝对文件路径
    let filePath;
    if (fileUrl.startsWith('/')) {
      filePath = path.join(process.cwd(), fileUrl.replace(/^\/+/, ''));
    } else if (fileUrl.includes('/uploads/')) {
      // 处理可能的相对路径
      filePath = path.join(process.cwd(), fileUrl);
    } else {
      // 兼容旧实现：放在 uploads/kml 下
      const filename = path.basename(fileUrl);
      filePath = path.join(process.cwd(), 'uploads', 'kml', filename);
    }

    Logger.debug('准备删除KML文件', { fileUrl, filePath });

    try {
      await fs.access(filePath);
    } catch (accessError) {
      // 文件不存在：视为已删除，返回成功
      Logger.warn('KML文件不存在，忽略删除', { filePath });
      return true;
    }

    try {
      await fs.unlink(filePath);
      Logger.debug('删除KML文件成功', { filePath });
      return true;
    } catch (error) {
      // 对于不能忽略的错误，向上抛出以便调用方（事务）处理回滚
      Logger.error('删除KML文件失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除KML物理文件
   * @param {Array} kmlFiles - KML文件数组
   */
  static async batchDeletePhysicalFiles(kmlFiles) {
    const results = [];
    for (const kmlFile of kmlFiles) {
      try {
        const success = await this.deletePhysicalFile(kmlFile.file_url);
        results.push({ id: kmlFile.id, success });
      } catch (error) {
        Logger.warn(`删除KML文件失败 (ID: ${kmlFile.id}):`, error);
        results.push({ id: kmlFile.id, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * 验证KML文件类型
   * @param {Object} uploadedFile - 上传的文件对象
   * @returns {Object} 验证结果
   */
  static validateKmlFileType(uploadedFile) {
    if (!uploadedFile) {
      return { valid: false, message: '请上传KML文件' };
    }

    if (!uploadedFile.originalname.toLowerCase().endsWith('.kml')) {
      return { valid: false, message: '只支持KML格式文件' };
    }

    return { valid: true };
  }

  /**
   * 验证KML文件上传参数
   * @param {Object} body - 请求体
   * @returns {Object} 验证结果
   */
  static validateUploadParams(body) {
    const { title } = body;
    if (!title) {
      return { valid: false, message: '标题为必填项' };
    }
    return { valid: true };
  }

  /**
   * 验证ID列表参数
   * @param {Array} ids - ID数组
   * @returns {Object} 验证结果
   */
  static validateIdList(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { valid: false, message: '请提供有效的ID列表' };
    }
    return { valid: true };
  }
}

module.exports = KmlFileUtils;

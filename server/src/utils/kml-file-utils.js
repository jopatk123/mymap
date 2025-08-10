const path = require('path')
const fs = require('fs').promises
const Logger = require('../utils/logger')

class KmlFileUtils {
  /**
   * 删除KML物理文件
   * @param {string} fileUrl - 文件URL
   */
  static async deletePhysicalFile(fileUrl) {
    if (!fileUrl) return

    try {
      const filename = path.basename(fileUrl)
      const filePath = path.join(process.cwd(), 'uploads', 'kml', filename)
      Logger.debug('准备删除KML文件', { filename, filePath })
      
      // 检查文件是否存在
      try {
        await fs.access(filePath)
        Logger.debug('KML文件存在，开始删除')
      } catch (accessError) {
        Logger.warn('KML文件不存在', { filePath })
        return false
      }
      
      await fs.unlink(filePath)
      Logger.debug('删除KML文件成功', { filePath })
      return true
    } catch (error) {
      Logger.warn('删除KML文件失败:', error)
      return false
    }
  }

  /**
   * 批量删除KML物理文件
   * @param {Array} kmlFiles - KML文件数组
   */
  static async batchDeletePhysicalFiles(kmlFiles) {
    const results = []
    for (const kmlFile of kmlFiles) {
      try {
        const success = await this.deletePhysicalFile(kmlFile.file_url)
        results.push({ id: kmlFile.id, success })
      } catch (error) {
        Logger.warn(`删除KML文件失败 (ID: ${kmlFile.id}):`, error)
        results.push({ id: kmlFile.id, success: false, error: error.message })
      }
    }
    return results
  }

  /**
   * 验证KML文件类型
   * @param {Object} uploadedFile - 上传的文件对象
   * @returns {Object} 验证结果
   */
  static validateKmlFileType(uploadedFile) {
    if (!uploadedFile) {
      return { valid: false, message: '请上传KML文件' }
    }

    if (!uploadedFile.originalname.toLowerCase().endsWith('.kml')) {
      return { valid: false, message: '只支持KML格式文件' }
    }

    return { valid: true }
  }

  /**
   * 验证KML文件上传参数
   * @param {Object} body - 请求体
   * @returns {Object} 验证结果
   */
  static validateUploadParams(body) {
    const { title } = body
    if (!title) {
      return { valid: false, message: '标题为必填项' }
    }
    return { valid: true }
  }

  /**
   * 验证ID列表参数
   * @param {Array} ids - ID数组
   * @returns {Object} 验证结果
   */
  static validateIdList(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { valid: false, message: '请提供有效的ID列表' }
    }
    return { valid: true }
  }
}

module.exports = KmlFileUtils
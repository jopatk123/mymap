const PanoramaModel = require('../../models/panorama.model')
const Logger = require('../../utils/logger')

class PanoramaMutationService {
  static async createPanorama(data) {
    try {
      return await PanoramaModel.create(data)
    } catch (error) {
      Logger.error('创建全景图失败', error)
      throw error
    }
  }

  static async updatePanorama(id, updateData) {
    try {
      const panorama = await PanoramaModel.update(id, updateData)
      if (!panorama) {
        throw new Error('全景图不存在')
      }
      return panorama
    } catch (error) {
      Logger.error('更新全景图失败', error)
      throw error
    }
  }

  static async deletePanorama(id) {
    try {
      return await PanoramaModel.delete(id)
    } catch (error) {
      Logger.error('删除全景图失败', error)
      throw error
    }
  }

  static async batchDeletePanoramas(ids) {
    try {
      return await PanoramaModel.batchDelete(ids)
    } catch (error) {
      Logger.error('批量删除全景图失败', error)
      throw error
    }
  }

  static async movePanoramaToFolder(id, folderId) {
    try {
      return await PanoramaModel.update(id, { folder_id: folderId })
    } catch (error) {
      Logger.error('移动全景图失败', error)
      throw error
    }
  }

  static async batchMovePanoramasToFolder(ids, folderId) {
    try {
      return await PanoramaModel.batchMoveToFolder(ids, folderId)
    } catch (error) {
      Logger.error('批量移动全景图失败', error)
      throw error
    }
  }

  static async updatePanoramaVisibility(id, isVisible) {
    try {
      return await PanoramaModel.update(id, { is_visible: isVisible })
    } catch (error) {
      Logger.error('更新全景图可见性失败', error)
      throw error
    }
  }

  static async batchUpdatePanoramaVisibility(ids, isVisible) {
    try {
      return await PanoramaModel.batchUpdateVisibility(ids, isVisible)
    } catch (error) {
      Logger.error('批量更新全景图可见性失败', error)
      throw error
    }
  }
}

module.exports = PanoramaMutationService



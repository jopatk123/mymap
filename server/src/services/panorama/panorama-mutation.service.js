const PanoramaModel = require('../../models/panorama.model')
const Logger = require('../../utils/logger')

class PanoramaMutationService {
  static async createPanorama(data) {
    try {
      const created = await PanoramaModel.create({
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        latitude: data.lat,
        longitude: data.lng,
        gcj02Lat: data.gcj02Lat,
        gcj02Lng: data.gcj02Lng,
        fileSize: data.fileSize,
        fileType: data.fileType,
        folderId: data.folderId,
        isVisible: true,
        sortOrder: 0
      })
      return created
    } catch (error) {
      Logger.error('创建全景图失败', error)
      throw error
    }
  }

  static async updatePanorama(id, updateData) {
    try {
      const mapped = { ...updateData }
      // 读取当前记录，确保未提供时保留关键归属/状态字段
      const current = await PanoramaModel.findById(parseInt(id))
      if (!current) {
        throw new Error('全景图不存在')
      }
      if (!Object.prototype.hasOwnProperty.call(mapped, 'folderId')) {
        mapped.folderId = current.folder_id
      }
      if (!Object.prototype.hasOwnProperty.call(mapped, 'isVisible')) {
        mapped.isVisible = current.is_visible
      }
      if (!Object.prototype.hasOwnProperty.call(mapped, 'sortOrder')) {
        mapped.sortOrder = current.sort_order
      }
      if (Object.prototype.hasOwnProperty.call(mapped, 'lat')) {
        mapped.latitude = mapped.lat
        delete mapped.lat
      }
      if (Object.prototype.hasOwnProperty.call(mapped, 'lng')) {
        mapped.longitude = mapped.lng
        delete mapped.lng
      }
      // 调试：记录入参关键字段
      try {
        const debugKeys = Object.keys(mapped)
        // eslint-disable-next-line no-console
        console.log('[PanoramaMutationService.updatePanorama] id=%s keys=%o', id, debugKeys)
      } catch (_) {}
      const panorama = await PanoramaModel.update(id, mapped)
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
      return await PanoramaModel.update(id, { folderId })
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



const PanoramaModel = require('../models/panorama.model')
const { wgs84ToGcj02, gcj02ToWgs84 } = require('../utils/coordinate-transform')

class PanoramaService {
  // 获取全景图列表
  static async getPanoramas(options = {}) {
    try {
      const result = await PanoramaModel.findAll(options)
      
      // 转换坐标格式
      result.data = result.data.map(panorama => ({
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        gcj02Lat: panorama.gcj02_lat ? parseFloat(panorama.gcj02_lat) : null,
        gcj02Lng: panorama.gcj02_lng ? parseFloat(panorama.gcj02_lng) : null,
        fileSize: panorama.file_size,
        fileType: panorama.file_type,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }))
      
      return result
    } catch (error) {
      throw new Error(`获取全景图列表失败: ${error.message}`)
    }
  }
  
  // 根据ID获取全景图
  static async getPanoramaById(id) {
    try {
      const panorama = await PanoramaModel.findById(id)
      
      if (!panorama) {
        throw new Error('全景图不存在')
      }
      
      return {
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        gcj02Lat: panorama.gcj02_lat ? parseFloat(panorama.gcj02_lat) : null,
        gcj02Lng: panorama.gcj02_lng ? parseFloat(panorama.gcj02_lng) : null,
        fileSize: panorama.file_size,
        fileType: panorama.file_type,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }
    } catch (error) {
      throw new Error(`获取全景图详情失败: ${error.message}`)
    }
  }
  
  // 根据地图边界获取全景图
  static async getPanoramasByBounds(bounds) {
    try {
      const panoramas = await PanoramaModel.findByBounds(bounds)
      
      return panoramas.map(panorama => ({
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        gcj02Lat: panorama.gcj02_lat ? parseFloat(panorama.gcj02_lat) : null,
        gcj02Lng: panorama.gcj02_lng ? parseFloat(panorama.gcj02_lng) : null,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }))
    } catch (error) {
      throw new Error(`根据边界获取全景图失败: ${error.message}`)
    }
  }
  
  // 获取附近的全景图
  static async getNearbyPanoramas(lat, lng, radius = 1000) {
    try {
      const panoramas = await PanoramaModel.findNearby(lat, lng, radius)
      
      return panoramas.map(panorama => ({
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        distance: Math.round(panorama.distance), // 距离（米）
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }))
    } catch (error) {
      throw new Error(`获取附近全景图失败: ${error.message}`)
    }
  }
  
  // 创建全景图
  static async createPanorama(panoramaData) {
    try {
      const { lat, lng, title, description, imageUrl, thumbnailUrl, fileSize, fileType } = panoramaData
      
      // 坐标转换：WGS84 -> GCJ02
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(lng, lat)
      
      // 获取默认文件夹ID（如果没有指定文件夹，使用默认文件夹）
      const FolderModel = require('../models/folder.model')
      let defaultFolderId = null
      
      try {
        // 查找名为"默认文件夹"的文件夹
        const result = await FolderModel.findAllFlat()
        const defaultFolder = result.find(folder => folder.name === '默认文件夹')
        
        if (defaultFolder) {
          defaultFolderId = defaultFolder.id
        } else {
          // 如果没有默认文件夹，创建一个
          const newDefaultFolder = await FolderModel.create({
            name: '默认文件夹',
            parentId: null,
            isVisible: true,
            sortOrder: 0
          })
          defaultFolderId = newDefaultFolder.id
        }
      } catch (folderError) {
        console.warn('获取默认文件夹失败，将使用NULL:', folderError.message)
        defaultFolderId = null
      }
      
      // 明确处理folderId为0的情况（前端默认文件夹）
      let finalFolderId;
      if (panoramaData.folderId === 0) {
        finalFolderId = defaultFolderId;
      } else if (panoramaData.folderId !== undefined && panoramaData.folderId !== null) {
        finalFolderId = panoramaData.folderId;
      } else {
        finalFolderId = defaultFolderId;
      }
      
      const data = {
        title,
        description,
        imageUrl,
        thumbnailUrl,
        latitude: lat,
        longitude: lng,
        gcj02Lat,
        gcj02Lng,
        fileSize,
        fileType,
        folderId: finalFolderId
      }
      
      const panorama = await PanoramaModel.create(data)
      
      return {
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        gcj02Lat: parseFloat(panorama.gcj02_lat),
        gcj02Lng: parseFloat(panorama.gcj02_lng),
        fileSize: panorama.file_size,
        fileType: panorama.file_type,
        folderId: panorama.folder_id,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }
    } catch (error) {
      throw new Error(`创建全景图失败: ${error.message}`)
    }
  }
  
  // 更新全景图
  static async updatePanorama(id, panoramaData) {
    try {
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error('全景图不存在')
      }
      
      const { lat, lng, title, description, imageUrl, thumbnailUrl } = panoramaData
      
      // 如果坐标发生变化，重新计算GCJ02坐标
      let gcj02Lat = existingPanorama.gcj02_lat
      let gcj02Lng = existingPanorama.gcj02_lng
      
      if (lat !== undefined && lng !== undefined) {
        const [newGcj02Lng, newGcj02Lat] = wgs84ToGcj02(lng, lat)
        gcj02Lat = newGcj02Lat
        gcj02Lng = newGcj02Lng
      }
      
      const data = {
        title: title !== undefined ? title : existingPanorama.title,
        description: description !== undefined ? description : existingPanorama.description,
        imageUrl: imageUrl !== undefined ? imageUrl : existingPanorama.image_url,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingPanorama.thumbnail_url,
        latitude: lat !== undefined ? lat : existingPanorama.latitude,
        longitude: lng !== undefined ? lng : existingPanorama.longitude,
        gcj02Lat,
        gcj02Lng
      }
      
      const panorama = await PanoramaModel.update(id, data)
      
      return {
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        gcj02Lat: parseFloat(panorama.gcj02_lat),
        gcj02Lng: parseFloat(panorama.gcj02_lng),
        fileSize: panorama.file_size,
        fileType: panorama.file_type,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }
    } catch (error) {
      throw new Error(`更新全景图失败: ${error.message}`)
    }
  }
  
  // 删除全景图
  static async deletePanorama(id) {
    try {
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error('全景图不存在')
      }
      
      const success = await PanoramaModel.delete(id)
      
      if (!success) {
        throw new Error('删除失败')
      }
      
      return { success: true, message: '删除成功' }
    } catch (error) {
      throw new Error(`删除全景图失败: ${error.message}`)
    }
  }
  
  // 批量删除全景图
  static async batchDeletePanoramas(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('请提供有效的ID列表')
      }
      
      const deletedCount = await PanoramaModel.batchDelete(ids)
      
      return {
        success: true,
        deletedCount,
        message: `成功删除 ${deletedCount} 个全景图`
      }
    } catch (error) {
      throw new Error(`批量删除全景图失败: ${error.message}`)
    }
  }
  
  // 搜索全景图
  static async searchPanoramas(searchParams) {
    try {
      const result = await PanoramaModel.search(searchParams)
      
      // 转换坐标格式
      result.data = result.data.map(panorama => ({
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        distance: panorama.distance ? Math.round(panorama.distance) : null,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }))
      
      return result
    } catch (error) {
      throw new Error(`搜索全景图失败: ${error.message}`)
    }
  }
  
  // 获取统计信息
  static async getStats() {
    try {
      return await PanoramaModel.getStats()
    } catch (error) {
      throw new Error(`获取统计信息失败: ${error.message}`)
    }
  }
  
  // 坐标转换服务
  static convertCoordinate(lat, lng, from = 'wgs84', to = 'gcj02') {
    try {
      let result = { lat, lng }
      
      if (from === 'wgs84' && to === 'gcj02') {
        const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(lng, lat)
        result = { lat: gcj02Lat, lng: gcj02Lng }
      } else if (from === 'gcj02' && to === 'wgs84') {
        const [wgs84Lng, wgs84Lat] = gcj02ToWgs84(lng, lat)
        result = { lat: wgs84Lat, lng: wgs84Lng }
      }
      
      return {
        original: { lat, lng, system: from },
        converted: { lat: result.lat, lng: result.lng, system: to }
      }
    } catch (error) {
      throw new Error(`坐标转换失败: ${error.message}`)
    }
  }
  
  // 移动全景图到文件夹
  static async movePanoramaToFolder(id, folderId) {
    try {
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error('全景图不存在')
      }
      
      const panorama = await PanoramaModel.moveToFolder(id, folderId)
      
      return {
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        folderId: panorama.folder_id,
        isVisible: panorama.is_visible,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }
    } catch (error) {
      throw new Error(`移动全景图失败: ${error.message}`)
    }
  }

  // 批量移动全景图到文件夹
  static async batchMovePanoramasToFolder(ids, folderId) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('请提供有效的ID列表')
      }
      
      const movedCount = await PanoramaModel.batchMoveToFolder(ids, folderId)
      
      return {
        success: true,
        movedCount,
        message: `成功移动 ${movedCount} 个全景图`
      }
    } catch (error) {
      throw new Error(`批量移动全景图失败: ${error.message}`)
    }
  }

  // 更新全景图可见性
  static async updatePanoramaVisibility(id, isVisible) {
    try {
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error('全景图不存在')
      }
      
      const panorama = await PanoramaModel.updateVisibility(id, isVisible)
      
      return {
        id: panorama.id,
        title: panorama.title,
        description: panorama.description,
        imageUrl: panorama.image_url,
        thumbnailUrl: panorama.thumbnail_url,
        lat: parseFloat(panorama.latitude),
        lng: parseFloat(panorama.longitude),
        folderId: panorama.folder_id,
        isVisible: panorama.is_visible,
        createdAt: panorama.created_at,
        updatedAt: panorama.updated_at
      }
    } catch (error) {
      throw new Error(`更新全景图可见性失败: ${error.message}`)
    }
  }

  // 批量更新全景图可见性
  static async batchUpdatePanoramaVisibility(ids, isVisible) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('请提供有效的ID列表')
      }
      
      const updatedCount = await PanoramaModel.batchUpdateVisibility(ids, isVisible)
      
      return {
        success: true,
        updatedCount,
        message: `成功${isVisible ? '显示' : '隐藏'} ${updatedCount} 个全景图`
      }
    } catch (error) {
      throw new Error(`批量更新全景图可见性失败: ${error.message}`)
    }
  }
}

module.exports = PanoramaService
const PanoramaModel = require('../../models/panorama.model')
const FolderModel = require('../../models/folder.model')
const CoordinateService = require('../coordinate.service')
const Formatters = require('../../utils/formatters')
const Validators = require('../../utils/validators')
const Logger = require('../../utils/logger')
const { PANORAMA } = require('../../constants/errors')
const fs = require('fs').promises
const path = require('path')

class PanoramaMutationService {
  // 创建全景图
  static async createPanorama(panoramaData) {
    try {
      Logger.debug('创建全景图', panoramaData)
      
      const { lat, lng, title, description, imageUrl, thumbnailUrl, fileSize, fileType } = panoramaData
      
      // 验证坐标
      const coordValidation = Validators.validateCoordinate(lat, lng)
      if (!coordValidation.valid) {
        throw new Error(coordValidation.message)
      }
      
      // 坐标转换：WGS84 -> GCJ02
      const convertedCoords = CoordinateService.convertCoordinate(
        coordValidation.latitude, 
        coordValidation.longitude, 
        'wgs84', 
        'gcj02'
      )
      
      // 处理文件夹ID
      const folderId = await this._resolveFolderId(panoramaData.folderId)
      
      const data = {
        title: Validators.validateStringLength(title),
        description: Validators.validateStringLength(description, 1000),
        imageUrl,
        thumbnailUrl,
        latitude: coordValidation.latitude,
        longitude: coordValidation.longitude,
        gcj02Lat: convertedCoords.converted.lat,
        gcj02Lng: convertedCoords.converted.lng,
        fileSize,
        fileType,
        folderId
      }
      
      const panorama = await PanoramaModel.create(data)
      return Formatters.formatPanorama(panorama)
    } catch (error) {
      Logger.error('创建全景图失败', error)
      throw new Error(`${PANORAMA.CREATE_FAILED.message}: ${error.message}`)
    }
  }
  
  // 更新全景图
  static async updatePanorama(id, panoramaData) {
    try {
      Logger.debug('更新全景图', { id, ...panoramaData })
      
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error(PANORAMA.NOT_FOUND.message)
      }
      
      const { lat, lng, title, description, imageUrl, thumbnailUrl } = panoramaData
      
      // 准备更新数据
      const data = {
        title: title !== undefined ? Validators.validateStringLength(title) : existingPanorama.title,
        description: description !== undefined ? Validators.validateStringLength(description, 1000) : existingPanorama.description,
        imageUrl: imageUrl !== undefined ? imageUrl : existingPanorama.image_url,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingPanorama.thumbnail_url,
        latitude: existingPanorama.latitude,
        longitude: existingPanorama.longitude,
        gcj02Lat: existingPanorama.gcj02_lat,
        gcj02Lng: existingPanorama.gcj02_lng
      }
      
      // 如果坐标发生变化，重新计算GCJ02坐标
      if (lat !== undefined && lng !== undefined) {
        const coordValidation = Validators.validateCoordinate(lat, lng)
        if (!coordValidation.valid) {
          throw new Error(coordValidation.message)
        }
        
        const convertedCoords = CoordinateService.convertCoordinate(
          coordValidation.latitude, 
          coordValidation.longitude, 
          'wgs84', 
          'gcj02'
        )
        
        data.latitude = coordValidation.latitude
        data.longitude = coordValidation.longitude
        data.gcj02Lat = convertedCoords.converted.lat
        data.gcj02Lng = convertedCoords.converted.lng
      }
      
      const panorama = await PanoramaModel.update(id, data)
      return Formatters.formatPanorama(panorama)
    } catch (error) {
      Logger.error('更新全景图失败', error)
      throw new Error(`${PANORAMA.UPDATE_FAILED.message}: ${error.message}`)
    }
  }
  
  // 删除全景图
  static async deletePanorama(id) {
    try {
      Logger.debug('删除全景图', { id })
      
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error(PANORAMA.NOT_FOUND.message)
      }
      
      const success = await PanoramaModel.delete(id)
      
      if (!success) {
        throw new Error('删除失败')
      }
      
      // 删除相关的物理文件
      await this.deletePhysicalFiles(existingPanorama)
      
      return Formatters.formatSuccess(null, '删除成功')
    } catch (error) {
      Logger.error('删除全景图失败', error)
      throw new Error(`${PANORAMA.DELETE_FAILED.message}: ${error.message}`)
    }
  }
  
  // 批量删除全景图
  static async batchDeletePanoramas(ids) {
    try {
      Logger.debug('批量删除全景图', { ids })
      
      const validIds = Validators.validateIds(ids)
      if (validIds.length === 0) {
        throw new Error('请提供有效的ID列表')
      }
      
      // 先获取所有要删除的全景图信息，用于删除物理文件
      const panoramasToDelete = []
      for (const id of validIds) {
        try {
          const panorama = await PanoramaModel.findById(id)
          if (panorama) {
            panoramasToDelete.push(panorama)
          }
        } catch (error) {
          Logger.warn(`获取全景图信息失败 (ID: ${id})`, error)
        }
      }
      
      const deletedCount = await PanoramaModel.batchDelete(validIds)
      
      // 删除物理文件
      for (const panorama of panoramasToDelete) {
        await this.deletePhysicalFiles(panorama)
      }
      
      return Formatters.formatSuccess(
        { deletedCount },
        `成功删除 ${deletedCount} 个全景图`
      )
    } catch (error) {
      Logger.error('批量删除全景图失败', error)
      throw new Error(`批量删除全景图失败: ${error.message}`)
    }
  }
  
  // 移动全景图到文件夹
  static async movePanoramaToFolder(id, folderId) {
    try {
      Logger.debug('移动全景图到文件夹', { id, folderId })
      
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error(PANORAMA.NOT_FOUND.message)
      }
      
      const panorama = await PanoramaModel.moveToFolder(id, folderId)
      return Formatters.formatPanorama(panorama)
    } catch (error) {
      Logger.error('移动全景图失败', error)
      throw new Error(`移动全景图失败: ${error.message}`)
    }
  }
  
  // 批量移动全景图到文件夹
  static async batchMovePanoramasToFolder(ids, folderId) {
    try {
      Logger.debug('批量移动全景图到文件夹', { ids, folderId })
      
      const validIds = Validators.validateIds(ids)
      if (validIds.length === 0) {
        throw new Error('请提供有效的ID列表')
      }
      
      const movedCount = await PanoramaModel.batchMoveToFolder(validIds, folderId)
      
      return Formatters.formatSuccess(
        { movedCount },
        `成功移动 ${movedCount} 个全景图`
      )
    } catch (error) {
      Logger.error('批量移动全景图失败', error)
      throw new Error(`批量移动全景图失败: ${error.message}`)
    }
  }
  
  // 更新全景图可见性
  static async updatePanoramaVisibility(id, isVisible) {
    try {
      Logger.debug('更新全景图可见性', { id, isVisible })
      
      // 检查全景图是否存在
      const existingPanorama = await PanoramaModel.findById(id)
      if (!existingPanorama) {
        throw new Error(PANORAMA.NOT_FOUND.message)
      }
      
      const panorama = await PanoramaModel.updateVisibility(id, isVisible)
      return Formatters.formatPanorama(panorama)
    } catch (error) {
      Logger.error('更新全景图可见性失败', error)
      throw new Error(`更新全景图可见性失败: ${error.message}`)
    }
  }
  
  // 批量更新全景图可见性
  static async batchUpdatePanoramaVisibility(ids, isVisible) {
    try {
      Logger.debug('批量更新全景图可见性', { ids, isVisible })
      
      const validIds = Validators.validateIds(ids)
      if (validIds.length === 0) {
        throw new Error('请提供有效的ID列表')
      }
      
      const updatedCount = await PanoramaModel.batchUpdateVisibility(validIds, isVisible)
      
      return Formatters.formatSuccess(
        { updatedCount },
        `成功${isVisible ? '显示' : '隐藏'} ${updatedCount} 个全景图`
      )
    } catch (error) {
      Logger.error('批量更新全景图可见性失败', error)
      throw new Error(`批量更新全景图可见性失败: ${error.message}`)
    }
  }
  
  // 删除物理文件
  static async deletePhysicalFiles(panorama) {
    try {
      Logger.debug('删除全景图物理文件', { 
        id: panorama.id, 
        imageUrl: panorama.image_url, 
        thumbnailUrl: panorama.thumbnail_url 
      })
      
      // 删除主图片文件
      if (panorama.image_url) {
        try {
          const imagePath = path.join(process.cwd(), 'uploads', path.basename(panorama.image_url))
          await fs.unlink(imagePath)
          Logger.debug('删除主图片文件成功', { imagePath })
        } catch (error) {
          Logger.warn('删除主图片文件失败', { error: error.message, imageUrl: panorama.image_url })
        }
      }
      
      // 删除缩略图文件
      if (panorama.thumbnail_url) {
        try {
          const thumbnailPath = path.join(process.cwd(), 'uploads', path.basename(panorama.thumbnail_url))
          await fs.unlink(thumbnailPath)
          Logger.debug('删除缩略图文件成功', { thumbnailPath })
        } catch (error) {
          Logger.warn('删除缩略图文件失败', { error: error.message, thumbnailUrl: panorama.thumbnail_url })
        }
      }
    } catch (error) {
      Logger.error('删除物理文件时发生错误', error)
      // 不抛出错误，因为数据库记录已经删除，文件删除失败不应该影响整个删除操作
    }
  }
  
  // 解析文件夹ID（处理默认文件夹逻辑）
  static async _resolveFolderId(folderId) {
    try {
      // 如果明确指定了文件夹ID且不为0，直接返回
      if (folderId !== undefined && folderId !== null && folderId !== 0) {
        return folderId
      }
      
      // 查找或创建默认文件夹
      const result = await FolderModel.findAllFlat()
      const defaultFolder = result.find(folder => folder.name === '默认文件夹')
      
      if (defaultFolder) {
        return defaultFolder.id
      }
      
      // 创建默认文件夹
      const newDefaultFolder = await FolderModel.create({
        name: '默认文件夹',
        parentId: null,
        isVisible: true,
        sortOrder: 0
      })
      
      return newDefaultFolder.id
    } catch (error) {
      Logger.warn('获取默认文件夹失败，将使用NULL', error)
      return null
    }
  }
}

module.exports = PanoramaMutationService
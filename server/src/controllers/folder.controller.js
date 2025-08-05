const FolderModel = require('../models/folder.model')
const PanoramaModel = require('../models/panorama.model')
const Logger = require('../utils/logger')

class FolderController {
  // 获取文件夹树
  static async getFolders(req, res) {
    try {
      const folders = await FolderModel.findAll()
      
      // 为每个文件夹添加内容数量
      const addContentCount = async (folderList) => {
        for (const folder of folderList) {
          folder.panoramaCount = parseInt(await FolderModel.getPanoramaCount(folder.id))
          folder.videoPointCount = parseInt(await FolderModel.getVideoPointCount(folder.id))
          folder.kmlFileCount = parseInt(await FolderModel.getKmlFileCount(folder.id))
          folder.totalCount = folder.panoramaCount + folder.videoPointCount + folder.kmlFileCount
          if (folder.children) {
            await addContentCount(folder.children)
          }
        }
      }
      
      await addContentCount(folders)
      
      res.json({
        success: true,
        data: folders
      })
    } catch (error) {
      Logger.error('获取文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '获取文件夹失败: ' + error.message
      })
    }
  }

  // 获取文件夹列表（平铺）
  static async getFoldersFlat(req, res) {
    try {
      const folders = await FolderModel.findAllFlat()
      
      // 为每个文件夹添加内容计数
      for (const folder of folders) {
        folder.panoramaCount = parseInt(await FolderModel.getPanoramaCount(folder.id))
        folder.videoPointCount = parseInt(await FolderModel.getVideoPointCount(folder.id))
        folder.kmlFileCount = parseInt(await FolderModel.getKmlFileCount(folder.id))
        folder.totalCount = folder.panoramaCount + folder.videoPointCount + folder.kmlFileCount
      }
      
      res.json({
        success: true,
        data: folders
      })
    } catch (error) {
      Logger.error('获取文件夹列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取文件夹列表失败: ' + error.message
      })
    }
  }

  // 创建文件夹
  static async createFolder(req, res) {
    try {
      const { name, parentId, isVisible = true, sortOrder = 0 } = req.body
      
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '文件夹名称不能为空'
        })
      }
      
      const folder = await FolderModel.create({
        name: name.trim(),
        parentId: parentId || null,
        isVisible,
        sortOrder
      })
      
      res.json({
        success: true,
        data: folder,
        message: '文件夹创建成功'
      })
    } catch (error) {
      Logger.error('创建文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '创建文件夹失败: ' + error.message
      })
    }
  }

  // 更新文件夹
  static async updateFolder(req, res) {
    try {
      const { id } = req.params
      const { name, parentId, isVisible, sortOrder } = req.body
      
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '文件夹名称不能为空'
        })
      }
      
      const folder = await FolderModel.update(id, {
        name: name.trim(),
        parentId: parentId || null,
        isVisible,
        sortOrder
      })
      
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在'
        })
      }
      
      res.json({
        success: true,
        data: folder,
        message: '文件夹更新成功'
      })
    } catch (error) {
      Logger.error('更新文件夹失败:', error)
      res.status(500).json({
        success: false,
        message: '更新文件夹失败: ' + error.message
      })
    }
  }

  // 删除文件夹
  static async deleteFolder(req, res) {
    try {
      const { id } = req.params
      
      const success = await FolderModel.delete(id)
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在'
        })
      }
      
      res.json({
        success: true,
        message: '文件夹删除成功'
      })
    } catch (error) {
      Logger.error('删除文件夹失败:', error)
      res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  // 移动文件夹
  static async moveFolder(req, res) {
    try {
      const { id } = req.params
      const { parentId } = req.body
      
      const folder = await FolderModel.move(id, parentId || null)
      
      res.json({
        success: true,
        data: folder,
        message: '文件夹移动成功'
      })
    } catch (error) {
      Logger.error('移动文件夹失败:', error)
      res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  // 更新文件夹可见性
  static async updateFolderVisibility(req, res) {
    try {
      const { id } = req.params
      const { isVisible } = req.body
      
      const folder = await FolderModel.updateVisibility(id, isVisible)
      
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: '文件夹不存在'
        })
      }
      
      res.json({
        success: true,
        data: folder,
        message: `文件夹已${isVisible ? '显示' : '隐藏'}`
      })
    } catch (error) {
      Logger.error('更新文件夹可见性失败:', error)
      res.status(500).json({
        success: false,
        message: '更新文件夹可见性失败: ' + error.message
      })
    }
  }

  // 获取文件夹中的全景图
  static async getFolderPanoramas(req, res) {
    try {
      const { id } = req.params
      const { includeHidden = false } = req.query
      
      const panoramas = await PanoramaModel.findByFolder(id, {
        includeHidden: includeHidden === 'true'
      })
      
      res.json({
        success: true,
        data: panoramas
      })
    } catch (error) {
      Logger.error('获取文件夹全景图失败:', error)
      res.status(500).json({
        success: false,
        message: '获取文件夹全景图失败: ' + error.message
      })
    }
  }

  // 移动全景图到文件夹
  static async movePanoramasToFolder(req, res) {
    try {
      const { folderId } = req.params
      const { panoramaIds } = req.body
      
      if (!Array.isArray(panoramaIds) || panoramaIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要移动的全景图'
        })
      }
      
      const affectedRows = await PanoramaModel.batchMoveToFolder(panoramaIds, folderId || null)
      
      res.json({
        success: true,
        data: { affectedRows },
        message: `成功移动 ${affectedRows} 个全景图`
      })
    } catch (error) {
      Logger.error('移动全景图失败:', error)
      res.status(500).json({
        success: false,
        message: '移动全景图失败: ' + error.message
      })
    }
  }

  // 获取文件夹内容（所有文件类型）
  static async getFolderContents(req, res) {
    try {
      const { folderId } = req.params
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        includeHidden = false,
        fileType = 'all' // all, panorama, video, kml
      } = req.query

      const searchParams = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
        folderId: folderId === '0' ? null : (parseInt(folderId) || null), // 修复folderId处理
        includeHidden: includeHidden === 'true'
      }

      console.log('=== 后端调试信息 ===')
      console.log('请求参数:', { folderId, searchParams, fileType })

      let results = []
      let totalCount = 0

      if (fileType === 'all' || fileType === 'panorama') {
        try {
          const panoramaResult = await PanoramaModel.findAll(searchParams)
          const panoramasWithType = panoramaResult.data.map(item => ({
            ...item,
            fileType: 'panorama',
            displayType: '全景图',
            type: 'panorama' // 添加type字段以保持一致性
          }))
          results = results.concat(panoramasWithType)
          totalCount += panoramaResult.total || 0
          console.log('全景图查询结果:', panoramasWithType.length)
        } catch (error) {
          Logger.error('获取全景图数据失败:', error)
          // 不要直接返回错误，而是记录错误并继续处理其他类型
          console.error('全景图查询失败，跳过:', error.message)
        }
      }

      if (fileType === 'all' || fileType === 'video') {
        try {
          const VideoPointModel = require('../models/videoPoint.model')
          const videoResult = await VideoPointModel.findAll(searchParams)
          const videosWithType = videoResult.data.map(item => ({
            ...item,
            fileType: 'video',
            displayType: '视频点位',
            type: 'video' // 添加type字段以保持一致性
          }))
          results = results.concat(videosWithType)
          totalCount += videoResult.total || 0
          console.log('视频点位查询结果:', videosWithType.length)
        } catch (error) {
          Logger.error('获取视频点位数据失败:', error)
          console.error('视频点位查询失败，跳过:', error.message)
        }
      }

      if (fileType === 'all' || fileType === 'kml') {
        try {
          const KmlFileModel = require('../models/kmlFile.model')
          const kmlResult = await KmlFileModel.findAll(searchParams)
          const kmlsWithType = kmlResult.data.map(item => ({
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
            url: item.file_url
          }))
          results = results.concat(kmlsWithType)
          totalCount += kmlResult.total || 0
          console.log('KML文件查询结果:', kmlsWithType.length)
        } catch (error) {
          Logger.error('获取KML文件数据失败:', error)
          console.error('KML文件查询失败，跳过:', error.message)
        }
      }

      console.log('最终结果统计:', {
        total: results.length,
        panorama: results.filter(r => r.fileType === 'panorama').length,
        video: results.filter(r => r.fileType === 'video').length,
        kml: results.filter(r => r.fileType === 'kml').length
      })

      // 按创建时间排序
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: results.length
        }
      })
    } catch (error) {
      Logger.error('获取文件夹内容失败:', error)
      res.status(500).json({
        success: false,
        message: '获取文件夹内容失败: ' + error.message
      })
    }
  }
}

module.exports = FolderController
const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const { DOMParser } = require('xmldom')
const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/kml-basemap')
    try {
      // Ensure the upload directory exists (multer won't create nested dirs by default)
      fsSync.mkdirSync(uploadDir, { recursive: true })
    } catch (err) {
      // If creation fails, log a warning and let multer continue (it will error later)
      console.warn('Failed to create upload directory:', err && err.message)
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    cb(null, uniqueSuffix + '-' + originalName)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.google-earth.kml+xml' || 
        file.originalname.toLowerCase().endsWith('.kml')) {
      cb(null, true)
    } else {
      cb(new Error('只支持KML格式文件'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

// KML底图数据库模拟（实际项目中应使用真实数据库）
let kmlFiles = []
let kmlFileIdCounter = 1

/**
 * 解析KML文件内容
 */
function parseKMLFile(kmlContent) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(kmlContent, 'text/xml')
    const placemarks = doc.getElementsByTagName('Placemark')
    
    const points = []
    
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i]
      const nameNode = placemark.getElementsByTagName('name')[0]
      const descriptionNode = placemark.getElementsByTagName('description')[0]
      const coordinatesNode = placemark.getElementsByTagName('coordinates')[0]
      
      if (coordinatesNode) {
        const coordinates = coordinatesNode.textContent.trim()
        const [lng, lat, alt] = coordinates.split(',').map(Number)
        
        if (!isNaN(lng) && !isNaN(lat)) {
          points.push({
            id: `point_${Date.now()}_${i}`,
            name: nameNode ? nameNode.textContent : '',
            description: descriptionNode ? descriptionNode.textContent : '',
            latitude: lat,
            longitude: lng,
            altitude: alt || 0,
            visible: false
          })
        }
      }
    }
    
    return points
  } catch (error) {
    console.error('解析KML文件失败:', error)
    throw new Error('KML文件格式错误')
  }
}

/**
 * POST /api/kml-basemap/upload
 * 上传KML底图文件
 */
router.post('/upload', upload.single('kml'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择KML文件'
      })
    }

    const filePath = req.file.path
    const kmlContent = await fs.readFile(filePath, 'utf-8')
    
    // 解析KML文件获取点位数据
    const points = parseKMLFile(kmlContent)
    
    // 保存文件信息
    const fileInfo = {
      id: kmlFileIdCounter++,
      name: req.file.originalname,
      filename: req.file.filename,
      path: filePath,
      size: req.file.size,
      pointsCount: points.length,
      points: points,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    kmlFiles.push(fileInfo)
    
    res.json({
      success: true,
      message: 'KML文件上传成功',
      data: {
        id: fileInfo.id,
        name: fileInfo.name,
        pointsCount: fileInfo.pointsCount,
        createdAt: fileInfo.createdAt
      }
    })
    
  } catch (error) {
    console.error('上传KML文件失败:', error)
    res.status(500).json({
      success: false,
      message: error.message || '上传失败'
    })
  }
})

/**
 * GET /api/kml-basemap/files
 * 获取KML底图文件列表
 */
router.get('/files', (req, res) => {
  try {
    const fileList = kmlFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      pointsCount: file.pointsCount,
      createdAt: file.createdAt
    }))
    
    res.json({
      success: true,
      data: fileList
    })
    
  } catch (error) {
    console.error('获取KML文件列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件列表失败'
    })
  }
})

/**
 * GET /api/kml-basemap/:fileId/points
 * 获取指定KML文件的点位数据
 */
router.get('/:fileId/points', (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId)
    const file = kmlFiles.find(f => f.id === fileId)
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'KML文件不存在'
      })
    }
    
    res.json({
      success: true,
      data: file.points || []
    })
    
  } catch (error) {
    console.error('获取KML点位数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取点位数据失败'
    })
  }
})

/**
 * GET /api/kml-basemap/:fileId/download
 * 下载KML文件
 */
router.get('/:fileId/download', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId)
    const file = kmlFiles.find(f => f.id === fileId)
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'KML文件不存在'
      })
    }
    
    // 检查文件是否存在
    try {
      await fs.access(file.path)
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: '文件已被删除'
      })
    }
    
    res.download(file.path, file.name)
    
  } catch (error) {
    console.error('下载KML文件失败:', error)
    res.status(500).json({
      success: false,
      message: '下载失败'
    })
  }
})

/**
 * DELETE /api/kml-basemap/:fileId
 * 删除KML底图文件
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId)
    const fileIndex = kmlFiles.findIndex(f => f.id === fileId)
    
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'KML文件不存在'
      })
    }
    
    const file = kmlFiles[fileIndex]
    
    // 删除物理文件
    try {
      await fs.unlink(file.path)
    } catch (error) {
      console.warn('删除物理文件失败:', error.message)
    }
    
    // 从数组中移除
    kmlFiles.splice(fileIndex, 1)
    
    res.json({
      success: true,
      message: 'KML文件删除成功'
    })
    
  } catch (error) {
    console.error('删除KML文件失败:', error)
    res.status(500).json({
      success: false,
      message: '删除失败'
    })
  }
})

/**
 * POST /api/kml-basemap/export
 * 导出选中的KML点位数据
 */
router.post('/export', (req, res) => {
  try {
    const { points, format = 'csv', filename = 'exported_points' } = req.body
    
    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导出的点位数据'
      })
    }
    
    let content = ''
    let mimeType = ''
    let fileExtension = ''
    
    switch (format) {
      case 'csv':
        // 生成CSV内容
        const csvHeaders = ['序号', '名称', '描述', '纬度', '经度', '海拔']
        const csvRows = [
          csvHeaders.join(','),
          ...points.map((point, index) => [
            index + 1,
            `"${(point.name || '').replace(/"/g, '""')}"`,
            `"${(point.description || '').replace(/"/g, '""')}"`,
            point.latitude || '',
            point.longitude || '',
            point.altitude || 0
          ].join(','))
        ]
        content = '\uFEFF' + csvRows.join('\n') // 添加BOM
        mimeType = 'text/csv;charset=utf-8'
        fileExtension = 'csv'
        break
        
      case 'json':
        content = JSON.stringify({
          exportTime: new Date().toISOString(),
          totalCount: points.length,
          points: points
        }, null, 2)
        mimeType = 'application/json'
        fileExtension = 'json'
        break
        
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        })
    }
    
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`)
    res.send(content)
    
  } catch (error) {
    console.error('导出数据失败:', error)
    res.status(500).json({
      success: false,
      message: '导出失败'
    })
  }
})

module.exports = router

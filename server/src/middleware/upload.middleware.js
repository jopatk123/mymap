const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs').promises
const config = require('../config')
const { errorResponse } = require('../utils/response')

// 确保上传目录存在
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../../', config.upload.dir)
  const panoramaDir = path.join(uploadDir, 'panoramas')
  const thumbnailDir = path.join(uploadDir, 'thumbnails')
  
  try {
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.mkdir(panoramaDir, { recursive: true })
    await fs.mkdir(thumbnailDir, { recursive: true })
  } catch (error) {
    console.error('创建上传目录失败:', error)
  }
}

// 初始化上传目录
ensureUploadDir()

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../', config.upload.dir, 'panoramas')
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `panorama-${uniqueSuffix}${ext}`)
  }
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (!config.upload.allowedTypes.includes(file.mimetype)) {
    return cb(new Error('不支持的文件类型'), false)
  }
  
  cb(null, true)
}

// 创建multer实例
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1 // 单次只允许上传一个文件
  }
})

// 批量上传配置
const batchUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // 批量上传最多10个文件
  }
})

/**
 * 生成缩略图
 * @param {string} inputPath 原图路径
 * @param {string} outputPath 缩略图输出路径
 * @param {number} width 缩略图宽度
 * @param {number} height 缩略图高度
 */
const generateThumbnail = async (inputPath, outputPath, width = 300, height = 150) => {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath)
    
    return true
  } catch (error) {
    console.error('生成缩略图失败:', error)
    return false
  }
}

/**
 * 处理单个文件上传
 */
const handleSingleUpload = (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('文件上传错误:', err)
      
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'))
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'))
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json(errorResponse('意外的文件字段'))
          default:
            return res.status(400).json(errorResponse('文件上传失败'))
        }
      }
      
      return res.status(400).json(errorResponse(err.message))
    }
    
    if (!req.file) {
      return res.status(400).json(errorResponse('请选择要上传的文件'))
    }
    
    try {
      // 生成缩略图
      const thumbnailDir = path.join(__dirname, '../../', config.upload.dir, 'thumbnails')
      const thumbnailFilename = `thumb-${req.file.filename}`
      const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)
      
      const thumbnailGenerated = await generateThumbnail(req.file.path, thumbnailPath)
      
      // 构建文件URL
      const baseUrl = `${req.protocol}://${req.get('host')}`
      const imageUrl = `${baseUrl}/${config.upload.dir}/panoramas/${req.file.filename}`
      const thumbnailUrl = thumbnailGenerated 
        ? `${baseUrl}/${config.upload.dir}/thumbnails/${thumbnailFilename}`
        : null
      
      // 将文件信息添加到请求对象
      req.uploadedFile = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        imageUrl,
        thumbnailUrl
      }
      
      next()
    } catch (error) {
      console.error('处理上传文件失败:', error)
      
      // 清理已上传的文件
      try {
        await fs.unlink(req.file.path)
      } catch (cleanupError) {
        console.error('清理文件失败:', cleanupError)
      }
      
      return res.status(500).json(errorResponse('处理上传文件失败'))
    }
  })
}

/**
 * 处理批量文件上传
 */
const handleBatchUpload = (req, res, next) => {
  batchUpload.array('files', 10)(req, res, async (err) => {
    if (err) {
      console.error('批量文件上传错误:', err)
      
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json(errorResponse('文件大小超出限制'))
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json(errorResponse('文件数量超出限制'))
          default:
            return res.status(400).json(errorResponse('批量文件上传失败'))
        }
      }
      
      return res.status(400).json(errorResponse(err.message))
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(errorResponse('请选择要上传的文件'))
    }
    
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`
      const thumbnailDir = path.join(__dirname, '../../', config.upload.dir, 'thumbnails')
      
      // 处理每个上传的文件
      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          // 生成缩略图
          const thumbnailFilename = `thumb-${file.filename}`
          const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)
          
          const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath)
          
          return {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            imageUrl: `${baseUrl}/${config.upload.dir}/panoramas/${file.filename}`,
            thumbnailUrl: thumbnailGenerated 
              ? `${baseUrl}/${config.upload.dir}/thumbnails/${thumbnailFilename}`
              : null
          }
        })
      )
      
      req.uploadedFiles = uploadedFiles
      next()
    } catch (error) {
      console.error('处理批量上传文件失败:', error)
      
      // 清理已上传的文件
      if (req.files) {
        await Promise.all(
          req.files.map(async (file) => {
            try {
              await fs.unlink(file.path)
            } catch (cleanupError) {
              console.error('清理文件失败:', cleanupError)
            }
          })
        )
      }
      
      return res.status(500).json(errorResponse('处理批量上传文件失败'))
    }
  })
}

/**
 * 删除文件
 * @param {string} filePath 文件路径
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

/**
 * 获取文件信息
 * @param {string} filePath 文件路径
 */
const getFileInfo = async (filePath) => {
  try {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    }
  } catch (error) {
    console.error('获取文件信息失败:', error)
    return null
  }
}

module.exports = {
  handleSingleUpload,
  handleBatchUpload,
  generateThumbnail,
  deleteFile,
  getFileInfo
}
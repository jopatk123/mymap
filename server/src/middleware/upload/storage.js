const multer = require('multer')
const path = require('path')
const config = require('../../config')
const { uploadDir } = require('./config')

// 基础存储配置
const createStorage = (subDir, prefix = 'file') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(uploadDir, subDir)
      cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(file.originalname)
      cb(null, `${prefix}-${uniqueSuffix}${ext}`)
    }
  })
}

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (!config.upload.allowedTypes.includes(file.mimetype)) {
    return cb(new Error('不支持的文件类型'), false)
  }
  cb(null, true)
}

// 视频文件过滤器
const videoFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    return cb(null, true)
  }
  
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.ogv']
  const fileExtension = path.extname(file.originalname).toLowerCase()
  
  if (videoExtensions.includes(fileExtension)) {
    return cb(null, true)
  }
  
  return cb(new Error('不支持的文件类型'), false)
}

// KML文件过滤器
const kmlFileFilter = (req, file, cb) => {
  const isKmlExtension = file.originalname.toLowerCase().endsWith('.kml')
  const isAllowedMimeType = config.upload.kmlTypes.includes(file.mimetype)
  
  if (isKmlExtension && isAllowedMimeType) {
    return cb(null, true)
  }
  
  if (isKmlExtension) {
    return cb(null, true)
  }
  
  return cb(new Error('不支持的文件类型'), false)
}

// 创建multer实例
const createUploader = (storage, fileFilter, options = {}) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: options.fileSize || config.upload.maxFileSize,
      files: options.files || 1
    }
  })
}

// 各种上传实例
const uploaders = {
  // 单文件上传
  single: createUploader(
    createStorage('panoramas', 'panorama'),
    fileFilter
  ),
  
  // 批量上传
  batch: createUploader(
    createStorage('panoramas', 'panorama'),
    fileFilter,
    { files: 10 }
  ),
  
  // 视频上传
  video: createUploader(
    createStorage('videos', 'video'),
    videoFileFilter,
    { fileSize: 500 * 1024 * 1024 }
  ),
  
  // KML上传
  kml: createUploader(
    createStorage('kml', 'kml'),
    kmlFileFilter
  )
}

module.exports = {
  uploaders,
  createStorage,
  fileFilter,
  videoFileFilter,
  kmlFileFilter
}
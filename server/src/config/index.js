require('dotenv').config()

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development'
  },
  
  // 数据库配置
  database: {
    path: process.env.DB_PATH || './data/panorama_map.db'
  },
  
  // 文件上传配置
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB，支持大尺寸全景图
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv',
      'video/quicktime'
    ],
    kmlTypes: [
      'application/vnd.google-earth.kml+xml',
      'application/xml',
      'text/xml',
      'text/plain'  // 某些系统可能将KML识别为纯文本
    ]
  },
  
  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
    // 允许所有来源在生产环境中访问
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

module.exports = config
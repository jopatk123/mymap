require('dotenv').config()

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'panorama_map',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000
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
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

module.exports = config
require('dotenv').config();
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

const resolveDbPath = (inputPath) => {
  if (!inputPath) {
    return path.join(projectRoot, 'data', 'panorama_map.db');
  }
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(projectRoot, inputPath);
};

const resolveDbUrl = (inputUrl, resolvedPath) => {
  if (!inputUrl) {
    return `file:${resolvedPath}`;
  }
  if (!inputUrl.startsWith('file:')) {
    return inputUrl;
  }
  const rawPath = inputUrl.slice(5);
  const absolutePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(projectRoot, rawPath);
  return `file:${absolutePath}`;
};

const resolvedDbPath = resolveDbPath(process.env.DB_PATH);
const resolvedDbUrl = resolveDbUrl(process.env.DATABASE_URL, resolvedDbPath);

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development',
  },

  // 数据库配置
  database: {
    path: resolvedDbPath,
    url: resolvedDbUrl,
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
      'video/quicktime',
    ],
    kmlTypes: [
      'application/vnd.google-earth.kml+xml',
      'application/xml',
      'text/xml',
      'text/plain', // 某些系统可能将KML识别为纯文本
    ],
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
    // 允许所有来源在生产环境中访问
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    passwordPepper: process.env.PASSWORD_PEPPER || 'dev-pepper',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    name: process.env.SESSION_NAME || 'mymap.sid',
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 30 * 60 * 1000,
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;

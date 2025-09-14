const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建轮转写入流：按天命名 + 按大小切分，保留 14 天，gzip 压缩
// 文件名示例：access-2025-09-14-001.log.gz
const accessLogStream = rfs.createStream(
  (time, index) => {
    // 当没有时间（初始启动）时返回基础名
    if (!time) return 'access.log';
    const pad = (num) => String(num).padStart(2, '0');
    const year = time.getFullYear();
    const month = pad(time.getMonth() + 1);
    const day = pad(time.getDate());
    const idx = index ? `-${pad(index)}` : '';
    return `access-${year}-${month}-${day}${idx}.log`;
  },
  {
    size: '10M', // 单文件达到 10MB 时切分
    interval: '1d', // 至少每日轮转一次
    path: logDir, // 存放目录
    maxFiles: 14, // 仅保留 14 个轮转文件
    compress: 'gzip', // 使用 gzip 压缩历史文件
  }
);

// 自定义日志格式
morgan.token('real-ip', (req) => {
  return (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null)
  );
});

morgan.token('user-agent', (req) => {
  return req.headers['user-agent'] || 'Unknown';
});

// 开发环境日志格式
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// 生产环境日志格式
const prodFormat =
  ':real-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// 日志中间件配置
// 始终写入 access.log；在开发环境同时在控制台输出方便调试
const fileLogger = morgan(prodFormat, { stream: accessLogStream });
const consoleLogger = morgan(devFormat);
const loggerMiddleware = (req, res, next) => {
  // write to file
  fileLogger(req, res, (err) => {
    if (err) {
      const Logger = require('../utils/logger');
      Logger.error('fileLogger error:', err);
    }
  });
  // write to console in development
  if (process.env.NODE_ENV !== 'production') {
    consoleLogger(req, res, next);
  } else {
    next();
  }
};

// 错误日志记录器
const logError = (error, req = null) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: req
      ? {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          body: req.body,
          params: req.params,
          query: req.query,
          ip: req.ip,
        }
      : null,
  };

  const errorLogPath = path.join(logDir, 'error.log');
  fs.appendFileSync(errorLogPath, JSON.stringify(errorLog) + '\n');
  try {
    const Logger = require('../utils/logger');
    Logger.error('Error logged:', errorLog);
  } catch (_) {}
};

// 操作日志记录器
const logOperation = (operation, data, req = null) => {
  const timestamp = new Date().toISOString();
  const operationLog = {
    timestamp,
    operation,
    data,
    request: req
      ? {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }
      : null,
  };

  const operationLogPath = path.join(logDir, 'operation.log');
  fs.appendFileSync(operationLogPath, JSON.stringify(operationLog) + '\n');
};

module.exports = {
  loggerMiddleware,
  logError,
  logOperation,
};

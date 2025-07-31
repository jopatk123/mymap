const morgan = require('morgan')
const fs = require('fs')
const path = require('path')

// 创建日志目录
const logDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// 创建写入流
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
)

// 自定义日志格式
morgan.token('real-ip', (req) => {
  return req.headers['x-real-ip'] || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null)
})

morgan.token('user-agent', (req) => {
  return req.headers['user-agent'] || 'Unknown'
})

// 开发环境日志格式
const devFormat = ':method :url :status :response-time ms - :res[content-length]'

// 生产环境日志格式
const prodFormat = ':real-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'

// 日志中间件配置
const loggerMiddleware = process.env.NODE_ENV === 'production'
  ? morgan(prodFormat, { stream: accessLogStream })
  : morgan(devFormat)

// 错误日志记录器
const logError = (error, req = null) => {
  const timestamp = new Date().toISOString()
  const errorLog = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: req ? {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip
    } : null
  }
  
  const errorLogPath = path.join(logDir, 'error.log')
  fs.appendFileSync(errorLogPath, JSON.stringify(errorLog) + '\n')
  
  console.error('Error logged:', errorLog)
}

// 操作日志记录器
const logOperation = (operation, data, req = null) => {
  const timestamp = new Date().toISOString()
  const operationLog = {
    timestamp,
    operation,
    data,
    request: req ? {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    } : null
  }
  
  const operationLogPath = path.join(logDir, 'operation.log')
  fs.appendFileSync(operationLogPath, JSON.stringify(operationLog) + '\n')
}

module.exports = {
  loggerMiddleware,
  logError,
  logOperation
}
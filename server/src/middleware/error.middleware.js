const { errorResponse } = require('../utils/response')

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json(errorResponse(`接口 ${req.originalUrl} 不存在`, 404))
}

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('全局错误:', err)
  try {
    const fs = require('fs')
    const path = require('path')
    const logDir = path.join(__dirname, '../../logs')
    fs.mkdirSync(logDir, { recursive: true })
    const logPath = path.join(logDir, 'error-debug.log')

    // 拷贝并脱敏 headers
    const headers = Object.assign({}, req && req.headers ? req.headers : {})
    if (headers.authorization) headers.authorization = '[REDACTED]'
    if (headers.cookie) headers.cookie = '[REDACTED]'

    // 截断请求 body（防止写入超大对象）
    let bodyPreview = null
    try {
      if (req && req.body) {
        // JSON 序列化一遍以去除循环引用，随后截断
        const s = JSON.stringify(req.body)
        bodyPreview = s.length > 2000 ? s.slice(0, 2000) + '...[truncated]' : s
      }
    } catch (e) {
      try { bodyPreview = String(req && req.body).slice(0, 2000) } catch (__) { bodyPreview = null }
    }

    // app-config 预览（小片段）
    let appConfigPreview = null
    try {
      const cfgPath = path.join(__dirname, '../config/app-config.json')
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf8')
        appConfigPreview = raw.length > 2000 ? raw.slice(0, 2000) + '...[truncated]' : raw
      }
    } catch (e) {
      // ignore
    }

    // 最近的 response-debug.log 快照（最后若干行）
    let responseDebug = null
    try {
      const respPath = path.join(__dirname, '../../logs/response-debug.log')
      if (fs.existsSync(respPath)) {
        const content = fs.readFileSync(respPath, 'utf8')
        const lines = content.trim().split(/\r?\n/)
        responseDebug = lines.slice(-20)
      }
    } catch (e) {
      // ignore
    }

    // 额外调试信息
    let clientIp = null
    try {
      clientIp = (req && (req.ip || req.headers['x-forwarded-for'] || req.connection && req.connection.remoteAddress)) || null
    } catch (e) {
      clientIp = null
    }

    let params = null
    try { params = req && req.params ? JSON.stringify(req.params) : null } catch (e) { params = null }

    let query = null
    try { query = req && req.query ? JSON.stringify(req.query) : null } catch (e) { query = null }

    // response status and any res.locals preview if available
    let responseStatus = null
    let resPreview = null
    try {
      responseStatus = res && typeof res.statusCode === 'number' ? res.statusCode : null
      if (res && res.locals && res.locals._debugBody) {
        const s = JSON.stringify(res.locals._debugBody)
        resPreview = s.length > 1000 ? s.slice(0, 1000) + '...[truncated]' : s
      }
    } catch (e) {
      responseStatus = responseStatus || null
      resPreview = resPreview || null
    }

    // process info
    let processUptime = null
    let memoryUsage = null
    try {
      processUptime = process.uptime()
      memoryUsage = process.memoryUsage && typeof process.memoryUsage === 'function' ? process.memoryUsage() : null
    } catch (e) {
      processUptime = null
      memoryUsage = null
    }

    // app-config stat
    let appConfigStat = null
    try {
      const cfgPath = path.join(__dirname, '../config/app-config.json')
      if (fs.existsSync(cfgPath)) {
        const st = fs.statSync(cfgPath)
        appConfigStat = { mtime: st.mtime && st.mtime.toISOString ? st.mtime.toISOString() : String(st.mtime), size: st.size }
      }
    } catch (e) {
      appConfigStat = null
    }

    // logs directory recent files
    let logsList = null
    try {
      const files = fs.readdirSync(path.join(__dirname, '../../logs'))
      logsList = files.slice(-10).map((f) => {
        try {
          const p = path.join(__dirname, '../../logs', f)
          const st = fs.statSync(p)
          return { name: f, size: st.size, mtime: st.mtime && st.mtime.toISOString ? st.mtime.toISOString() : String(st.mtime) }
        } catch (e) {
          return { name: f }
        }
      })
    } catch (e) {
      logsList = null
    }

    const entry = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      node: process.version,
      cwd: process.cwd(),
      method: req && req.method,
      url: req && req.originalUrl,
      route: req && req.route && req.route.path,
      clientIp,
      params,
      query,
      headers,
      bodyPreview,
      resPreview,
      responseStatus,
      appConfigPreview,
      appConfigStat,
      responseDebug,
      logsList,
      processUptime,
      memoryUsage,
      error: err && err.stack ? err.stack : (err && err.message) || String(err)
    }

    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n')
  } catch (e) {
    // ignore logging errors
  }
  
  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(errorResponse('数据已存在', 409))
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json(errorResponse('关联数据不存在', 400))
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(errorResponse('无效的访问令牌', 401))
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(errorResponse('访问令牌已过期', 401))
  }
  
  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json(errorResponse(err.message, 400))
  }
  
  // 语法错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json(errorResponse('请求体格式错误', 400))
  }
  
  // 默认服务器错误
  const statusCode = err.statusCode || err.status || 500
  const message = err.message || '服务器内部错误'
  
  res.status(statusCode).json(errorResponse(message, statusCode))
}

/**
 * 异步错误捕获包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
}
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
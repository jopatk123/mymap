const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const path = require('path')
const fs = require('fs')
const config = require('./config')
const routes = require('./routes')
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware')
const { loggerMiddleware } = require('./middleware/logger.middleware')

// 创建Express应用
const app = express()

// 安全中间件
// - 关闭在非 HTTPS 环境下会产生告警/影响行为的安全头（HSTS/COOP/OAC/COEP）
// - 暂时关闭 CSP，由前置 Nginx 统一控制（避免意外携带 upgrade-insecure-requests）
app.use(helmet({
  hsts: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}))

// CORS配置
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// 压缩响应
app.use(compression())

// 请求日志
app.use(loggerMiddleware)

// 解析请求体
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务，带CORS支持
app.use(`/${config.upload.dir}`, 
  express.static(path.join(__dirname, '../', config.upload.dir), {
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type')
    }
  })
)

// 设置信任代理（用于获取真实IP）
app.set('trust proxy', true)

// API路由
app.use('/api', routes)

// 静态文件服务（前端构建文件）
const distDir = path.join(__dirname, '../../client/dist')
app.use(express.static(distDir, {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*')
  }
}))

// 根路径与 SPA 回退（容器中优先返回前端页面；若不存在则退化为 /api）
const indexHtmlPath = path.join(distDir, 'index.html')

app.get('/', (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath)
  }
  return res.redirect('/api')
})

// 其余非 /api 路径交给前端（若构建产物存在）
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath)
  }
  return next()
})

// 404处理
app.use(notFoundHandler)

// 全局错误处理
app.use(errorHandler)

module.exports = app
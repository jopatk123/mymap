/**
 * KML底图功能集成脚本
 * 确保所有必要的路由和中间件正确集成到主应用中
 */

// 在 server/src/server.js 中添加以下代码

// 1. 导入必要的模块
const { ensureUploadDirectories } = require('./utils/init-directories')
const kmlBaseMapRoutes = require('./routes/kml-basemap')

// 2. 在应用启动前初始化目录
ensureUploadDirectories()

// 3. 注册KML底图路由（在其他路由之前）
app.use('/api/kml-basemap', kmlBaseMapRoutes)

// 4. 添加错误处理中间件（如果尚未存在）
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制'
      })
    }
  }
  
  console.error('服务器错误:', error)
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  })
})

console.log('KML底图功能已集成')

module.exports = {
  // 导出必要的功能供其他模块使用
  ensureUploadDirectories,
  kmlBaseMapRoutes
}

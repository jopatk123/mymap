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

// 错误处理应在 app.js 中集中处理，避免在集成脚本中直接操作 app 或未定义的依赖。
const Logger = require('../utils/logger')
Logger.info('KML底图模块加载（integration script）。')

module.exports = {
  // 导出必要的功能供其他模块使用
  ensureUploadDirectories,
  kmlBaseMapRoutes
}

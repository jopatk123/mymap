const app = require('./app')
const config = require('./config')
const { testConnection, initTables, closePool } = require('./config/database')

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection()
    if (!dbConnected) {
      console.error('数据库连接失败，服务器启动中止')
      process.exit(1)
    }
    
    // 初始化数据库表
    await initTables()
    
    // 启动HTTP服务器
    const server = app.listen(config.server.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    地图全景系统服务器                          ║
╠══════════════════════════════════════════════════════════════╣
║ 环境: ${config.server.env.padEnd(20)} ║
║ 端口: ${config.server.port.toString().padEnd(20)} ║
║ 数据库: ${config.database.host}:${config.database.port.toString().padEnd(15)} ║
║ 上传目录: ${config.upload.dir.padEnd(18)} ║
╠══════════════════════════════════════════════════════════════╣
║ API文档: http://localhost:${config.server.port}/api                    ║
║ 健康检查: http://localhost:${config.server.port}/api/health              ║
╚══════════════════════════════════════════════════════════════╝
      `)
    })
    
    // 优雅关闭处理
    const gracefulShutdown = (signal) => {
      console.log(`\n收到 ${signal} 信号，开始优雅关闭服务器...`)
      
      server.close(async () => {
        console.log('HTTP服务器已关闭')
        
        // 关闭数据库连接池
        await closePool()
        
        console.log('服务器已完全关闭')
        process.exit(0)
      })
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('强制关闭服务器')
        process.exit(1)
      }, 10000)
    }
    
    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error)
      gracefulShutdown('uncaughtException')
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason)
      console.error('Promise:', promise)
      gracefulShutdown('unhandledRejection')
    })
    
  } catch (error) {
    console.error('服务器启动失败:', error)
    process.exit(1)
  }
}

// 启动服务器
startServer()
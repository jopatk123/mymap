const app = require('./app');
const config = require('./config');
const { testConnection, initTables, closeDatabase } = require('./config/database');
const { initDefaultFolder } = require('./init/init-default-folder');
const Logger = require('./utils/logger');

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      Logger.error('数据库连接失败，服务器启动中止');
      process.exit(1);
    }

    // 初始化数据库表
    await initTables();

    // 初始化默认文件夹（返回值当前未使用）
    const _defaultFolderId = await initDefaultFolder();
    void _defaultFolderId;

    // 启动HTTP服务器
    const server = app.listen(config.server.port, () => {
      Logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                    地图全景系统服务器                          ║
╠══════════════════════════════════════════════════════════════╣
║ 环境: ${config.server.env.padEnd(20)} ║
║ 端口: ${config.server.port.toString().padEnd(20)} ║
║ 数据库: SQLite (${config.database.path.padEnd(15)}) ║
║ 上传目录: ${config.upload.dir.padEnd(18)} ║
╠══════════════════════════════════════════════════════════════╣
║ API文档: http://localhost:${config.server.port}/api                    ║
║ 健康检查: http://localhost:${config.server.port}/api/health              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });

    // --- WebSocket: 用于向所有连接的客户端广播配置更新（如初始显示设置）
    try {
      const WebSocket = require('ws');
      const wss = new WebSocket.Server({ server });
      // 把 wss 暴露到 app.locals，便于其他模块（如 ConfigService）使用
      app.locals.wss = wss;

      Logger.info('WebSocket 服务已启动，监听配置更新广播');

      wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        Logger.info(`WebSocket 客户端已连接: ${clientIp}`);
        
        // 心跳检测
        ws.isAlive = true;
        ws.on('pong', () => (ws.isAlive = true));
        
        ws.on('close', () => {
          Logger.info(`WebSocket 客户端已断开: ${clientIp}`);
        });
        
        ws.on('error', (err) => {
          Logger.warn(`WebSocket 客户端错误 ${clientIp}:`, err.message);
        });
      });

      // 定期清理死连接
      const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
          if (ws.isAlive === false) {
            Logger.info('清理死连接');
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping(() => {});
        });
      }, 30000);

      wss.on('close', () => {
        Logger.info('WebSocket 服务已关闭');
        clearInterval(interval);
      });

      Logger.info(`WebSocket 服务已成功启动，当前连接数: ${wss.clients.size}`);
    } catch (e) {
      Logger.warn('无法启动 WebSocket 服务，实时广播功能不可用:', e && e.message ? e.message : e);
    }

    // 优雅关闭处理
    const gracefulShutdown = (_signal) => {
      server.close(async () => {
        // 关闭数据库连接
        await closeDatabase();

        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        Logger.error('强制关闭服务器');
        process.exit(1);
      }, 10000);
    };

    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      Logger.error('未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('未处理的Promise拒绝:', reason);
      Logger.error('Promise:', promise);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    Logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer();

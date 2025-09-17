const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { loggerMiddleware } = require('./middleware/logger.middleware');

// 创建Express应用
const app = express();

// 关闭 ETag，减少 304/空体对前端 axios 解析的影响
app.disable('etag');

// 安全中间件
// - 关闭在非 HTTPS 环境下会产生告警/影响行为的安全头（HSTS/COOP/OAC/COEP）
// - 暂时关闭 CSP，由前置 Nginx 统一控制（避免意外携带 upgrade-insecure-requests）
app.use(
  helmet({
    hsts: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// CORS配置
app.use(
  cors({
    origin: config.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 压缩响应
app.use(compression());

// 请求日志
app.use(loggerMiddleware);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务，带CORS支持
app.use(
  `/${config.upload.dir}`,
  express.static(path.join(__dirname, '../', config.upload.dir), {
    setHeaders: (res, _path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    },
  })
);

// 设置信任代理（用于获取真实IP）
app.set('trust proxy', true);

// API路由
// 开发时：额外记录 GET/PUT /api/kml-files/:id/styles 的请求/响应，帮助复现前端 500 问题
if (config.server.env !== 'production') {
  const responseDebugPath = path.join(__dirname, '../../server/logs/response-debug.log');
  try {
    // 确保目录存在
    fs.mkdirSync(path.dirname(responseDebugPath), { recursive: true });
  } catch (e) {
    // ignore
  }

  app.use((req, res, next) => {
    // 开发时：匹配并记录与 KML 文件相关的重要端点，方便复现前端 500
    const isKmlListGet = req.method === 'GET' && req.path === '/api/kml-files';
    const isKmlStyles =
      (req.method === 'PUT' || req.method === 'GET') &&
      /^\/api\/kml-files\/\d+\/styles$/.test(req.path);
    const isAnyKmlFileOp =
      (req.method === 'GET' || req.method === 'PUT') && req.path.startsWith('/api/kml-files');

    if (isKmlListGet || isKmlStyles || isAnyKmlFileOp) {
      const start = Date.now();
      // 捕获请求快照（包括 query、body 与额外头部以便对比）
      const requestSnapshot = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        headers: {
          'user-agent': req.get('user-agent') || '',
          host: req.get('host') || '',
          origin: req.get('origin') || '',
          referer: req.get('referer') || '',
          cookie: req.get('cookie') || '',
          authorization: req.get('authorization') || '',
          'x-xsrf-token': req.get('x-xsrf-token') || req.get('x-xsrfheadername') || '',
        },
        query: req.query || {},
        body: req.body || {},
      };

      // 捕获 response body：在 finish 时写入，避免丢失未通过 res.send 的情况
      let chunks = [];
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);

      try {
        res.write = function (chunk) {
          try {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          } catch (e) {}
          return originalWrite(chunk);
        };
        res.end = function (chunk) {
          try {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          } catch (e) {}
          return originalEnd(chunk);
        };
      } catch (e) {
        // ignore
      }

      const writeDebug = () => {
        try {
          const bodyBuf = Buffer.concat(chunks || []);
          let bodyStr = '';
          if (bodyBuf && bodyBuf.length) {
            bodyStr = bodyBuf.toString('utf8');
          }
          const entry = {
            request: requestSnapshot,
            response: {
              status: res.statusCode,
              body: bodyStr,
            },
            durationMs: Date.now() - start,
          };
          fs.appendFileSync(responseDebugPath, JSON.stringify(entry) + '\n');
        } catch (err) {
          // 不要影响正常响应
        }
      };

      res.on('finish', writeDebug);
      res.on('close', writeDebug);
    }
    next();
  });
}

// API路由（为防缓存增加 no-store/no-cache）
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, routes);

// 静态文件服务（前端构建文件）
const distDir = path.join(__dirname, '../../client/dist');
app.use(
  express.static(distDir, {
    setHeaders: (res, _filePath) => {
      res.set('Access-Control-Allow-Origin', '*');
    },
  })
);

// 根路径与 SPA 回退（容器中优先返回前端页面；若不存在则退化为 /api）
const indexHtmlPath = path.join(distDir, 'index.html');

app.get('/', (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  return res.redirect('/api');
});

// 其余非 /api 路径交给前端（若构建产物存在）
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  return next();
});

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

module.exports = app;

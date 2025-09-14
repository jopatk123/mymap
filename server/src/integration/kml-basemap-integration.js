/**
 * KML底图功能集成脚本
 *
 * 说明：此脚本不应在模块加载时直接访问或修改未定义的全局应用实例（例如直接使用 `app`）。
 * 为了避免在被 lint 扫描时触发未定义变量错误，这里改为导出一个注册函数，由主应用在启动时调用并传入 app。
 */

const { ensureUploadDirectories } = require('../utils/init-directories');
const kmlBaseMapRoutes = require('../routes/kml-basemap');
const Logger = require('../utils/logger');

function registerKmlBasemap(app) {
  if (!app || typeof app.use !== 'function') {
    throw new Error('registerKmlBasemap: 必须传入 Express 的 app 实例');
  }

  // 在应用启动前初始化上传目录
  try {
    ensureUploadDirectories();
  } catch (e) {
    // 初始化目录失败不应阻塞主应用启动，记录日志并继续
    Logger.warn('初始化上传目录失败:', e && e.message);
  }

  // 注册路由
  app.use('/api/kml-basemap', kmlBaseMapRoutes);
  Logger.info('KML底图模块已通过 registerKmlBasemap 注册。');
}

module.exports = {
  registerKmlBasemap,
  ensureUploadDirectories,
  kmlBaseMapRoutes,
};

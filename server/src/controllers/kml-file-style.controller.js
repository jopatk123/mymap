const KmlFileModel = require('../models/kml-file.model');
const ConfigService = require('../services/config.service');
const Logger = require('../utils/logger');
const { logError, logOperation } = require('../middleware/logger.middleware');

class KmlFileStyleController {
  static async getKmlFileStyles(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, message: '无效的KML文件ID' });
      }
      // 记录读取样式的操作
      try {
        logOperation('getKmlFileStyles', { id }, req);
      } catch (e) {}
      const styles = await ConfigService.getKmlStyles(id);
      // 防缓存，确保每次都拉到最新
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ success: true, data: styles, message: '获取KML文件样式配置成功' });
    } catch (error) {
      Logger.error(`获取KML文件样式配置失败 (ID: ${req.params.id}):`, error);
      try {
        logError(error, req);
      } catch (e) {}
      // 兜底：返回默认样式，避免前端出现 500
      try {
        Logger.info(`尝试为KML文件 ${req.params.id} 返回默认样式配置`);
        const fallback = await ConfigService.getKmlStyles('default');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res
          .status(200)
          .json({ success: true, data: fallback, message: '返回默认KML样式配置' });
      } catch (fallbackError) {
        Logger.error(`获取默认样式配置也失败 (ID: ${req.params.id}):`, fallbackError);
        res.status(500).json({
          success: false,
          message: '获取样式配置失败',
          error: process.env.NODE_ENV === 'development' ? error.message : '内部服务器错误',
        });
      }
    }
  }

  static async updateKmlFileStyles(req, res) {
    try {
      const { id } = req.params;
      const styleConfig = req.body;
      // 记录更新操作的入参，便于事后溯源
      try {
        logOperation('updateKmlFileStyles', { id, body: styleConfig }, req);
      } catch (e) {}
      const kmlFile = await KmlFileModel.findById(parseInt(id));
      if (!kmlFile) {
        return res.status(404).json({ success: false, message: 'KML文件不存在' });
      }
      const success = await ConfigService.updateKmlStyles(id, styleConfig);
      if (success) {
        const styles = await ConfigService.getKmlStyles(id);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json({ success: true, message: '样式配置更新成功', data: styles });
      } else {
        // 记录更多调试上下文到 error-debug.log
        try {
          const fs = require('fs').promises;
          const path = require('path');
          const logsDir = path.join(__dirname, '../../logs');
          const errLogPath = path.join(logsDir, 'error-debug.log');
          const configPath = path.join(__dirname, '../config/app-config.json');
          let configStat = null;
          let configPreview = null;
          try {
            configStat = await fs.stat(configPath);
          } catch (e) {}
          try {
            const txt = await fs.readFile(configPath, 'utf8');
            configPreview = txt.slice(0, 2000);
          } catch (e) {
            configPreview = `read error: ${e.message}`;
          }
          const entry = `\n[${new Date().toISOString()}] updateKmlFileStyles: saveConfig returned false for id=${id}\nrequestBody=${JSON.stringify(
            styleConfig
          )}\nconfigStat=${JSON.stringify(configStat)}\nconfigPreview=${configPreview}\n`;
          await fs.appendFile(errLogPath, entry, { encoding: 'utf8' });
        } catch (e) {}
        throw new Error('保存配置失败');
      }
    } catch (error) {
      Logger.error('更新KML文件样式配置失败:', error);
      try {
        logError(error, req);
      } catch (e) {}
      // 同时把最近的 error-debug.log 行追加到 error.log 以便前端开发者快速查看
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const logsDir = path.join(__dirname, '../../logs');
        const errDebugPath = path.join(logsDir, 'error-debug.log');
        const errPath = path.join(logsDir, 'error.log');
        let tail = '';
        try {
          const data = await fs.readFile(errDebugPath, 'utf8');
          tail = data.slice(-8000);
        } catch (e) {
          tail = `no debug log: ${e.message}`;
        }
        const entry = `\n[${new Date().toISOString()}] controller caught error for updateKmlFileStyles id=${
          req.params.id
        }: ${error && error.stack ? error.stack : error}\nrecentDebug=${tail}\n`;
        await fs.appendFile(errPath, entry, { encoding: 'utf8' });
      } catch (e) {}
      // 更新失败也设置 no-store 以防缓存错误态
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(500).json({ success: false, message: '更新样式配置失败', error: error.message });
    }
  }

  static async resetKmlFileStyles(req, res) {
    try {
      const { id } = req.params;
      try {
        logOperation('resetKmlFileStyles', { id }, req);
      } catch (e) {}
      const kmlFile = await KmlFileModel.findById(parseInt(id));
      if (!kmlFile) {
        return res.status(404).json({ success: false, message: 'KML文件不存在' });
      }
      const defaultConfig = ConfigService.getDefaultConfig();
      const success = await ConfigService.updateKmlStyles(id, defaultConfig.kmlStyles.default);
      if (success) {
        const styles = await ConfigService.getKmlStyles('default');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json({ success: true, message: '样式配置已重置为默认', data: styles });
      } else {
        throw new Error('重置配置失败');
      }
    } catch (error) {
      Logger.error('重置KML文件样式失败:', error);
      try {
        logError(error, req);
      } catch (e) {}
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(500).json({ success: false, message: '重置样式配置失败', error: error.message });
    }
  }

  static async batchUpdateKmlFileStyles(req, res) {
    try {
      const { styleConfigs } = req.body;
      if (!Array.isArray(styleConfigs) || styleConfigs.length === 0) {
        return res.status(400).json({ success: false, message: '请提供有效的样式配置列表' });
      }
      const results = [];
      for (const config of styleConfigs) {
        if (config.kmlFileId) {
          try {
            const success = await ConfigService.updateKmlStyles(config.kmlFileId, config.styles);
            if (success) {
              const styles = await ConfigService.getKmlStyles(config.kmlFileId);
              results.push({ kmlFileId: config.kmlFileId, styles });
            }
          } catch (error) {
            Logger.warn(`更新KML文件样式失败 (ID: ${config.kmlFileId}):`, error);
          }
        }
      }
      res.json({
        success: true,
        message: `成功更新 ${results.length} 个KML文件的样式配置`,
        data: results,
      });
    } catch (error) {
      Logger.error('批量更新KML文件样式配置失败:', error);
      try {
        logError(error, req);
      } catch (e) {}
      res
        .status(500)
        .json({ success: false, message: '批量更新样式配置失败', error: error.message });
    }
  }
}

module.exports = KmlFileStyleController;

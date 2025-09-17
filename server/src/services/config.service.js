const fs = require('fs').promises;
const path = require('path');
const { logError } = require('../middleware/logger.middleware');

class ConfigService {
  constructor() {
    this.configPath = path.join(__dirname, '../config/app-config.json');
    this.config = null;
    this.lastModified = null;
  }

  /**
   * 规范化聚合相关字段，兼容旧版字段
   * 输入对象将被浅复制并补充：
   * - cluster_enabled: boolean
   * - cluster_color: string（若缺失则回退至 cluster_icon_color 或 point_color）
   * 同时为保持向后兼容，写入时可同步设置 cluster_icon_color
   */
  normalizeClusterFields(input = {}) {
    const normalized = { ...input };
    const clusterEnabled =
      typeof normalized.cluster_enabled === 'boolean' ? normalized.cluster_enabled : false;
    // 颜色优先级：cluster_color -> cluster_icon_color(旧) -> point_color -> 默认色
    const color =
      normalized.cluster_color ||
      normalized.cluster_icon_color ||
      normalized.point_color ||
      '#3388ff';
    normalized.cluster_enabled = clusterEnabled;
    normalized.cluster_color = color;
    return normalized;
  }

  async loadConfig() {
    try {
      const stats = await fs.stat(this.configPath);
      if (!this.config || stats.mtime > this.lastModified) {
        const data = await fs.readFile(this.configPath, 'utf8');
        this.config = JSON.parse(data);
        this.lastModified = stats.mtime;
      }
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 配置文件不存在，创建默认配置
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      } else {
        try {
          logError(error);
        } catch (e) {}
        return this.getDefaultConfig();
      }
    }
  }

  async saveConfig(newConfig) {
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath);
      try {
        await fs.access(configDir);
      } catch {
        await fs.mkdir(configDir, { recursive: true });
      }
      // 原子写入 + 重试策略：先写临时文件再重命名
      // 使用包含 PID 和时间戳的唯一临时文件名，避免并发冲突
      const tmpPath = `${this.configPath}.${process.pid}.${Date.now()}.tmp`;
      const payload = JSON.stringify(newConfig, null, 2);

      const maxAttempts = 3;
      let attempt = 0;
      let lastErr = null;

      while (attempt < maxAttempts) {
        try {
          await fs.writeFile(tmpPath, payload, { encoding: 'utf8' });
          // rename 是原子的（在同一文件系统上），用于替换目标文件
          await fs.rename(tmpPath, this.configPath);
          this.config = newConfig;
          this.lastModified = new Date();

          // 广播 initial-view 更新（如果存在）到所有通过 WebSocket 连接的客户端
          try {
            // 延迟 require，避免循环依赖；从 app.locals 获取 wss
            const app = require('../app');
            const wss = app && app.locals ? app.locals.wss : null;
            if (wss && newConfig && newConfig.mapSettings && newConfig.mapSettings.initialView) {
              const payload = {
                type: 'initial-view-updated',
                data: newConfig.mapSettings.initialView,
                _t: Date.now(),
              };
              const text = JSON.stringify(payload);
              
              let sentCount = 0;
              wss.clients.forEach((client) => {
                try {
                  if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(text);
                    sentCount++;
                  }
                } catch (e) {
                  // 单个客户端发送失败，不影响其他客户端
                }
              });
              
              const Logger = require('../utils/logger');
              Logger.info(`初始显示设置已广播到 ${sentCount} 个WebSocket客户端`);
            }
          } catch (e) {
            // 不要影响保存逻辑
            try {
              const Logger = require('../utils/logger');
              Logger.warn('WebSocket广播失败:', e.message);
            } catch (e2) {
              // ignore
            }
          }

          return true;
        } catch (error) {
          lastErr = error;
          attempt += 1;
          // 指数退避：50ms, 150ms
          const delayMs = attempt === 1 ? 50 : 150;
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }

      // 所有尝试失败，记录详细堆栈到 error-debug.log 以便排查
      try {
        try {
          logError(lastErr);
        } catch (e) {}
        // 修正日志目录：server/logs（相对于 server/src/services 是 ../../logs）
        const logsDir = path.join(__dirname, '../../logs');
        try {
          await fs.access(logsDir);
        } catch {
          await fs.mkdir(logsDir, { recursive: true });
        }
        const errLogPath = path.join(logsDir, 'error-debug.log');
        const entry = `[${new Date().toISOString()}] saveConfig failed for ${
          this.configPath
        } (attempts=${attempt}): ${lastErr && lastErr.stack ? lastErr.stack : String(lastErr)}\n`;
        await fs.appendFile(errLogPath, entry, { encoding: 'utf8' });
      } catch (e) {
        // 如果记录日志也失败，吞掉以免抛出二次错误
      }
      // 尝试清理残留的 tmp 文件（如果存在）以减少磁盘垃圾
      try {
        await fs.unlink(tmpPath).catch(() => {});
      } catch (e) {}
      return false;
    } catch (error) {
      try {
        logError(error);
      } catch (e) {}
      return false;
    }
  }

  async getPointStyles(type) {
    const config = await this.loadConfig();
    const styles = config.pointStyles[type] || config.pointStyles.panorama;
    // 兼容与补齐聚合字段
    return this.normalizeClusterFields(styles);
  }

  async updatePointStyles(type, styles) {
    const config = await this.loadConfig();
    const current = this.normalizeClusterFields(config.pointStyles[type] || {});
    const incoming = this.normalizeClusterFields(styles || {});
    const merged = { ...current, ...incoming };
    // 为向后兼容同步旧字段（不在前端暴露）
    merged.cluster_icon_color = merged.cluster_color;
    config.pointStyles[type] = merged;
    const success = await this.saveConfig(config);

    return success;
  }

  async getKmlStyles(fileId = 'default') {
    try {
      const config = await this.loadConfig();
      if (!config) {
        throw new Error('配置文件加载失败');
      }
      if (!config.kmlStyles) {
        throw new Error('配置文件中缺少 kmlStyles 字段');
      }
      const raw = config.kmlStyles[fileId] || config.kmlStyles.default;
      if (!raw) {
        throw new Error(`未找到 KML 样式配置 (fileId: ${fileId})`);
      }
      return this.normalizeClusterFields(raw);
    } catch (error) {
      // 记录详细错误信息
      console.error(`getKmlStyles 错误 (fileId: ${fileId}):`, error);
      throw error;
    }
  }

  async updateKmlStyles(fileId, styles) {
    const config = await this.loadConfig();
    const base = this.normalizeClusterFields(
      config.kmlStyles[fileId] || config.kmlStyles.default || {}
    );
    const incoming = this.normalizeClusterFields(styles || {});
    const merged = { ...base, ...incoming };
    // 为向后兼容同步旧字段（不在前端暴露）
    merged.cluster_icon_color = merged.cluster_color;
    config.kmlStyles[fileId] = merged;
    const saved = await this.saveConfig(config);
    if (!saved) {
      // 记录更多上下文帮助排查 saveConfig 返回 false 的原因
      try {
        const fsSync = require('fs');
        const fs = require('fs').promises;
        const path = require('path');
        const logsDir = path.join(__dirname, '../../logs');
        const errLogPath = path.join(logsDir, 'error-debug.log');
        const configPath = this.configPath;
        let configStat = null;
        let configPreview = null;
        try {
          configStat = fsSync.statSync(configPath);
        } catch (e) {
          configStat = { error: e.message };
        }
        try {
          const txt = await fs.readFile(configPath, 'utf8');
          configPreview = txt.slice(0, 2000);
        } catch (e) {
          configPreview = `read error: ${e.message}`;
        }
        const entry = `\n[${new Date().toISOString()}] updateKmlStyles failed to save for fileId=${fileId}\nprocess.pid=${
          process.pid
        },uid=${process.getuid ? process.getuid() : 'n/a'},gid=${
          process.getgid ? process.getgid() : 'n/a'
        },cwd=${process.cwd()}\nconfigStat=${JSON.stringify(
          configStat
        )}\nconfigPreview=${configPreview}\nmerged=${JSON.stringify(merged).slice(0, 2000)}\n`;
        await fs.appendFile(errLogPath, entry, { encoding: 'utf8' });
      } catch (e) {
        try {
          /* swallow */
        } catch (ee) {
          try {
            const Logger = require('../utils/logger');
            Logger.warn('[config.service] swallow failed', ee);
          } catch (_) {}
        }
      }
    }
    return saved;
  }

  async deleteKmlStyles(fileId) {
    const config = await this.loadConfig();
    if (config.kmlStyles[fileId] && fileId !== 'default') {
      delete config.kmlStyles[fileId];
      return await this.saveConfig(config);
    }
    return true;
  }

  async batchDeleteKmlStyles(fileIds) {
    const config = await this.loadConfig();
    let hasChanges = false;

    for (const fileId of fileIds) {
      if (config.kmlStyles[fileId] && fileId !== 'default') {
        delete config.kmlStyles[fileId];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      return await this.saveConfig(config);
    }
    return true;
  }

  async getMapSettings() {
    const config = await this.loadConfig();
    return config.mapSettings;
  }

  async getUploadSettings() {
    const config = await this.loadConfig();
    return config.uploadSettings;
  }

  // 获取初始显示设置
  async getInitialViewSettings() {
    const config = await this.loadConfig();
    return (
      config.mapSettings?.initialView || {
        enabled: false,
        center: [116.4074, 39.9042],
        zoom: 12,
      }
    );
  }

  // 更新初始显示设置
  async updateInitialViewSettings(settings) {
    try {
      const config = await this.loadConfig();

      // 验证设置格式
      if (!settings || typeof settings !== 'object') {
        throw new Error('无效的设置格式');
      }

      const { enabled, center, zoom } = settings;

      // 验证 enabled 字段
      if (typeof enabled !== 'boolean') {
        throw new Error('enabled 字段必须是布尔值');
      }

      // 验证 center 字段
      if (!Array.isArray(center) || center.length !== 2) {
        throw new Error('center 字段必须是包含两个数字的数组');
      }

      const [lng, lat] = center;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('坐标必须是数字');
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('坐标超出有效范围');
      }

      // 验证 zoom 字段
      if (typeof zoom !== 'number' || zoom < 1 || zoom > 20) {
        throw new Error('缩放级别必须是1-20之间的数字');
      }

      // 确保 mapSettings 存在
      if (!config.mapSettings) {
        config.mapSettings = this.getDefaultConfig().mapSettings;
      }

      // 更新初始显示设置
      config.mapSettings.initialView = {
        enabled: Boolean(enabled),
        center: [Number(lng), Number(lat)],
        zoom: Number(zoom),
      };

      await this.saveConfig(config);
      return true;
    } catch (error) {
      try {
        logError(error);
      } catch (e) {}
      throw error;
    }
  }

  getDefaultConfig() {
    // 返回硬编码的默认配置
    return {
      version: '1.0.0',
      pointStyles: {
        panorama: {
          point_color: '#2ed573',
          point_size: 8,
          point_opacity: 1.0,
          point_label_size: 12,
          point_label_color: '#000000',
          // 与 app-config.json 对齐：默认启用聚合
          cluster_enabled: true,
          cluster_color: '#2ed573',
        },
        video: {
          point_color: '#ff4757',
          point_size: 10,
          point_opacity: 1.0,
          point_label_size: 14,
          point_label_color: '#000000',
          cluster_enabled: true,
          cluster_color: '#ff4757',
        },
      },
      kmlStyles: {
        default: {
          point_color: '#ff7800',
          point_size: 8,
          point_opacity: 1.0,
          point_label_size: 0,
          point_label_color: '#000000',
          line_color: '#ff7800',
          line_width: 2,
          line_opacity: 0.8,
          line_style: 'solid',
          polygon_fill_color: '#ff7800',
          polygon_fill_opacity: 0.3,
          polygon_stroke_color: '#ff7800',
          polygon_stroke_width: 2,
          polygon_stroke_style: 'solid',
          // 与 app-config.json 对齐：默认启用聚合
          cluster_enabled: true,
          cluster_color: '#00ff00',
        },
      },
      mapSettings: {
        defaultCenter: [116.4074, 39.9042],
        defaultZoom: 12,
        minZoom: 3,
        maxZoom: 18,
        mapType: 'normal',
        // 初始显示设置
        initialView: {
          enabled: false,
          center: [116.4074, 39.9042], // WGS84 坐标
          zoom: 12,
        },
      },
      uploadSettings: {
        maxFileSize: 104857600,
        allowedImageTypes: ['jpg', 'jpeg', 'png'],
        allowedVideoTypes: ['mp4', 'avi', 'mov'],
        allowedKmlTypes: ['kml', 'kmz'],
        thumbnailSize: {
          width: 300,
          height: 200,
        },
      },
    };
  }
}

module.exports = new ConfigService();

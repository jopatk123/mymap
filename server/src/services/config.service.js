const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { logError } = require('../middleware/logger.middleware');
const Logger = require('../utils/logger');
const ConfigRepository = require('./config/config.repository');
const ConfigBroadcaster = require('./config/config.broadcaster');

class ConfigService {
  constructor({ repository, broadcaster, logger } = {}) {
    this.repository = repository;
    this.broadcaster = broadcaster;
    this.logger = logger || Logger;
  }

  setRepository(repository) {
    this.repository = repository;
  }

  setBroadcaster(broadcaster) {
    this.broadcaster = broadcaster;
  }

  attachWebSocketServer(wss) {
    if (this.broadcaster && typeof this.broadcaster.attach === 'function') {
      this.broadcaster.attach(wss);
    }
  }

  getRepository() {
    return this.repository;
  }

  getBroadcaster() {
    return this.broadcaster;
  }

  normalizeClusterFields(input = {}) {
    const normalized = { ...input };
    const clusterEnabled =
      typeof normalized.cluster_enabled === 'boolean' ? normalized.cluster_enabled : false;
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
      if (!this.repository) {
        throw new Error('ConfigRepository 未初始化');
      }
      return await this.repository.read(() => this.getDefaultConfig());
    } catch (error) {
      try {
        logError(error);
      } catch (e) {}
      return this.getDefaultConfig();
    }
  }

  async saveConfig(newConfig) {
    if (!this.repository) {
      throw new Error('ConfigRepository 未初始化');
    }

    const success = await this.repository.write(newConfig);
    if (success && this.broadcaster && newConfig?.mapSettings?.initialView) {
      try {
        this.broadcaster.broadcastInitialView(newConfig.mapSettings.initialView);
      } catch (error) {
        if (this.logger && typeof this.logger.warn === 'function') {
          this.logger.warn('WebSocket 广播失败', error);
        }
      }
    }
    return success;
  }

  async getPointStyles(type) {
    const config = await this.loadConfig();
    const styles = config.pointStyles[type] || config.pointStyles.panorama;
    return this.normalizeClusterFields(styles);
  }

  async updatePointStyles(type, styles) {
    const config = await this.loadConfig();
    const current = this.normalizeClusterFields(config.pointStyles[type] || {});
    const incoming = this.normalizeClusterFields(styles || {});
    const merged = { ...current, ...incoming };
    merged.cluster_icon_color = merged.cluster_color;
    config.pointStyles[type] = merged;
    return await this.saveConfig(config);
  }

  async getKmlStyles(fileId = 'default') {
    const config = await this.loadConfig();
    if (!config?.kmlStyles) {
      throw new Error('配置文件中缺少 kmlStyles 字段');
    }
    const raw = config.kmlStyles[fileId] || config.kmlStyles.default;
    if (!raw) {
      throw new Error(`未找到 KML 样式配置 (fileId: ${fileId})`);
    }
    return this.normalizeClusterFields(raw);
  }

  async updateKmlStyles(fileId, styles) {
    const config = await this.loadConfig();
    const base = this.normalizeClusterFields(
      config.kmlStyles[fileId] || config.kmlStyles.default || {}
    );
    const incoming = this.normalizeClusterFields(styles || {});
    const merged = { ...base, ...incoming };
    merged.cluster_icon_color = merged.cluster_color;
    config.kmlStyles[fileId] = merged;
    const saved = await this.saveConfig(config);
    if (!saved) {
      await this.logSaveFailureDebug({ scope: 'updateKmlStyles', fileId, merged });
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

  async updateInitialViewSettings(settings) {
    try {
      const config = await this.loadConfig();

      if (!settings || typeof settings !== 'object') {
        throw new Error('无效的设置格式');
      }

      const { enabled, center, zoom } = settings;
      if (typeof enabled !== 'boolean') {
        throw new Error('enabled 字段必须是布尔值');
      }
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
      if (typeof zoom !== 'number' || zoom < 1 || zoom > 20) {
        throw new Error('缩放级别必须是1-20之间的数字');
      }

      if (!config.mapSettings) {
        config.mapSettings = this.getDefaultConfig().mapSettings;
      }

      config.mapSettings.initialView = {
        enabled: Boolean(enabled),
        center: [Number(lng), Number(lat)],
        zoom: Number(zoom),
      };

      return await this.saveConfig(config);
    } catch (error) {
      try {
        logError(error);
      } catch (e) {}
      throw error;
    }
  }

  async logSaveFailureDebug(context) {
    try {
      const logsDir = path.join(__dirname, '../logs');
      try {
        await fsPromises.access(logsDir);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fsPromises.mkdir(logsDir, { recursive: true });
        } else {
          throw error;
        }
      }

      const errLogPath = path.join(logsDir, 'error-debug.log');
      const repository = this.getRepository();
      const configPath = repository ? repository.getConfigPath() : 'unknown';
      let configStat;
      try {
        configStat = fs.statSync(configPath);
      } catch (error) {
        configStat = { error: error.message };
      }

      let configPreview = '';
      try {
        const txt = await fsPromises.readFile(configPath, 'utf8');
        configPreview = txt.slice(0, 2000);
      } catch (error) {
        configPreview = `read error: ${error.message}`;
      }

      const entry = [
        `\n[${new Date().toISOString()}] ${context.scope || 'saveConfig'} failed`,
        `fileId=${context.fileId || 'n/a'}`,
        `process.pid=${process.pid},uid=${process.getuid ? process.getuid() : 'n/a'},gid=${
          process.getgid ? process.getgid() : 'n/a'
        }`,
        `cwd=${process.cwd()}`,
        `configPath=${configPath}`,
        `configStat=${JSON.stringify(configStat)}`,
        `configPreview=${configPreview}`,
        `payload=${context.merged ? JSON.stringify(context.merged).slice(0, 2000) : 'n/a'}`,
      ].join('\n');

      await fsPromises.appendFile(errLogPath, `${entry}\n`, { encoding: 'utf8' });
    } catch (error) {
      if (this.logger && typeof this.logger.warn === 'function') {
        this.logger.warn('[ConfigService] 无法记录保存失败日志', error);
      }
    }
  }

  getDefaultConfig() {
    return {
      version: '1.0.0',
      pointStyles: {
        panorama: {
          point_color: '#2ed573',
          point_size: 8,
          point_opacity: 1.0,
          point_label_size: 12,
          point_label_color: '#000000',
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
        imageSet: {
          point_color: '#9b59b6',
          point_size: 10,
          point_opacity: 1.0,
          point_label_size: 14,
          point_label_color: '#000000',
          cluster_enabled: true,
          cluster_color: '#9b59b6',
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
        initialView: {
          enabled: false,
          center: [116.4074, 39.9042],
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

const defaultRepository = new ConfigRepository({ logger: Logger });
const defaultBroadcaster = new ConfigBroadcaster({ logger: Logger });

const configService = new ConfigService({
  repository: defaultRepository,
  broadcaster: defaultBroadcaster,
  logger: Logger,
});

module.exports = configService;
module.exports.ConfigService = ConfigService;
module.exports.ConfigRepository = ConfigRepository;
module.exports.ConfigBroadcaster = ConfigBroadcaster;

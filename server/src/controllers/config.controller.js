const ConfigService = require('../services/config.service');
const Logger = require('../utils/logger');

class ConfigController {
  // 获取完整配置
  static async getConfig(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      res.json({
        success: true,
        data: config,
        message: '获取配置成功',
      });
    } catch (error) {
      const Logger = require('../utils/logger');
      Logger.error('获取配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置失败',
        error: error.message,
      });
    }
  }

  // 更新完整配置
  static async updateConfig(req, res) {
    try {
      const success = await ConfigService.saveConfig(req.body);
      if (success) {
        const updatedConfig = await ConfigService.loadConfig();
        res.json({
          success: true,
          data: updatedConfig,
          message: '更新配置成功',
        });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      Logger.error('更新配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新配置失败',
        error: error.message,
      });
    }
  }

  // 获取点位样式配置
  static async getPointStyles(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      res.json({
        success: true,
        data: config.pointStyles,
        message: '获取点位样式配置成功',
      });
    } catch (error) {
      Logger.error('获取点位样式配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取点位样式配置失败',
        error: error.message,
      });
    }
  }

  // 更新点位样式配置
  static async updatePointStyles(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      config.pointStyles = { ...config.pointStyles, ...req.body };
      const success = await ConfigService.saveConfig(config);

      if (success) {
        res.json({
          success: true,
          data: config.pointStyles,
          message: '更新点位样式配置成功',
        });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      Logger.error('更新点位样式配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新点位样式配置失败',
        error: error.message,
      });
    }
  }

  // 获取KML样式配置
  static async getKmlStyles(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      res.json({
        success: true,
        data: config.kmlStyles,
        message: '获取KML样式配置成功',
      });
    } catch (error) {
      Logger.error('获取KML样式配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取KML样式配置失败',
        error: error.message,
      });
    }
  }

  // 更新KML样式配置
  static async updateKmlStyles(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      config.kmlStyles = { ...config.kmlStyles, ...req.body };
      const success = await ConfigService.saveConfig(config);

      if (success) {
        res.json({
          success: true,
          data: config.kmlStyles,
          message: '更新KML样式配置成功',
        });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      Logger.error('更新KML样式配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新KML样式配置失败',
        error: error.message,
      });
    }
  }

  // 获取地图设置
  static async getMapSettings(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      res.json({
        success: true,
        data: config.mapSettings,
        message: '获取地图设置成功',
      });
    } catch (error) {
      Logger.error('获取地图设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取地图设置失败',
        error: error.message,
      });
    }
  }

  // 更新地图设置
  static async updateMapSettings(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      config.mapSettings = { ...config.mapSettings, ...req.body };
      const success = await ConfigService.saveConfig(config);

      if (success) {
        res.json({
          success: true,
          data: config.mapSettings,
          message: '更新地图设置成功',
        });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      Logger.error('更新地图设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新地图设置失败',
        error: error.message,
      });
    }
  }

  // 获取上传设置
  static async getUploadSettings(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      res.json({
        success: true,
        data: config.uploadSettings,
        message: '获取上传设置成功',
      });
    } catch (error) {
      Logger.error('获取上传设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取上传设置失败',
        error: error.message,
      });
    }
  }

  // 更新上传设置
  static async updateUploadSettings(req, res) {
    try {
      const config = await ConfigService.loadConfig();
      config.uploadSettings = { ...config.uploadSettings, ...req.body };
      const success = await ConfigService.saveConfig(config);

      if (success) {
        res.json({
          success: true,
          data: config.uploadSettings,
          message: '更新上传设置成功',
        });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      Logger.error('更新上传设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新上传设置失败',
        error: error.message,
      });
    }
  }

  // 重置配置为默认值
  static async resetConfig(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig();
      const success = await ConfigService.saveConfig(defaultConfig);

      if (success) {
        res.json({
          success: true,
          data: defaultConfig,
          message: '重置配置成功',
        });
      } else {
        throw new Error('重置配置失败');
      }
    } catch (error) {
      Logger.error('重置配置失败:', error);
      res.status(500).json({
        success: false,
        message: '重置配置失败',
        error: error.message,
      });
    }
  }
}

module.exports = ConfigController;

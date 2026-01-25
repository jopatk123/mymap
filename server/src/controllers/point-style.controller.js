const ConfigService = require('../services/config.service');

class PointStyleController {
  static async getVideoPointStyles(req, res) {
    try {
      const styles = await ConfigService.getPointStyles('video');
      res.json({ success: true, data: styles, message: '获取视频点位样式配置成功' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '获取视频点位样式配置失败', error: error.message });
    }
  }

  static async updateVideoPointStyles(req, res) {
    try {
      const success = await ConfigService.updatePointStyles('video', req.body);
      if (success) {
        const updatedStyles = await ConfigService.getPointStyles('video');
        res.json({ success: true, data: updatedStyles, message: '更新视频点位样式配置成功' });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '更新视频点位样式配置失败', error: error.message });
    }
  }

  static async resetVideoPointStyles(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig();
      const success = await ConfigService.updatePointStyles(
        'video',
        defaultConfig.pointStyles.video
      );
      if (success) {
        const styles = await ConfigService.getPointStyles('video');
        res.json({ success: true, data: styles, message: '重置视频点位样式配置成功' });
      } else {
        throw new Error('重置配置失败');
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '重置视频点位样式配置失败', error: error.message });
    }
  }

  static async getPanoramaPointStyles(req, res) {
    try {
      const styles = await ConfigService.getPointStyles('panorama');
      res.json({ success: true, data: styles, message: '获取全景图点位样式配置成功' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '获取全景图点位样式配置失败', error: error.message });
    }
  }

  static async updatePanoramaPointStyles(req, res) {
    try {
      const success = await ConfigService.updatePointStyles('panorama', req.body);
      if (success) {
        const updatedStyles = await ConfigService.getPointStyles('panorama');
        res.json({ success: true, data: updatedStyles, message: '更新全景图点位样式配置成功' });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '更新全景图点位样式配置失败', error: error.message });
    }
  }

  static async resetPanoramaPointStyles(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig();
      const success = await ConfigService.updatePointStyles(
        'panorama',
        defaultConfig.pointStyles.panorama
      );
      if (success) {
        const styles = await ConfigService.getPointStyles('panorama');
        res.json({ success: true, data: styles, message: '重置全景图点位样式配置成功' });
      } else {
        throw new Error('重置配置失败');
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '重置全景图点位样式配置失败', error: error.message });
    }
  }

  // 图片集点位样式配置
  static async getImageSetPointStyles(req, res) {
    try {
      const styles = await ConfigService.getPointStyles('imageSet');
      res.json({ success: true, data: styles, message: '获取图片集点位样式配置成功' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '获取图片集点位样式配置失败', error: error.message });
    }
  }

  static async updateImageSetPointStyles(req, res) {
    try {
      const success = await ConfigService.updatePointStyles('imageSet', req.body);
      if (success) {
        const updatedStyles = await ConfigService.getPointStyles('imageSet');
        res.json({ success: true, data: updatedStyles, message: '更新图片集点位样式配置成功' });
      } else {
        throw new Error('保存配置失败');
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '更新图片集点位样式配置失败', error: error.message });
    }
  }

  static async resetImageSetPointStyles(req, res) {
    try {
      const defaultConfig = ConfigService.getDefaultConfig();
      const success = await ConfigService.updatePointStyles(
        'imageSet',
        defaultConfig.pointStyles.imageSet
      );
      if (success) {
        const styles = await ConfigService.getPointStyles('imageSet');
        res.json({ success: true, data: styles, message: '重置图片集点位样式配置成功' });
      } else {
        throw new Error('重置配置失败');
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: '重置图片集点位样式配置失败', error: error.message });
    }
  }
}

module.exports = PointStyleController;

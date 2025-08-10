const fs = require('fs').promises
const path = require('path')

class ConfigService {
  constructor() {
    this.configPath = path.join(__dirname, '../config/app-config.json')
    this.config = null
    this.lastModified = null
  }

  async loadConfig() {
    try {
      const stats = await fs.stat(this.configPath)
      if (!this.config || stats.mtime > this.lastModified) {
        const data = await fs.readFile(this.configPath, 'utf8')
        this.config = JSON.parse(data)
        this.lastModified = stats.mtime
      }
      return this.config
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 配置文件不存在，创建默认配置
        const defaultConfig = this.getDefaultConfig()
        await this.saveConfig(defaultConfig)
        return defaultConfig
      } else {
        return this.getDefaultConfig()
      }
    }
  }

  async saveConfig(newConfig) {
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath)
      try {
        await fs.access(configDir)
      } catch {
        await fs.mkdir(configDir, { recursive: true })
      }
      
      await fs.writeFile(this.configPath, JSON.stringify(newConfig, null, 2))
      this.config = newConfig
      this.lastModified = new Date()
      return true
    } catch (error) {
      return false
    }
  }

  async getPointStyles(type) {
    const config = await this.loadConfig()
    const styles = config.pointStyles[type] || config.pointStyles.panorama
    
    return styles
  }

  async updatePointStyles(type, styles) {
    const config = await this.loadConfig()
    config.pointStyles[type] = { ...config.pointStyles[type], ...styles }
    const success = await this.saveConfig(config)
    
    return success
  }

  async getKmlStyles(fileId = 'default') {
    const config = await this.loadConfig()
    return config.kmlStyles[fileId] || config.kmlStyles.default
  }

  async updateKmlStyles(fileId, styles) {
    const config = await this.loadConfig()
    config.kmlStyles[fileId] = { ...config.kmlStyles[fileId] || config.kmlStyles.default, ...styles }
    return await this.saveConfig(config)
  }

  async deleteKmlStyles(fileId) {
    const config = await this.loadConfig()
    if (config.kmlStyles[fileId] && fileId !== 'default') {
      delete config.kmlStyles[fileId]
      return await this.saveConfig(config)
    }
    return true
  }

  async batchDeleteKmlStyles(fileIds) {
    const config = await this.loadConfig()
    let hasChanges = false
    
    for (const fileId of fileIds) {
      if (config.kmlStyles[fileId] && fileId !== 'default') {
        delete config.kmlStyles[fileId]
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      return await this.saveConfig(config)
    }
    return true
  }

  async getMapSettings() {
    const config = await this.loadConfig()
    return config.mapSettings
  }

  async getUploadSettings() {
    const config = await this.loadConfig()
    return config.uploadSettings
  }

  getDefaultConfig() {
    // 返回硬编码的默认配置
    return {
      version: "1.0.0",
      pointStyles: {
        panorama: {
          point_color: "#2ed573",
          point_size: 8,
          point_opacity: 1.0,
          point_label_size: 12,
          point_label_color: "#000000"
        },
        video: {
          point_color: "#ff4757",
          point_size: 10,
          point_opacity: 1.0,
          point_label_size: 14,
          point_label_color: "#000000"
        }
      },
      kmlStyles: {
        default: {
          point_color: "#ff7800",
          point_size: 8,
          point_opacity: 1.0,
          point_label_size: 12,
          point_label_color: "#000000",
          line_color: "#ff7800",
          line_width: 2,
          line_opacity: 0.8,
          line_style: "solid",
          polygon_fill_color: "#ff7800",
          polygon_fill_opacity: 0.3,
          polygon_stroke_color: "#ff7800",
          polygon_stroke_width: 2,
          polygon_stroke_style: "solid",
          cluster_enabled: true,
          cluster_icon_color: "#ffffff",
          cluster_text_color: "#000000"
        }
      },
      mapSettings: {
        defaultCenter: [116.4074, 39.9042],
        defaultZoom: 12,
        minZoom: 3,
        maxZoom: 18,
        mapType: "normal"
      },
      uploadSettings: {
        maxFileSize: 104857600,
        allowedImageTypes: ["jpg", "jpeg", "png"],
        allowedVideoTypes: ["mp4", "avi", "mov"],
        allowedKmlTypes: ["kml", "kmz"],
        thumbnailSize: {
          width: 300,
          height: 200
        }
      }
    }
  }
}

module.exports = new ConfigService()
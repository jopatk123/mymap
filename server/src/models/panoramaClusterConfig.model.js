const { pool } = require('../config/database')

class PanoramaClusterConfigModel {
  // 获取全景图聚合配置
  static async getConfig() {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM panorama_cluster_config WHERE id = 1'
      )
      
      if (rows.length === 0) {
        // 如果没有配置，创建默认配置
        return await this.createDefaultConfig()
      }
      
      return rows[0]
    } catch (error) {
      console.error('获取全景图聚合配置失败:', error)
      throw error
    }
  }

  // 更新全景图聚合配置
  static async updateConfig(config) {
    try {
      const validatedConfig = this.validateConfig(config)
      
      const [result] = await pool.execute(
        `UPDATE panorama_cluster_config SET
          cluster_enabled = ?,
          cluster_radius = ?,
          cluster_min_points = ?,
          cluster_max_zoom = ?,
          cluster_icon_color = ?,
          cluster_text_color = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1`,
        [
          validatedConfig.cluster_enabled,
          validatedConfig.cluster_radius,
          validatedConfig.cluster_min_points,
          validatedConfig.cluster_max_zoom,
          validatedConfig.cluster_icon_color,
          validatedConfig.cluster_text_color
        ]
      )
      
      if (result.affectedRows === 0) {
        // 如果没有更新到记录，创建新记录
        return await this.createConfig(validatedConfig)
      }
      
      return await this.getConfig()
    } catch (error) {
      console.error('更新全景图聚合配置失败:', error)
      throw error
    }
  }

  // 创建默认配置
  static async createDefaultConfig() {
    const defaultConfig = {
      cluster_enabled: true,
      cluster_radius: 50,
      cluster_min_points: 2,
      cluster_max_zoom: 16,
      cluster_icon_color: '#67C23A',
      cluster_text_color: '#FFFFFF'
    }
    
    return await this.createConfig(defaultConfig)
  }

  // 创建配置
  static async createConfig(config) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO panorama_cluster_config (
          id, cluster_enabled, cluster_radius, cluster_min_points,
          cluster_max_zoom, cluster_icon_color, cluster_text_color
        ) VALUES (1, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          cluster_enabled = VALUES(cluster_enabled),
          cluster_radius = VALUES(cluster_radius),
          cluster_min_points = VALUES(cluster_min_points),
          cluster_max_zoom = VALUES(cluster_max_zoom),
          cluster_icon_color = VALUES(cluster_icon_color),
          cluster_text_color = VALUES(cluster_text_color),
          updated_at = CURRENT_TIMESTAMP`,
        [
          config.cluster_enabled,
          config.cluster_radius,
          config.cluster_min_points,
          config.cluster_max_zoom,
          config.cluster_icon_color,
          config.cluster_text_color
        ]
      )
      
      return await this.getConfig()
    } catch (error) {
      console.error('创建全景图聚合配置失败:', error)
      throw error
    }
  }

  // 验证配置
  static validateConfig(config) {
    const defaults = {
      cluster_enabled: true,
      cluster_radius: 50,
      cluster_min_points: 2,
      cluster_max_zoom: 16,
      cluster_icon_color: '#67C23A',
      cluster_text_color: '#FFFFFF'
    }
    
    const validated = { ...defaults }
    
    // 验证布尔字段
    if (config.cluster_enabled !== undefined) {
      validated.cluster_enabled = Boolean(config.cluster_enabled)
    }
    
    // 验证数值字段
    const numericFields = {
      cluster_radius: { min: 10, max: 200 },
      cluster_min_points: { min: 2, max: 20 },
      cluster_max_zoom: { min: 10, max: 20 }
    }
    
    for (const [field, range] of Object.entries(numericFields)) {
      if (config[field] !== undefined) {
        const value = parseInt(config[field])
        if (!isNaN(value) && value >= range.min && value <= range.max) {
          validated[field] = value
        }
      }
    }
    
    // 验证颜色字段
    const colorFields = ['cluster_icon_color', 'cluster_text_color']
    for (const field of colorFields) {
      if (config[field] && /^#[0-9A-Fa-f]{6}$/.test(config[field])) {
        validated[field] = config[field]
      }
    }
    
    return validated
  }
}

module.exports = PanoramaClusterConfigModel
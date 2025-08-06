const { pool } = require('../config/database')

class PanoramaPointStyleModel {
  // 获取默认样式配置
  static getDefaultStyles() {
    return {
      point_color: '#2ed573',
      point_size: 8,
      point_opacity: 1.0,
      point_icon_type: 'circle',
      point_label_size: 12,
      point_label_color: '#000000'
    }
  }

  // 获取样式配置
  static async getStyles() {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM panorama_point_styles WHERE id = 1'
      )
      
      return rows.length > 0 ? rows[0] : this.getDefaultStyles()
    } catch (error) {
      console.error('获取全景图点位样式配置失败:', error)
      return this.getDefaultStyles()
    }
  }

  // 更新样式配置
  static async updateStyles(styleConfig) {
    try {
      const validatedConfig = this.validateStyleConfig(styleConfig)
      
      const [result] = await pool.execute(
        `UPDATE panorama_point_styles SET 
          point_color = ?, point_size = ?, point_opacity = ?, point_icon_type = ?, 
          point_label_size = ?, point_label_color = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [
          validatedConfig.point_color,
          validatedConfig.point_size,
          validatedConfig.point_opacity,
          validatedConfig.point_icon_type,
          validatedConfig.point_label_size,
          validatedConfig.point_label_color
        ]
      )
      
      if (result.affectedRows === 0) {
        // 如果没有记录，则插入新记录
        await pool.execute(
          `INSERT INTO panorama_point_styles (id, point_color, point_size, point_opacity, point_icon_type, point_label_size, point_label_color) 
           VALUES (1, ?, ?, ?, ?, ?, ?)`,
          [
            validatedConfig.point_color,
            validatedConfig.point_size,
            validatedConfig.point_opacity,
            validatedConfig.point_icon_type,
            validatedConfig.point_label_size,
            validatedConfig.point_label_color
          ]
        )
      }
      
      return await this.getStyles()
    } catch (error) {
      console.error('更新全景图点位样式配置失败:', error)
      throw error
    }
  }

  // 重置为默认样式
  static async resetStyles() {
    try {
      const defaultStyles = this.getDefaultStyles()
      return await this.updateStyles(defaultStyles)
    } catch (error) {
      console.error('重置全景图点位样式配置失败:', error)
      throw error
    }
  }

  // 验证样式配置
  static validateStyleConfig(config) {
    const validatedConfig = {}
    
    // 验证颜色
    validatedConfig.point_color = config.point_color || '#2ed573'
    validatedConfig.point_label_color = config.point_label_color || '#000000'
    
    // 验证数值
    validatedConfig.point_size = Math.max(4, Math.min(32, parseInt(config.point_size) || 8))
    validatedConfig.point_label_size = Math.max(0, Math.min(24, parseInt(config.point_label_size) || 12))
    validatedConfig.point_opacity = Math.max(0, Math.min(1, parseFloat(config.point_opacity) || 1.0))
    
    // 验证图标类型
    const validIconTypes = ['circle', 'square', 'triangle', 'diamond', 'marker']
    validatedConfig.point_icon_type = validIconTypes.includes(config.point_icon_type) ? 
      config.point_icon_type : 'circle'
    
    return validatedConfig
  }
}

module.exports = PanoramaPointStyleModel
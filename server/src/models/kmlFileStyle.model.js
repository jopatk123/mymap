const { pool } = require('../config/database')

class KmlFileStyleModel {
  // 获取默认样式配置
  static getDefaultStyles() {
    return {
      // 点样式配置
      point_color: '#ff7800',
      point_size: 8,
      point_opacity: 1.0,
      point_icon_type: 'circle',
      point_label_size: 12,
      point_label_color: '#000000',
      
      // 线样式配置
      line_color: '#ff7800',
      line_width: 2,
      line_opacity: 0.8,
      line_style: 'solid',
      
      // 面样式配置
      polygon_fill_color: '#ff7800',
      polygon_fill_opacity: 0.3,
      polygon_stroke_color: '#ff7800',
      polygon_stroke_width: 2,
      polygon_stroke_style: 'solid',
      
      // 聚合配置
      cluster_enabled: true,
      cluster_radius: 50,
      cluster_min_points: 2,
      cluster_max_zoom: 16,
      cluster_icon_color: '#409EFF',
      cluster_text_color: '#FFFFFF'
    }
  }

  // 根据KML文件ID查找样式配置
  static async findByKmlFileId(kmlFileId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM kml_file_styles WHERE kml_file_id = ?',
        [kmlFileId]
      )
      return rows[0] || null
    } catch (error) {
      console.error('查找KML文件样式失败:', error)
      throw error
    }
  }

  // 创建或更新样式配置
  static async upsert(kmlFileId, styleConfig) {
    try {
      const validatedConfig = this.validateStyleConfig(styleConfig)
      
      const [result] = await pool.execute(
        `INSERT INTO kml_file_styles (
          kml_file_id, point_color, point_size, point_opacity, point_icon_type, 
          point_label_size, point_label_color, line_color, line_width, line_opacity, 
          line_style, polygon_fill_color, polygon_fill_opacity, polygon_stroke_color, 
          polygon_stroke_width, polygon_stroke_style, cluster_enabled, cluster_radius, 
          cluster_min_points, cluster_max_zoom, cluster_icon_color, cluster_text_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          point_color = VALUES(point_color),
          point_size = VALUES(point_size),
          point_opacity = VALUES(point_opacity),
          point_icon_type = VALUES(point_icon_type),
          point_label_size = VALUES(point_label_size),
          point_label_color = VALUES(point_label_color),
          line_color = VALUES(line_color),
          line_width = VALUES(line_width),
          line_opacity = VALUES(line_opacity),
          line_style = VALUES(line_style),
          polygon_fill_color = VALUES(polygon_fill_color),
          polygon_fill_opacity = VALUES(polygon_fill_opacity),
          polygon_stroke_color = VALUES(polygon_stroke_color),
          polygon_stroke_width = VALUES(polygon_stroke_width),
          polygon_stroke_style = VALUES(polygon_stroke_style),
          cluster_enabled = VALUES(cluster_enabled),
          cluster_radius = VALUES(cluster_radius),
          cluster_min_points = VALUES(cluster_min_points),
          cluster_max_zoom = VALUES(cluster_max_zoom),
          cluster_icon_color = VALUES(cluster_icon_color),
          cluster_text_color = VALUES(cluster_text_color),
          updated_at = CURRENT_TIMESTAMP`,
        [
          kmlFileId,
          validatedConfig.point_color,
          validatedConfig.point_size,
          validatedConfig.point_opacity,
          validatedConfig.point_icon_type,
          validatedConfig.point_label_size,
          validatedConfig.point_label_color,
          validatedConfig.line_color,
          validatedConfig.line_width,
          validatedConfig.line_opacity,
          validatedConfig.line_style,
          validatedConfig.polygon_fill_color,
          validatedConfig.polygon_fill_opacity,
          validatedConfig.polygon_stroke_color,
          validatedConfig.polygon_stroke_width,
          validatedConfig.polygon_stroke_style,
          validatedConfig.cluster_enabled,
          validatedConfig.cluster_radius,
          validatedConfig.cluster_min_points,
          validatedConfig.cluster_max_zoom,
          validatedConfig.cluster_icon_color,
          validatedConfig.cluster_text_color
        ]
      )
      
      return await this.findByKmlFileId(kmlFileId)
    } catch (error) {
      console.error('创建或更新KML文件样式失败:', error)
      throw error
    }
  }

  // 删除样式配置
  static async delete(kmlFileId) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM kml_file_styles WHERE kml_file_id = ?',
        [kmlFileId]
      )
      return result.affectedRows > 0
    } catch (error) {
      console.error('删除KML文件样式失败:', error)
      throw error
    }
  }

  // 批量更新样式配置
  static async batchUpsert(styleConfigs) {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      
      const results = []
      for (const config of styleConfigs) {
        const result = await this.upsert(config.kmlFileId, config.styles)
        results.push(result)
      }
      
      await connection.commit()
      return results
    } catch (error) {
      await connection.rollback()
      console.error('批量更新KML文件样式失败:', error)
      throw error
    } finally {
      connection.release()
    }
  }

  // 验证样式配置
  static validateStyleConfig(config) {
    const defaults = this.getDefaultStyles()
    const validated = { ...defaults }
    
    // 验证颜色格式
    const colorFields = [
      'point_color', 'point_label_color', 'line_color', 
      'polygon_fill_color', 'polygon_stroke_color', 
      'cluster_icon_color', 'cluster_text_color'
    ]
    
    for (const field of colorFields) {
      // 支持6位（RGB）和8位（RGBA）的十六进制颜色值
      if (config[field] && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/i.test(config[field])) {
        validated[field] = config[field]
      }
    }
    
    // 验证数值字段
    const numericFields = {
      point_size: { min: 1, max: 50 },
      point_opacity: { min: 0, max: 1 },
      point_label_size: { min: 0, max: 24 },
      line_width: { min: 1, max: 20 },
      line_opacity: { min: 0, max: 1 },
      polygon_fill_opacity: { min: 0, max: 1 },
      polygon_stroke_width: { min: 1, max: 20 },
      cluster_radius: { min: 10, max: 200 },
      cluster_min_points: { min: 2, max: 20 },
      cluster_max_zoom: { min: 10, max: 20 }
    }
    
    for (const [field, range] of Object.entries(numericFields)) {
      if (config[field] !== undefined) {
        const value = parseFloat(config[field])
        if (!isNaN(value) && value >= range.min && value <= range.max) {
          validated[field] = value
        }
      }
    }
    
    // 验证枚举字段
    const enumFields = {
      point_icon_type: ['circle', 'square', 'triangle', 'diamond'],
      line_style: ['solid', 'dashed', 'dotted', 'dash-dot'],
      polygon_stroke_style: ['solid', 'dashed', 'dotted']
    }
    
    for (const [field, allowedValues] of Object.entries(enumFields)) {
      if (config[field] && allowedValues.includes(config[field])) {
        validated[field] = config[field]
      }
    }
    
    // 验证布尔字段
    if (config.cluster_enabled !== undefined) {
      validated.cluster_enabled = Boolean(config.cluster_enabled)
    }
    
    return validated
  }
}

module.exports = KmlFileStyleModel
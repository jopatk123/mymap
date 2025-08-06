const mysql = require('mysql2/promise')
const fs = require('fs').promises
const path = require('path')

class ConfigMigrator {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'asd123123123',
      database: process.env.DB_NAME || 'panorama_map'
    }
    this.configPath = path.join(__dirname, '../server/config/app-config.json')
  }

  async migrateStyles() {
    let connection
    try {
      connection = await mysql.createConnection(this.dbConfig)
      console.log('连接数据库成功')

      // 读取现有配置
      let appConfig = {
        version: "1.0.0",
        pointStyles: {},
        kmlStyles: {},
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

      // 迁移全景图点位样式
      try {
        const [panoramaStyles] = await connection.execute('SELECT * FROM panorama_point_styles LIMIT 1')
        if (panoramaStyles.length > 0) {
          const style = panoramaStyles[0]
          appConfig.pointStyles.panorama = {
            point_color: style.point_color,
            point_size: style.point_size,
            point_opacity: style.point_opacity,
            point_icon_type: style.point_icon_type,
            point_label_size: style.point_label_size,
            point_label_color: style.point_label_color
          }
          console.log('迁移全景图点位样式成功')
        }
      } catch (error) {
        console.log('全景图点位样式表不存在，使用默认配置')
        appConfig.pointStyles.panorama = {
          point_color: "#2ed573",
          point_size: 8,
          point_opacity: 1.0,
          point_icon_type: "circle",
          point_label_size: 12,
          point_label_color: "#000000"
        }
      }

      // 迁移视频点位样式
      try {
        const [videoStyles] = await connection.execute('SELECT * FROM video_point_styles LIMIT 1')
        if (videoStyles.length > 0) {
          const style = videoStyles[0]
          appConfig.pointStyles.video = {
            point_color: style.point_color,
            point_size: style.point_size,
            point_opacity: style.point_opacity,
            point_icon_type: style.point_icon_type,
            point_label_size: style.point_label_size,
            point_label_color: style.point_label_color
          }
          console.log('迁移视频点位样式成功')
        }
      } catch (error) {
        console.log('视频点位样式表不存在，使用默认配置')
        appConfig.pointStyles.video = {
          point_color: "#ff4757",
          point_size: 10,
          point_opacity: 1.0,
          point_icon_type: "marker",
          point_label_size: 14,
          point_label_color: "#000000"
        }
      }

      // 迁移KML文件样式
      try {
        const [kmlStyles] = await connection.execute('SELECT * FROM kml_file_styles')
        appConfig.kmlStyles.default = {
          point_color: "#ff7800",
          point_size: 8,
          point_opacity: 1.0,
          point_icon_type: "marker",
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

        if (kmlStyles.length > 0) {
          for (const style of kmlStyles) {
            appConfig.kmlStyles[style.kml_file_id] = {
              point_color: style.point_color,
              point_size: style.point_size,
              point_opacity: style.point_opacity,
              point_icon_type: style.point_icon_type,
              point_label_size: style.point_label_size,
              point_label_color: style.point_label_color,
              line_color: style.line_color,
              line_width: style.line_width,
              line_opacity: style.line_opacity,
              line_style: style.line_style,
              polygon_fill_color: style.polygon_fill_color,
              polygon_fill_opacity: style.polygon_fill_opacity,
              polygon_stroke_color: style.polygon_stroke_color,
              polygon_stroke_width: style.polygon_stroke_width,
              polygon_stroke_style: style.polygon_stroke_style,
              cluster_enabled: style.cluster_enabled,
              cluster_icon_color: style.cluster_icon_color,
              cluster_text_color: style.cluster_text_color
            }
          }
          console.log(`迁移 ${kmlStyles.length} 个KML文件样式成功`)
        }
      } catch (error) {
        console.log('KML文件样式表不存在，使用默认配置')
      }

      // 保存配置文件
      await fs.writeFile(this.configPath, JSON.stringify(appConfig, null, 2))
      console.log('配置文件保存成功:', this.configPath)

      return appConfig
    } catch (error) {
      console.error('迁移配置失败:', error)
      throw error
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  async dropStyleTables() {
    let connection
    try {
      connection = await mysql.createConnection(this.dbConfig)
      
      const tables = [
        'kml_file_styles',
        'panorama_point_styles', 
        'video_point_styles'
      ]

      for (const table of tables) {
        try {
          await connection.execute(`DROP TABLE IF EXISTS ${table}`)
          console.log(`删除表 ${table} 成功`)
        } catch (error) {
          console.log(`表 ${table} 不存在或已删除`)
        }
      }
    } catch (error) {
      console.error('删除样式表失败:', error)
      throw error
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  async initOnly() {
    try {
      console.log('初始化配置文件...')
      const config = this.getDefaultConfig()
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
      console.log('配置文件初始化完成')
    } catch (error) {
      console.error('初始化配置文件失败:', error)
      throw error
    }
  }

  getDefaultConfig() {
    return {
      version: "1.0.0",
      pointStyles: {
        panorama: {
          point_color: "#2ed573",
          point_size: 8,
          point_opacity: 1.0,
          point_icon_type: "circle",
          point_label_size: 12,
          point_label_color: "#000000"
        },
        video: {
          point_color: "#ff4757",
          point_size: 10,
          point_opacity: 1.0,
          point_icon_type: "marker",
          point_label_size: 14,
          point_label_color: "#000000"
        }
      },
      kmlStyles: {
        default: {
          point_color: "#ff7800",
          point_size: 8,
          point_opacity: 1.0,
          point_icon_type: "marker",
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

module.exports = ConfigMigrator

// 如果直接运行此脚本
if (require.main === module) {
  const migrator = new ConfigMigrator()
  
  async function main() {
    try {
      // 检查是否有 --init-only 参数
      if (process.argv.includes('--init-only')) {
        await migrator.initOnly()
        return
      }

      console.log('开始迁移配置...')
      await migrator.migrateStyles()
      
      console.log('是否删除样式配置表? (y/N)')
      process.stdin.setEncoding('utf8')
      process.stdin.on('readable', async () => {
        const chunk = process.stdin.read()
        if (chunk !== null) {
          const answer = chunk.trim().toLowerCase()
          if (answer === 'y' || answer === 'yes') {
            await migrator.dropStyleTables()
            console.log('迁移完成！')
          } else {
            console.log('保留样式配置表，迁移完成！')
          }
          process.exit(0)
        }
      })
    } catch (error) {
      console.error('迁移失败:', error)
      process.exit(1)
    }
  }
  
  main()
}
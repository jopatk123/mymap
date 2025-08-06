const fs = require('fs').promises
const path = require('path')
const mysql = require('mysql2/promise')

class RefactorVerifier {
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

  async verifyDatabase() {
    let connection
    try {
      connection = await mysql.createConnection(this.dbConfig)
      console.log('✓ 数据库连接成功')

      // 检查核心表是否存在
      const requiredTables = [
        'folders', 'panoramas', 'video_points', 
        'kml_files', 'kml_points'
      ]

      for (const table of requiredTables) {
        const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`)
        if (rows.length > 0) {
          console.log(`✓ 表 ${table} 存在`)
        } else {
          console.log(`✗ 表 ${table} 不存在`)
          return false
        }
      }

      // 检查样式表是否已删除
      const styleTables = [
        'kml_file_styles', 'panorama_point_styles', 'video_point_styles'
      ]

      for (const table of styleTables) {
        const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`)
        if (rows.length === 0) {
          console.log(`✓ 样式表 ${table} 已删除`)
        } else {
          console.log(`⚠ 样式表 ${table} 仍然存在`)
        }
      }

      return true
    } catch (error) {
      console.error('✗ 数据库验证失败:', error)
      return false
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  async verifyConfigFile() {
    try {
      const configExists = await fs.access(this.configPath).then(() => true).catch(() => false)
      if (!configExists) {
        console.log('✗ 配置文件不存在')
        return false
      }

      const configData = await fs.readFile(this.configPath, 'utf8')
      const config = JSON.parse(configData)

      // 检查必要的配置节
      const requiredSections = ['pointStyles', 'kmlStyles', 'mapSettings']
      for (const section of requiredSections) {
        if (config[section]) {
          console.log(`✓ 配置节 ${section} 存在`)
        } else {
          console.log(`✗ 配置节 ${section} 不存在`)
          return false
        }
      }

      // 检查点位样式配置
      if (config.pointStyles.panorama && config.pointStyles.video) {
        console.log('✓ 点位样式配置完整')
      } else {
        console.log('✗ 点位样式配置不完整')
        return false
      }

      console.log('✓ 配置文件验证成功')
      return true
    } catch (error) {
      console.error('✗ 配置文件验证失败:', error)
      return false
    }
  }

  async verifyCodeChanges() {
    try {
      // 检查ConfigService是否存在
      const serviceExists = await fs.access(
        path.join(__dirname, '../server/src/services/ConfigService.js')
      ).then(() => true).catch(() => false)

      if (serviceExists) {
        console.log('✓ ConfigService 文件存在')
      } else {
        console.log('✗ ConfigService 文件不存在')
        return false
      }

      // 检查旧模型文件是否已删除
      const oldModels = [
        '../server/src/models/kmlFileStyle.model.js',
        '../server/src/models/panoramaPointStyle.model.js',
        '../server/src/models/videoPointStyle.model.js'
      ]

      for (const model of oldModels) {
        const exists = await fs.access(path.join(__dirname, model)).then(() => true).catch(() => false)
        if (!exists) {
          console.log(`✓ 旧模型文件 ${path.basename(model)} 已删除`)
        } else {
          console.log(`⚠ 旧模型文件 ${path.basename(model)} 仍然存在`)
        }
      }

      console.log('✓ 代码变更验证完成')
      return true
    } catch (error) {
      console.error('✗ 代码变更验证失败:', error)
      return false
    }
  }

  async verifyAPIEndpoints() {
    try {
      // 检查点样式控制器文件
      const controllerPath = path.join(__dirname, '../server/src/controllers/pointStyle.controller.js')
      const controllerContent = await fs.readFile(controllerPath, 'utf8')
      
      if (controllerContent.includes('ConfigService')) {
        console.log('✓ 点样式控制器已使用ConfigService')
      } else {
        console.log('✗ 点样式控制器未使用ConfigService')
        return false
      }

      // 检查KML文件控制器
      const kmlControllerPath = path.join(__dirname, '../server/src/controllers/kmlFile.controller.js')
      const kmlControllerContent = await fs.readFile(kmlControllerPath, 'utf8')
      
      if (kmlControllerContent.includes('ConfigService')) {
        console.log('✓ KML文件控制器已使用ConfigService')
      } else {
        console.log('✗ KML文件控制器未使用ConfigService')
        return false
      }

      console.log('✓ API端点验证完成')
      return true
    } catch (error) {
      console.error('✗ API端点验证失败:', error)
      return false
    }
  }

  async runFullVerification() {
    console.log('开始重构验证...\n')

    const dbResult = await this.verifyDatabase()
    console.log('')
    
    const configResult = await this.verifyConfigFile()
    console.log('')
    
    const codeResult = await this.verifyCodeChanges()
    console.log('')

    const apiResult = await this.verifyAPIEndpoints()
    console.log('')

    if (dbResult && configResult && codeResult && apiResult) {
      console.log('🎉 重构验证成功！所有检查项都通过。')
      return true
    } else {
      console.log('❌ 重构验证失败！请检查上述问题。')
      return false
    }
  }

  async checkMigrationStatus() {
    let connection
    try {
      connection = await mysql.createConnection(this.dbConfig)
      
      // 检查是否有旧表存在
      const oldTables = ['kml_file_styles', 'panorama_point_styles', 'video_point_styles']
      let hasOldTables = false

      for (const table of oldTables) {
        const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`)
        if (rows.length > 0) {
          console.log(`⚠ 旧表 ${table} 仍然存在，需要迁移`)
          hasOldTables = true
        }
      }

      if (hasOldTables) {
        console.log('💡 运行以下命令完成迁移:')
        console.log('   node scripts/migrate-config-to-files.js')
      } else {
        console.log('✓ 迁移已完成')
      }

      return !hasOldTables
    } catch (error) {
      console.error('检查迁移状态失败:', error)
      return false
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }
}

module.exports = RefactorVerifier

if (require.main === module) {
  const verifier = new RefactorVerifier()
  
  async function main() {
    console.log('🔍 地图全景系统重构验证工具\n')
    
    const success = await verifier.runFullVerification()
    console.log('\n📊 迁移状态检查...')
    await verifier.checkMigrationStatus()
    
    console.log('\n🔧 使用说明:')
    console.log('1. 如果需要迁移旧配置: node scripts/migrate-config-to-files.js')
    console.log('2. 检查数据库连接: npm run check-db')
    console.log('3. 启动开发服务器: npm run dev')
    
    process.exit(success ? 0 : 1)
  }
  
  main()
}
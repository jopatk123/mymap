const { getDatabase } = require('./src/config/database')
const Logger = require('./src/utils/logger')

/**
 * 检查SQLite数据库状态
 */
async function checkDatabase() {
  try {
  Logger.info('🔍 检查SQLite数据库状态...')
    
    const db = await getDatabase()
    
    // 检查表结构
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    
  Logger.info('📋 数据表:')
    for (const table of tables) {
      const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`)
      Logger.info(`   ${table.name}: ${count.count} 条记录`)
    }
    
  // spacer
    
    // 检查文件夹结构
    const folders = await db.all('SELECT * FROM folders ORDER BY id')
    Logger.info('📁 文件夹结构:')
    folders.forEach(folder => {
      const prefix = folder.parent_id ? '  └─ ' : '├─ '
      Logger.info(`   ${prefix}${folder.name} (ID: ${folder.id})`)
    })
    
  // spacer
    
    // 检查最近的数据
    const recentPanoramas = await db.all(`
      SELECT title, created_at FROM panoramas 
      ORDER BY created_at DESC LIMIT 5
    `)
    
    if (recentPanoramas.length > 0) {
      Logger.info('📸 最近的全景图:')
      recentPanoramas.forEach(p => {
        Logger.info(`   ${p.title} (${p.created_at})`)
      })
    }
    
  // spacer
    Logger.info('✅ 数据库状态正常')
    
  } catch (error) {
  Logger.error('❌ 数据库检查失败:', error.message)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      Logger.error(error)
      process.exit(1)
    })
}

module.exports = { checkDatabase }
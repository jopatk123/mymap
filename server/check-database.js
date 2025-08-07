const { getDatabase } = require('./src/config/database')

/**
 * 检查SQLite数据库状态
 */
async function checkDatabase() {
  try {
    console.log('🔍 检查SQLite数据库状态...')
    console.log('')
    
    const db = await getDatabase()
    
    // 检查表结构
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    
    console.log('📋 数据表:')
    for (const table of tables) {
      const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`)
      console.log(`   ${table.name}: ${count.count} 条记录`)
    }
    
    console.log('')
    
    // 检查文件夹结构
    const folders = await db.all('SELECT * FROM folders ORDER BY id')
    console.log('📁 文件夹结构:')
    folders.forEach(folder => {
      const prefix = folder.parent_id ? '  └─ ' : '├─ '
      console.log(`   ${prefix}${folder.name} (ID: ${folder.id})`)
    })
    
    console.log('')
    
    // 检查最近的数据
    const recentPanoramas = await db.all(`
      SELECT title, created_at FROM panoramas 
      ORDER BY created_at DESC LIMIT 5
    `)
    
    if (recentPanoramas.length > 0) {
      console.log('📸 最近的全景图:')
      recentPanoramas.forEach(p => {
        console.log(`   ${p.title} (${p.created_at})`)
      })
    }
    
    console.log('')
    console.log('✅ 数据库状态正常')
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { checkDatabase }
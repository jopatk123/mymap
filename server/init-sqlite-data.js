const { getDatabase, initTables } = require('./src/config/database')
const { initDefaultFolder } = require('./src/init/init-default-folder')

/**
 * 初始化SQLite数据库并插入示例数据
 */
async function initSQLiteData() {
  try {
    console.log('🚀 开始初始化SQLite数据库...')
    
    // 初始化数据库表
    await initTables()
    console.log('✅ 数据库表创建完成')
    
    // 初始化默认文件夹
    await initDefaultFolder()
    console.log('✅ 默认文件夹创建完成')
    
    const db = await getDatabase()
    
  // 已移除示例数据插入（开发环境自动插入的测试数据已删除）
  console.log('ℹ️ 已跳过示例数据插入')
    
    // 验证数据
    const folderCount = await db.get('SELECT COUNT(*) as count FROM folders')
    const panoramaCount = await db.get('SELECT COUNT(*) as count FROM panoramas')
    const videoCount = await db.get('SELECT COUNT(*) as count FROM video_points')
    
    console.log('📊 数据统计:')
    console.log(`   文件夹: ${folderCount.count} 个`)
    console.log(`   全景图: ${panoramaCount.count} 个`)
    console.log(`   视频点位: ${videoCount.count} 个`)
    
    console.log('🎉 SQLite数据库初始化完成!')
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message)
    throw error
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initSQLiteData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { initSQLiteData }
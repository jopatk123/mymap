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
    
    // 插入示例文件夹
    await db.run(`
      INSERT OR IGNORE INTO folders (id, name, parent_id, is_visible, sort_order) VALUES 
      (2, '北京景点', NULL, 1, 1),
      (3, '历史建筑', 2, 1, 0),
      (4, '现代建筑', 2, 1, 1)
    `)
    
    // 插入示例全景图数据
    await db.run(`
      INSERT OR IGNORE INTO panoramas (
        title, description, image_url, thumbnail_url, 
        latitude, longitude, gcj02_lat, gcj02_lng, 
        file_size, file_type, folder_id, sort_order
      ) VALUES 
      ('天安门广场', '北京天安门广场全景图', '/uploads/panoramas/sample1.jpg', '/uploads/thumbnails/sample1.jpg', 
       39.9042, 116.4074, 39.9042, 116.4074, 2048000, 'image/jpeg', 3, 0),
      ('故宫太和殿', '北京故宫太和殿全景图', '/uploads/panoramas/sample2.jpg', '/uploads/thumbnails/sample2.jpg', 
       39.9163, 116.3972, 39.9163, 116.3972, 1856000, 'image/jpeg', 3, 1),
      ('颐和园昆明湖', '北京颐和园昆明湖全景图', '/uploads/panoramas/sample3.jpg', '/uploads/thumbnails/sample3.jpg', 
       39.9999, 116.2755, 39.9999, 116.2755, 2304000, 'image/jpeg', 3, 2),
      ('长城八达岭', '北京八达岭长城全景图', '/uploads/panoramas/sample4.jpg', '/uploads/thumbnails/sample4.jpg', 
       40.3584, 116.0138, 40.3584, 116.0138, 2560000, 'image/jpeg', 3, 3),
      ('鸟巢体育场', '北京国家体育场(鸟巢)全景图', '/uploads/panoramas/sample5.jpg', '/uploads/thumbnails/sample5.jpg', 
       39.9928, 116.3975, 39.9928, 116.3975, 1792000, 'image/jpeg', 4, 0)
    `)
    
    // 插入示例视频点位数据
    await db.run(`
      INSERT OR IGNORE INTO video_points (
        title, description, video_url, latitude, longitude, 
        gcj02_lat, gcj02_lng, file_size, file_type, duration, folder_id
      ) VALUES 
      ('天安门广场视频', '北京天安门广场实时视频', '/uploads/videos/sample1.mp4', 
       39.9042, 116.4074, 39.9042, 116.4074, 10485760, 'video/mp4', 120, 3),
      ('故宫太和殿视频', '北京故宫太和殿介绍视频', '/uploads/videos/sample2.mp4', 
       39.9163, 116.3972, 39.9163, 116.3972, 8388608, 'video/mp4', 90, 3),
      ('颐和园昆明湖视频', '北京颐和园昆明湖风景视频', '/uploads/videos/sample3.mp4', 
       39.9999, 116.2755, 39.9999, 116.2755, 12582912, 'video/mp4', 150, 3)
    `)
    
    console.log('✅ 示例数据插入完成')
    
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
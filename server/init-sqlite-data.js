const { getDatabase, initTables } = require('./src/config/database');
const { initDefaultFolder } = require('./src/init/init-default-folder');
const Logger = require('./src/utils/logger');

/**
 * 初始化SQLite数据库并插入示例数据
 */
async function initSQLiteData() {
  try {
    Logger.info('🚀 开始初始化SQLite数据库...');

    // 初始化数据库表
    await initTables();
    Logger.info('✅ 数据库表创建完成');

    // 初始化默认文件夹
    await initDefaultFolder();
    Logger.info('✅ 默认文件夹创建完成');

    const db = await getDatabase();

    // 已移除示例数据插入（开发环境自动插入的测试数据已删除）
    Logger.info('ℹ️ 已跳过示例数据插入');

    // 验证数据
    const folderCount = await db.get('SELECT COUNT(*) as count FROM folders');
    const panoramaCount = await db.get('SELECT COUNT(*) as count FROM panoramas');
    const videoCount = await db.get('SELECT COUNT(*) as count FROM video_points');

    Logger.info('📊 数据统计:');
    Logger.info(`   文件夹: ${folderCount.count} 个`);
    Logger.info(`   全景图: ${panoramaCount.count} 个`);
    Logger.info(`   视频点位: ${videoCount.count} 个`);

    Logger.info('🎉 SQLite数据库初始化完成!');
  } catch (error) {
    Logger.error('❌ 数据库初始化失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initSQLiteData()
    .then(() => process.exit(0))
    .catch((error) => {
      Logger.error(error);
      process.exit(1);
    });
}

module.exports = { initSQLiteData };

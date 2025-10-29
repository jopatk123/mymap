const Logger = require('../utils/logger');
const { getDatabase, closeDatabase } = require('./database/connection');
const { initTables } = require('./database/schema');

// 测试数据库连接
const testConnection = async () => {
  try {
    const database = await getDatabase();
    await database.get('SELECT 1');
    return true;
  } catch (error) {
    Logger.error('数据库连接失败:', error.message);
    return false;
  }
};

// 执行查询
const query = async (sql, params = []) => {
  try {
    const database = await getDatabase();

    // 判断是否为SELECT查询
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return await database.all(sql, params);
    } else {
      const result = await database.run(sql, params);
      return result;
    }
  } catch (error) {
    Logger.error('数据库查询错误:', error.message);
    throw error;
  }
};

// 执行事务
const transaction = async (callback) => {
  const database = await getDatabase();

  try {
    await database.exec('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.exec('COMMIT');
    return result;
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
};

module.exports = {
  getDatabase,
  query,
  transaction,
  testConnection,
  initTables,
  closeDatabase,
};

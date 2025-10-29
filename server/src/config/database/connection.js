const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../index');
const Logger = require('../../utils/logger');

let db = null;

// 确保数据库文件所在的目录存在
const ensureDataDir = () => {
  const dbPath = config.database.path;
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// 初始化数据库连接，并确保启用必须的 PRAGMA 设置
const initDatabase = async () => {
  if (db) return db;

  ensureDataDir();

  db = await open({
    filename: config.database.path,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  return db;
};

// 返回复用的数据库实例
const getDatabase = async () => {
  if (!db) {
    await initDatabase();
  }
  return db;
};

// 关闭连接，供测试或进程退出时使用
const closeDatabase = async () => {
  try {
    if (db) {
      await db.close();
      db = null;
    }
  } catch (error) {
    Logger.error('关闭数据库连接失败:', error.message);
  }
};

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase,
};

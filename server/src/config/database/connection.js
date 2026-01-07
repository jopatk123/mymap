const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../index');
const Logger = require('../../utils/logger');

let db = null;

const nowStamp = () => {
  // 文件名安全时间戳：YYYYMMDD-HHMMSS
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
};

const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (_e) {
    return false;
  }
};

const ensureDirForFile = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
};

const quarantineCorruptedDbFile = async (dbPath) => {
  const corruptPath = `${dbPath}.corrupt-${nowStamp()}`;
  try {
    await fs.promises.rename(dbPath, corruptPath);
    Logger.error(`检测到 SQLite 数据库损坏，已隔离文件: ${corruptPath}`);
  } catch (err) {
    Logger.error(`隔离损坏数据库文件失败: ${err.message}`);
    // 兜底：尝试直接删除，避免持续 500
    try {
      await fs.promises.unlink(dbPath);
      Logger.error('已删除损坏数据库文件（隔离失败后的兜底）');
    } catch (e) {
      Logger.error(`删除损坏数据库文件失败: ${e.message}`);
    }
  }
};

const runIntegrityCheck = async (database) => {
  // quick_check 性能更好，失败时再做 integrity_check
  const quick = await database.get("PRAGMA quick_check;");
  const quickValue = quick && (quick.quick_check || quick['quick_check'] || Object.values(quick)[0]);
  if (String(quickValue).toLowerCase() === 'ok') return true;

  const full = await database.get("PRAGMA integrity_check;");
  const fullValue = full && (full.integrity_check || full['integrity_check'] || Object.values(full)[0]);
  return String(fullValue).toLowerCase() === 'ok';
};

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

  const dbPath = config.database.path;
  await ensureDirForFile(dbPath);

  // 第一次打开
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  try {
    // 关键 PRAGMA：降低并发/强杀下的损坏概率
    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('PRAGMA busy_timeout = 5000');
    // WAL 更抗崩溃；在部分文件系统上可能失败，因此容错
    try {
      await db.exec('PRAGMA journal_mode = WAL');
    } catch (e) {
      Logger.warn(`无法启用 WAL 模式，将继续使用默认 journal_mode: ${e.message}`);
    }
    await db.exec('PRAGMA synchronous = NORMAL');
    await db.exec('PRAGMA wal_autocheckpoint = 1000');

    // 启动自检：如果 DB 已损坏，避免持续 500（隔离/恢复/重建）
    const ok = await runIntegrityCheck(db);
    if (!ok) {
      Logger.error('SQLite integrity_check 失败，判定数据库已损坏');
      await db.close();
      db = null;

      if (await fileExists(dbPath)) {
        await quarantineCorruptedDbFile(dbPath);
      }

      // 开发环境不做备份恢复：直接重建空库，避免误会

      db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
      await db.exec('PRAGMA foreign_keys = ON');
      await db.exec('PRAGMA busy_timeout = 5000');
      try {
        await db.exec('PRAGMA journal_mode = WAL');
      } catch (e) {
        Logger.warn(`无法启用 WAL 模式，将继续使用默认 journal_mode: ${e.message}`);
      }
      await db.exec('PRAGMA synchronous = NORMAL');
      await db.exec('PRAGMA wal_autocheckpoint = 1000');
    }
  } catch (error) {
    Logger.error('初始化数据库 PRAGMA/自检失败:', error.message);
  }

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

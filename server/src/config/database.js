const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const config = require('./index');
const Logger = require('../utils/logger');

let db = null;

// 确保数据目录存在
const ensureDataDir = () => {
  const dbPath = config.database.path;
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// 初始化数据库连接
const initDatabase = async () => {
  if (db) return db;

  ensureDataDir();

  db = await open({
    filename: config.database.path,
    driver: sqlite3.Database,
  });

  // 启用外键约束
  await db.exec('PRAGMA foreign_keys = ON');

  return db;
};

// 获取数据库实例
const getDatabase = async () => {
  if (!db) {
    await initDatabase();
  }
  return db;
};

// 检查表中是否存在指定列
const columnExists = async (database, table, column) => {
  try {
    const rows = await database.all(`PRAGMA table_info(${table});`);
    return rows.some((r) => r.name === column);
  } catch (err) {
    Logger.warn(`检查列是否存在失败: ${table}.${column} -> ${err.message}`);
    return false;
  }
};

// 获取/设置 user_version（简单迁移版本）
const getUserVersion = async (database) => {
  const row = await database.get('PRAGMA user_version');
  return row && row.user_version ? row.user_version : 0;
};

const setUserVersion = async (database, v) => {
  await database.exec(`PRAGMA user_version = ${v}`);
};

// 运行迁移（目前只是保证 kml_files 表有 is_basemap 列）
const runMigrations = async (database) => {
  try {
    const current = await getUserVersion(database);
    const migrations = [
      {
        version: 1,
        description: 'ensure is_basemap column exists on kml_files',
        up: async () => {
          const exists = await columnExists(database, 'kml_files', 'is_basemap');
          if (!exists) {
            Logger.info('迁移: 添加 kml_files.is_basemap 列');
            await database.exec('ALTER TABLE kml_files ADD COLUMN is_basemap INTEGER DEFAULT 0;');
          }
        },
      },
      {
        version: 2,
        description: 'add owner_id columns to core tables',
        up: async () => {
          const targetTables = ['folders', 'panoramas', 'kml_files', 'kml_points', 'video_points'];
          for (const table of targetTables) {
            const exists = await columnExists(database, table, 'owner_id');
            if (!exists) {
              Logger.info(`迁移: 添加 ${table}.owner_id 列`);
              await database.exec(
                `ALTER TABLE ${table} ADD COLUMN owner_id INTEGER REFERENCES users(id)`
              );
            }
            await database.exec(
              `CREATE INDEX IF NOT EXISTS idx_${table}_owner_id ON ${table}(owner_id);`
            );
          }
        },
      },
      {
        version: 3,
        description: 'ensure sessions table has timestamp columns',
        up: async () => {
          const hasCreatedAt = await columnExists(database, 'sessions', 'created_at');
          if (!hasCreatedAt) {
            Logger.info('迁移: 为 sessions 添加 created_at/updated_at 列');
            await database.exec(
              'ALTER TABLE sessions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;'
            );
            await database.exec(
              'ALTER TABLE sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;'
            );
          }
        },
      },
      {
        version: 4,
        description: 'rename users.email column to username',
        up: async () => {
          const hasUsername = await columnExists(database, 'users', 'username');
          if (!hasUsername) {
            const hasEmail = await columnExists(database, 'users', 'email');
            if (hasEmail) {
              Logger.info('迁移: 将 users.email 列重命名为 username');
              await database.exec('ALTER TABLE users RENAME COLUMN email TO username;');
            }
          }

          await database.exec('DROP INDEX IF EXISTS idx_users_email;');
          await database.exec('DROP INDEX IF EXISTS users_email_key;');
          await database.exec(
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);'
          );
        },
      },
      {
        version: 5,
        description: 'align sessions table with Prisma session store schema',
        up: async () => {
          const hasExpiresAt = await columnExists(database, 'sessions', 'expires_at');
          const hasActiveExpires = await columnExists(database, 'sessions', 'active_expires');
          const hasLegacyUserId = await columnExists(database, 'sessions', 'user_id');

          if (!hasExpiresAt) {
            Logger.info('迁移: 重建 sessions 表以包含 expires_at 列');
            await database.exec(`
              CREATE TABLE IF NOT EXISTS sessions_tmp (
                id TEXT PRIMARY KEY,
                sid TEXT NOT NULL UNIQUE,
                userId INTEGER,
                expires_at DATETIME NOT NULL,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
              );
            `);

            const userIdColumn = hasLegacyUserId ? 'user_id' : 'userId';
            if (hasActiveExpires) {
              await database.exec(`
                INSERT INTO sessions_tmp (id, sid, userId, expires_at, data, created_at, updated_at)
                SELECT
                  id,
                  sid,
                  ${userIdColumn},
                  CASE
                    WHEN active_expires IS NOT NULL THEN datetime(active_expires / 1000, 'unixepoch')
                    ELSE datetime('now')
                  END,
                  data,
                  created_at,
                  updated_at
                FROM sessions;
              `);
            } else {
              await database.exec(`
                INSERT INTO sessions_tmp (id, sid, userId, expires_at, data, created_at, updated_at)
                SELECT
                  id,
                  sid,
                  ${userIdColumn},
                  datetime('now'),
                  data,
                  created_at,
                  updated_at
                FROM sessions;
              `);
            }

            await database.exec('DROP TABLE sessions;');
            await database.exec('ALTER TABLE sessions_tmp RENAME TO sessions;');
          }

          await database.exec('DROP INDEX IF EXISTS idx_sessions_user_id;');
          await database.exec('DROP INDEX IF EXISTS sessions_userId_idx;');
          await database.exec('DROP INDEX IF EXISTS idx_sessions_active_expires;');
          await database.exec('DROP INDEX IF EXISTS idx_sessions_idle_expires;');
          await database.exec(
            'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(userId);'
          );
          await database.exec(
            'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);'
          );
        },
      },
    ];

    for (const m of migrations) {
      if (m.version > current) {
        Logger.info(`Applying DB migration v${m.version}: ${m.description}`);
        await m.up();
        await setUserVersion(database, m.version);
      }
    }
  } catch (err) {
    Logger.warn('运行数据库迁移时出现问题: ' + err.message);
  }
};

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

// 初始化数据库表
const initTables = async () => {
  try {
    const database = await getDatabase();

    // 创建文件夹表
    const createFoldersTable = `
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE RESTRICT
      )
    `;

    await database.exec(createFoldersTable);

    // 创建文件夹表索引
    await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)');
    await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(sort_order)');
    await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name)');

    // 创建全景图表
    const createPanoramasTable = `
      CREATE TABLE IF NOT EXISTS panoramas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        file_size INTEGER,
        file_type TEXT,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `;

    await database.exec(createPanoramasTable);

    // 创建全景图表索引
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_panoramas_location ON panoramas(latitude, longitude)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_panoramas_gcj02_location ON panoramas(gcj02_lat, gcj02_lng)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_panoramas_folder_id ON panoramas(folder_id)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_panoramas_is_visible ON panoramas(is_visible)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_panoramas_created_at ON panoramas(created_at)'
    );
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_title ON panoramas(title)');
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_panoramas_sort_order ON panoramas(sort_order)'
    );

    // 创建KML文件表
    const createKmlFilesTable = `
      CREATE TABLE IF NOT EXISTS kml_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
  file_url TEXT NOT NULL,
        file_size INTEGER,
  is_basemap INTEGER DEFAULT 0,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `;

    await database.exec(createKmlFilesTable);

    // 创建KML文件表索引
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_files_folder_id ON kml_files(folder_id)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_files_is_visible ON kml_files(is_visible)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_files_created_at ON kml_files(created_at)'
    );
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_title ON kml_files(title)');
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_files_sort_order ON kml_files(sort_order)'
    );

    // 创建KML点位表
    const createKmlPointsTable = `
      CREATE TABLE IF NOT EXISTS kml_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kml_file_id INTEGER NOT NULL,
        name TEXT,
        description TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        altitude REAL DEFAULT 0,
        point_type TEXT DEFAULT 'Point',
        coordinates TEXT,
        style_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kml_file_id) REFERENCES kml_files(id) ON DELETE CASCADE
      )
    `;

    await database.exec(createKmlPointsTable);

    // 创建KML点位表索引
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_points_kml_file_id ON kml_points(kml_file_id)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_points_location ON kml_points(latitude, longitude)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_points_gcj02_location ON kml_points(gcj02_lat, gcj02_lng)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_kml_points_point_type ON kml_points(point_type)'
    );

    // 创建视频点位表
    const createVideoPointsTable = `
      CREATE TABLE IF NOT EXISTS video_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        file_size INTEGER,
        file_type TEXT,
        duration INTEGER,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `;

    await database.exec(createVideoPointsTable);

    // 创建视频点位表索引
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_video_points_location ON video_points(latitude, longitude)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_video_points_gcj02_location ON video_points(gcj02_lat, gcj02_lng)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_video_points_folder_id ON video_points(folder_id)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_video_points_is_visible ON video_points(is_visible)'
    );
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_video_points_created_at ON video_points(created_at)'
    );
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_title ON video_points(title)');
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_video_points_sort_order ON video_points(sort_order)'
    );

    // 创建用户表
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        salt TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await database.exec(createUsersTable);
    await database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');

    // 创建会话表
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        sid TEXT NOT NULL UNIQUE,
        userId INTEGER,
        expires_at DATETIME NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await database.exec(createSessionsTable);

    // 运行轻量级迁移，确保旧表结构与最新要求保持一致
    try {
      await runMigrations(database);
    } catch (err) {
      Logger.warn('运行迁移失败:', err.message);
    }

    // 创建密码重置表
    const createPasswordResetTable = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await database.exec(createPasswordResetTable);
    await database.exec(
      'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)'
    );

    // 初始化默认文件夹（使用 SQLite 版实现）
    try {
      const { initDefaultFolder } = require('../init/init-default-folder');
      await initDefaultFolder();
    } catch (error) {
      Logger.warn('初始化默认文件夹失败:', error.message);
    }
  } catch (error) {
    Logger.error('数据库表初始化失败:', error.message);
    throw error;
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

// 关闭数据库连接
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
  query,
  transaction,
  testConnection,
  initTables,
  closeDatabase,
};

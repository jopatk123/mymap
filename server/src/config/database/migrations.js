const Logger = require('../../utils/logger');

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

// 数据库迁移定义，确保旧结构逐步兼容新结构
const migrations = [
  {
    version: 1,
    description: 'ensure is_basemap column exists on kml_files',
    up: async (database) => {
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
    up: async (database) => {
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
    up: async (database) => {
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
    up: async (database) => {
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
    up: async (database) => {
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
      await database.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(userId);');
      await database.exec(
        'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);'
      );
    },
  },
];

// 按照版本号依次执行迁移脚本
const runMigrations = async (database) => {
  try {
    const current = await getUserVersion(database);
    for (const migration of migrations) {
      if (migration.version > current) {
        Logger.info(`Applying DB migration v${migration.version}: ${migration.description}`);
        await migration.up(database);
        await setUserVersion(database, migration.version);
      }
    }
  } catch (err) {
    Logger.warn('运行数据库迁移时出现问题: ' + err.message);
  }
};

module.exports = {
  runMigrations,
};

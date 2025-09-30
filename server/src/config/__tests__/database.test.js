const fs = require('fs');
const os = require('os');
const path = require('path');

const createTestModule = async () => {
  const originalDbPath = process.env.DB_PATH;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mymap-db-'));
  process.env.DB_PATH = path.join(tempDir, 'test.db');

  jest.resetModules();
  const dbModule = require('../database');

  const cleanup = async () => {
    await dbModule.closeDatabase();
    process.env.DB_PATH = originalDbPath;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };

  return { dbModule, tempDir, cleanup };
};

describe('database configuration helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes schema and runs migrations to add kml_files.is_basemap', async () => {
    const { dbModule, cleanup } = await createTestModule();

    try {
      await dbModule.initTables();

      const database = await dbModule.getDatabase();
      const columns = await database.all('PRAGMA table_info(kml_files)');
      const columnNames = columns.map((col) => col.name);
      expect(columnNames).toContain('is_basemap');

      const folders = await dbModule.query('SELECT name FROM folders');
      const folderNames = folders.map((row) => row.name);
      expect(folderNames).toContain('默认文件夹');
    } finally {
      await cleanup();
    }
  });

  it('executes SELECT and mutation queries with proper results', async () => {
    const { dbModule, cleanup } = await createTestModule();
    try {
      await dbModule.initTables();

      const insertResult = await dbModule.query(
        'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
        ['测试文件夹', null, true, 1]
      );
      expect(insertResult.lastID || insertResult.insertId).toBeTruthy();

      const rows = await dbModule.query('SELECT name, sort_order FROM folders ORDER BY id ASC');
      const names = rows.map((row) => row.name);
      expect(names).toEqual(['默认文件夹', '测试文件夹']);
    } finally {
      await cleanup();
    }
  });

  it('wraps operations in transactions and rolls back on errors', async () => {
    const { dbModule, cleanup } = await createTestModule();
    try {
      await dbModule.initTables();

      const initial = await dbModule.query('SELECT COUNT(*) AS c FROM folders');
      expect(initial[0].c).toBe(1);

      await dbModule.transaction(async (database) => {
        await database.run(
          'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
          ['事务文件夹', null, true, 2]
        );
      });

      const afterCommit = await dbModule.query('SELECT COUNT(*) AS c FROM folders');
      expect(afterCommit[0].c).toBe(2);

      await expect(
        dbModule.transaction(async (database) => {
          await database.run(
            'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
            ['应回滚', null, true, 3]
          );
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      const afterRollback = await dbModule.query('SELECT COUNT(*) AS c FROM folders');
      expect(afterRollback[0].c).toBe(2);
    } finally {
      await cleanup();
    }
  });

  it('reports errors when closing database fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { dbModule, cleanup } = await createTestModule();
    try {
      await dbModule.initTables();

      const database = await dbModule.getDatabase();
      database.close = jest.fn().mockRejectedValue(new Error('close failed'));

      await dbModule.closeDatabase();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('关闭数据库连接失败:'),
        'close failed'
      );
    } finally {
      await cleanup();
    }
  });

  it('returns false and logs message when testConnection cannot run SELECT', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { dbModule, cleanup } = await createTestModule();
    try {
      await dbModule.initTables();

      const database = await dbModule.getDatabase();
      database.get = jest.fn().mockRejectedValue(new Error('select failed'));

      const ok = await dbModule.testConnection();
      expect(ok).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('数据库连接失败:'),
        'select failed'
      );
    } finally {
      await cleanup();
    }
  });
});

const { withTempDatabase } = require('../../__tests__/helpers/temp-db');

describe('database configuration helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes schema and runs migrations to add kml_files.is_basemap', async () => {
    await withTempDatabase(async ({ database }) => {
      await database.initTables();

      const dbInstance = await database.getDatabase();
      const columns = await dbInstance.all('PRAGMA table_info(kml_files)');
      const columnNames = columns.map((col) => col.name);
      expect(columnNames).toContain('is_basemap');

      const folders = await database.query('SELECT name FROM folders');
      const folderNames = folders.map((row) => row.name);
      expect(folderNames).toContain('默认文件夹');
    });
  });

  it('executes SELECT and mutation queries with proper results', async () => {
    await withTempDatabase(async ({ database }) => {
      await database.initTables();

      const insertResult = await database.query(
        'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
        ['测试文件夹', null, true, 1]
      );
      expect(insertResult.lastID || insertResult.insertId).toBeTruthy();

      const rows = await database.query('SELECT name, sort_order FROM folders ORDER BY id ASC');
      const names = rows.map((row) => row.name);
      expect(names).toEqual(['默认文件夹', '测试文件夹']);
    });
  });

  it('wraps operations in transactions and rolls back on errors', async () => {
    await withTempDatabase(async ({ database }) => {
      await database.initTables();

      const initial = await database.query('SELECT COUNT(*) AS c FROM folders');
      expect(initial[0].c).toBe(1);

      await database.transaction(async (dbConn) => {
        await dbConn.run(
          'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
          ['事务文件夹', null, true, 2]
        );
      });

      const afterCommit = await database.query('SELECT COUNT(*) AS c FROM folders');
      expect(afterCommit[0].c).toBe(2);

      await expect(
        database.transaction(async (dbConn) => {
          await dbConn.run(
            'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
            ['应回滚', null, true, 3]
          );
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      const afterRollback = await database.query('SELECT COUNT(*) AS c FROM folders');
      expect(afterRollback[0].c).toBe(2);
    });
  });

  it('reports errors when closing database fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await withTempDatabase(async ({ database }) => {
      await database.initTables();

      const dbInstance = await database.getDatabase();
      const originalClose = dbInstance.close;
      dbInstance.close = jest.fn().mockRejectedValue(new Error('close failed'));

      await database.closeDatabase();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('关闭数据库连接失败:'),
        'close failed'
      );

      dbInstance.close = originalClose;
    });
  });

  it('returns false and logs message when testConnection cannot run SELECT', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await withTempDatabase(async ({ database }) => {
      await database.initTables();

      const dbInstance = await database.getDatabase();
      const originalGet = dbInstance.get;
      dbInstance.get = jest.fn().mockRejectedValue(new Error('select failed'));

      const ok = await database.testConnection();
      expect(ok).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('数据库连接失败:'),
        'select failed'
      );

      dbInstance.get = originalGet;
    });
  });
});

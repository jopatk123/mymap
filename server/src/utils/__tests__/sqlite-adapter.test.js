const { withTempDatabase } = require('../../__tests__/helpers/temp-db');

describe('SQLiteAdapter integration', () => {
  test('execute supports SELECT, INSERT and UPDATE with boolean coercion', async () => {
    await withTempDatabase(async ({ load }) => {
      const SQLiteAdapter = load('utils/sqlite-adapter');

      const [existingRows] = await SQLiteAdapter.execute(
        'SELECT id, is_visible FROM folders ORDER BY id ASC'
      );
      expect(existingRows[0].is_visible).toBe(true);

      const [insertResult] = await SQLiteAdapter.execute(
        'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
        ['集成测试文件夹', null, false, 7]
      );
      expect(insertResult).toMatchObject({ insertId: expect.any(Number), affectedRows: 1 });

      const inserted = await SQLiteAdapter.get('SELECT * FROM folders WHERE id = ?', [
        insertResult.insertId,
      ]);
      expect(inserted.is_visible).toBe(false);

      const [updateResult] = await SQLiteAdapter.execute(
        'UPDATE folders SET is_visible = ?, sort_order = ? WHERE id = ?',
        [true, 3, insertResult.insertId]
      );
      expect(updateResult.affectedRows).toBe(1);

      const reloaded = await SQLiteAdapter.all('SELECT is_visible, sort_order FROM folders WHERE id = ?', [
        insertResult.insertId,
      ]);
      expect(reloaded[0]).toEqual({ is_visible: true, sort_order: 3 });

      const runResult = await SQLiteAdapter.run(
        'UPDATE folders SET sort_order = sort_order + 1 WHERE id = ?',
        [insertResult.insertId]
      );
      expect(runResult.changes).toBe(1);
    });
  });

  test('adaptSQL converts MySQL specific functions to SQLite equivalents', async () => {
    await withTempDatabase(async ({ load }) => {
      const SQLiteAdapter = load('utils/sqlite-adapter');
      const original =
        "UPDATE panoramas SET updated_at = CURRENT_TIMESTAMP, created_at = DATE_SUB(NOW(), INTERVAL 5 DAY) WHERE id = 1";
      const adapted = SQLiteAdapter.adaptSQL(original);

      expect(adapted).toContain("datetime('now')");
      expect(adapted).not.toContain('CURRENT_TIMESTAMP');
      expect(adapted).toContain("'-5 days'");
      expect(adapted).not.toContain('DATE_SUB');
      expect(adapted).not.toContain('NOW()');
    });
  });

  test('logs query context and rethrows when execution fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await withTempDatabase(async ({ load }) => {
      const SQLiteAdapter = load('utils/sqlite-adapter');

      await expect(
        SQLiteAdapter.execute('INSERT INTO folders (name, parent_id) VALUES (?, ?)', [null, null])
      ).rejects.toThrow(/NOT NULL/);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('SQLite查询错误:'),
      expect.objectContaining({
        message: expect.stringContaining('NOT NULL'),
        sql: expect.stringContaining('INSERT INTO folders'),
      })
    );

    consoleSpy.mockRestore();
  });
});

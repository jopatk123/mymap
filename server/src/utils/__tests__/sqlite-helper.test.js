const {
  sqliteToBoolean,
  booleanToSqlite,
  convertBooleanFields,
  DEFAULT_BOOLEAN_FIELDS,
} = require('../sqlite-helper');

describe('sqlite helper utilities', () => {
  test('converts primitive values between SQLite integers and booleans', () => {
    expect(sqliteToBoolean(1)).toBe(true);
    expect(sqliteToBoolean(0)).toBe(false);
    expect(booleanToSqlite(true)).toBe(1);
    expect(booleanToSqlite(false)).toBe(0);
  });

  test('convertBooleanFields handles arrays and objects with default fields', () => {
    const input = [
      { id: 1, is_visible: 1, flag_enabled: 0 },
      { id: 2, is_basemap: 0, custom_visible: 'true', untouched: 'value' },
    ];

    const converted = convertBooleanFields(input);

    expect(converted).toEqual([
      { id: 1, is_visible: true, flag_enabled: false },
      { id: 2, is_basemap: false, custom_visible: true, untouched: 'value' },
    ]);
  });

  test('convertBooleanFields respects custom boolean field overrides', () => {
    const data = { id: 1, archived: '1', is_visible: 0 };

    const converted = convertBooleanFields(data, [...DEFAULT_BOOLEAN_FIELDS, 'archived']);

    expect(converted).toEqual({ id: 1, archived: true, is_visible: false });
  });
});

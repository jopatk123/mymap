/**
 * SQLite辅助函数
 * 处理SQLite特有的数据类型转换
 */

/**
 * 将SQLite的INTEGER转换为JavaScript的boolean
 * @param {number} value SQLite中的INTEGER值 (0或1)
 * @returns {boolean} JavaScript boolean值
 */
function sqliteToBoolean(value) {
  return value === 1;
}

/**
 * 将JavaScript的boolean转换为SQLite的INTEGER
 * @param {boolean} value JavaScript boolean值
 * @returns {number} SQLite INTEGER值 (0或1)
 */
function booleanToSqlite(value) {
  return value ? 1 : 0;
}

const DEFAULT_BOOLEAN_FIELDS = ['is_visible', 'is_basemap'];

const shouldConvertField = (field, booleanFields) => {
  if (!field) return false;
  if (booleanFields.includes(field)) return true;
  return /^is_/i.test(field) || /_(enabled|visible)$/i.test(field);
};

const coerceBoolean = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    if (value === '1' || value.toLowerCase() === 'true') return true;
    if (value === '0' || value.toLowerCase() === 'false') return false;
  }
  return value;
};

const convertObjectBooleans = (item, booleanFields) => {
  if (!item || typeof item !== 'object') return item;
  const converted = { ...item };
  for (const [field, value] of Object.entries(converted)) {
    if (shouldConvertField(field, booleanFields)) {
      converted[field] = coerceBoolean(value);
    }
  }
  return converted;
};

/**
 * 处理查询结果，转换boolean字段
 * @param {Array|Object} data 查询结果
 * @param {Array} booleanFields 需要转换的boolean字段名数组
 * @returns {Array|Object} 转换后的结果
 */
function convertBooleanFields(data, booleanFields = DEFAULT_BOOLEAN_FIELDS) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => convertObjectBooleans(item, booleanFields));
  }

  return convertObjectBooleans(data, booleanFields);
}

module.exports = {
  sqliteToBoolean,
  booleanToSqlite,
  convertBooleanFields,
  DEFAULT_BOOLEAN_FIELDS,
};

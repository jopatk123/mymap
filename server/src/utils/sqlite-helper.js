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

/**
 * 处理查询结果，转换boolean字段
 * @param {Array|Object} data 查询结果
 * @param {Array} booleanFields 需要转换的boolean字段名数组
 * @returns {Array|Object} 转换后的结果
 */
function convertBooleanFields(data, booleanFields = ['is_visible']) {
  if (!data) return data;

  const convert = (item) => {
    const converted = { ...item };
    booleanFields.forEach((field) => {
      if (field in converted) {
        converted[field] = sqliteToBoolean(converted[field]);
      }
    });
    return converted;
  };

  if (Array.isArray(data)) {
    return data.map(convert);
  } else {
    return convert(data);
  }
}

module.exports = {
  sqliteToBoolean,
  booleanToSqlite,
  convertBooleanFields,
};

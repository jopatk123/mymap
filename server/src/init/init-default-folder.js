const { query } = require('../config/database');
const Logger = require('../utils/logger');

/**
 * 初始化默认文件夹
 * 确保数据库中存在名为"默认文件夹"的文件夹
 */
async function initDefaultFolder() {
  try {
    // 检查是否已存在名为"默认文件夹"的文件夹
    const existingFolder = await query('SELECT id, name FROM folders WHERE name = ? LIMIT 1', [
      '默认文件夹',
    ]);

    if (existingFolder && existingFolder.length > 0) {
      return existingFolder[0].id;
    }

    // 创建默认文件夹
    const result = await query(
      'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
      ['默认文件夹', null, true, 0]
    );

    return result.lastID || result.insertId || null;
  } catch (error) {
    Logger.error('❌ 初始化默认文件夹失败:', error.message);
    throw error;
  }
}

module.exports = { initDefaultFolder };

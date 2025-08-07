const { getDatabase } = require('../config/database')
const { convertBooleanFields } = require('./sqlite-helper')

/**
 * SQLite数据库适配器
 * 提供与MySQL兼容的接口
 */
class SQLiteAdapter {
  /**
   * 执行查询并返回结果
   * @param {string} sql SQL语句
   * @param {Array} params 参数
   * @returns {Promise<Array|Object>} 查询结果
   */
  static async execute(sql, params = []) {
    const db = await getDatabase()
    
    // 处理SQL语句中的MySQL特定语法
    sql = this.adaptSQL(sql)
    
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await db.all(sql, params)
        // 转换boolean字段
        const convertedRows = convertBooleanFields(rows)
        return [convertedRows] // 返回MySQL格式的结果 [rows, fields]
      } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
        const result = await db.run(sql, params)
        return [{
          insertId: result.lastID,
          affectedRows: result.changes
        }]
      } else {
        const result = await db.run(sql, params)
        return [{
          affectedRows: result.changes
        }]
      }
    } catch (error) {
      console.error('SQLite查询错误:', error.message)
      console.error('SQL:', sql)
      console.error('参数:', params)
      throw error
    }
  }

  /**
   * 适配MySQL语法到SQLite
   * @param {string} sql 原始SQL
   * @returns {string} 适配后的SQL
   */
  static adaptSQL(sql) {
    // 替换MySQL特定的函数和语法
    return sql
      // 替换CURRENT_TIMESTAMP为datetime('now')
      .replace(/CURRENT_TIMESTAMP/g, "datetime('now')")
      // 替换DATE_SUB函数
      .replace(/DATE_SUB\(NOW\(\), INTERVAL (\d+) DAY\)/g, "datetime('now', '-$1 days')")
      // 替换NOW()函数
      .replace(/NOW\(\)/g, "datetime('now')")
      // 替换LIMIT语法
      .replace(/LIMIT (\d+) OFFSET (\d+)/g, 'LIMIT $2, $1')
  }

  /**
   * 获取单行结果
   * @param {string} sql SQL语句
   * @param {Array} params 参数
   * @returns {Promise<Object|null>} 单行结果
   */
  static async get(sql, params = []) {
    const db = await getDatabase()
    sql = this.adaptSQL(sql)
    const row = await db.get(sql, params)
    return convertBooleanFields(row)
  }

  /**
   * 获取所有结果
   * @param {string} sql SQL语句
   * @param {Array} params 参数
   * @returns {Promise<Array>} 所有结果
   */
  static async all(sql, params = []) {
    const db = await getDatabase()
    sql = this.adaptSQL(sql)
    const rows = await db.all(sql, params)
    return convertBooleanFields(rows)
  }

  /**
   * 执行SQL语句（不返回结果）
   * @param {string} sql SQL语句
   * @param {Array} params 参数
   * @returns {Promise<Object>} 执行结果
   */
  static async run(sql, params = []) {
    const db = await getDatabase()
    sql = this.adaptSQL(sql)
    return await db.run(sql, params)
  }
}

module.exports = SQLiteAdapter
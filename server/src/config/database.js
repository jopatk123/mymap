const mysql = require('mysql2/promise')
const config = require('./index')

// 创建连接池
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  connectionLimit: config.database.connectionLimit,
  connectTimeout: config.database.connectTimeout || 10000, // 10秒连接超时
  acquireTimeout: config.database.acquireTimeout,
  charset: 'utf8mb4',
  // 防止编码问题
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  typeCast: true
})

// 测试数据库连接
const testConnection = async () => {
  try {
    const connection = await pool.getConnection()
    console.log('数据库连接成功')
    connection.release()
    return true
  } catch (error) {
    console.error('数据库连接失败:', error.message)
    return false
  }
}

// 初始化数据库表
const initTables = async () => {
  try {
    const connection = await pool.getConnection()
    
    // 创建文件夹表
    const createFoldersTable = `
      CREATE TABLE IF NOT EXISTS folders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        parent_id INT DEFAULT NULL,
        is_visible BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE RESTRICT,
        INDEX idx_parent (parent_id),
        INDEX idx_sort_order (sort_order),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
    
    await connection.execute(createFoldersTable)
    console.log('文件夹表创建完成')

    // 创建全景图表
    const createPanoramasTable = `
      CREATE TABLE IF NOT EXISTS panoramas (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500) NOT NULL,
        thumbnail_url VARCHAR(500),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        gcj02_lat DECIMAL(10, 8),
        gcj02_lng DECIMAL(11, 8),
        file_size INT,
        file_type VARCHAR(50),
        folder_id INT DEFAULT NULL,
        is_visible BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
        INDEX idx_location (latitude, longitude),
        INDEX idx_created_at (created_at),
        INDEX idx_folder_id (folder_id),
        INDEX idx_is_visible (is_visible)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
    
    await connection.execute(createPanoramasTable)
    console.log('数据库表初始化完成')
    
    // 初始化默认文件夹
    try {
      const { initDefaultFolder } = require('../init/default-folder')
      await initDefaultFolder()
    } catch (error) {
      console.warn('初始化默认文件夹失败:', error.message)
    }
    
    connection.release()
  } catch (error) {
    console.error('数据库表初始化失败:', error.message)
    throw error
  }
}

// 执行查询
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params)
    return rows
  } catch (error) {
    console.error('数据库查询错误:', error.message)
    throw error
  }
}

// 执行事务
const transaction = async (callback) => {
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// 关闭连接池
const closePool = async () => {
  try {
    await pool.end()
    console.log('数据库连接池已关闭')
  } catch (error) {
    console.error('关闭数据库连接池失败:', error.message)
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  initTables,
  closePool
}
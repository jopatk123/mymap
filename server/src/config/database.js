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
  acquireTimeout: config.database.acquireTimeout,
  timeout: config.database.timeout,
  reconnect: true,
  charset: 'utf8mb4'
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_location (latitude, longitude),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
    
    await connection.execute(createPanoramasTable)
    console.log('数据库表初始化完成')
    
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
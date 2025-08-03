const { query } = require('../config/database')

/**
 * 初始化默认文件夹
 * 确保数据库中存在一个名为"默认文件夹"的文件夹
 */
async function initDefaultFolder() {
  try {
    // 检查是否已存在名为"默认文件夹"的文件夹
    const existingFolder = await query(
      'SELECT id FROM folders WHERE name = ? LIMIT 1',
      ['默认文件夹']
    )

    if (existingFolder && existingFolder.length > 0) {
      return existingFolder[0].id
    }

    // 创建默认文件夹
    const result = await query(
      'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
      ['默认文件夹', null, true, 0]
    )

    return result.insertId
  } catch (error) {
    console.error('初始化默认文件夹失败:', error.message)
    throw error
  }
}

/**
 * 获取默认文件夹ID
 */
async function getDefaultFolderId() {
  try {
    const result = await query(
      'SELECT id FROM folders WHERE name = ? LIMIT 1',
      ['默认文件夹']
    )
    
    return result && result.length > 0 ? result[0].id : null
  } catch (error) {
    console.error('获取默认文件夹ID失败:', error.message)
    return null
  }
}

/**
 * 初始化数据库表结构（包括folders表）
 */
async function initDatabase() {
  try {
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

    await query(createFoldersTable)

    // 创建全景图表（如果还没有）
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

    await query(createPanoramasTable)

    // 初始化默认文件夹
    await initDefaultFolder()
    
  } catch (error) {
    console.error('数据库初始化失败:', error.message)
    throw error
  }
}

module.exports = {
  initDefaultFolder,
  getDefaultFolderId,
  initDatabase
}
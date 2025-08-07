const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')
const path = require('path')
const fs = require('fs')
const config = require('./index')

let db = null

// 确保数据目录存在
const ensureDataDir = () => {
  const dbPath = config.database.path
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// 初始化数据库连接
const initDatabase = async () => {
  if (db) return db
  
  ensureDataDir()
  
  db = await open({
    filename: config.database.path,
    driver: sqlite3.Database
  })
  
  // 启用外键约束
  await db.exec('PRAGMA foreign_keys = ON')
  
  return db
}

// 获取数据库实例
const getDatabase = async () => {
  if (!db) {
    await initDatabase()
  }
  return db
}

// 测试数据库连接
const testConnection = async () => {
  try {
    const database = await getDatabase()
    await database.get('SELECT 1')
    return true
  } catch (error) {
    console.error('数据库连接失败:', error.message)
    return false
  }
}

// 初始化数据库表
const initTables = async () => {
  try {
    const database = await getDatabase()

    // 创建文件夹表
    const createFoldersTable = `
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE RESTRICT
      )
    `

    await database.exec(createFoldersTable)

    // 创建文件夹表索引
    await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(sort_order)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name)')

    // 创建全景图表
    const createPanoramasTable = `
      CREATE TABLE IF NOT EXISTS panoramas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        file_size INTEGER,
        file_type TEXT,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `

    await database.exec(createPanoramasTable)

    // 创建全景图表索引
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_location ON panoramas(latitude, longitude)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_gcj02_location ON panoramas(gcj02_lat, gcj02_lng)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_folder_id ON panoramas(folder_id)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_is_visible ON panoramas(is_visible)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_created_at ON panoramas(created_at)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_title ON panoramas(title)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_sort_order ON panoramas(sort_order)')

    // 创建KML文件表
    const createKmlFilesTable = `
      CREATE TABLE IF NOT EXISTS kml_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `

    await database.exec(createKmlFilesTable)

    // 创建KML文件表索引
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_folder_id ON kml_files(folder_id)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_is_visible ON kml_files(is_visible)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_created_at ON kml_files(created_at)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_title ON kml_files(title)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_sort_order ON kml_files(sort_order)')

    // 创建KML点位表
    const createKmlPointsTable = `
      CREATE TABLE IF NOT EXISTS kml_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kml_file_id INTEGER NOT NULL,
        name TEXT,
        description TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        altitude REAL DEFAULT 0,
        point_type TEXT DEFAULT 'Point',
        coordinates TEXT,
        style_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kml_file_id) REFERENCES kml_files(id) ON DELETE CASCADE
      )
    `

    await database.exec(createKmlPointsTable)

    // 创建KML点位表索引
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_points_kml_file_id ON kml_points(kml_file_id)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_points_location ON kml_points(latitude, longitude)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_points_gcj02_location ON kml_points(gcj02_lat, gcj02_lng)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_points_point_type ON kml_points(point_type)')

    // 创建视频点位表
    const createVideoPointsTable = `
      CREATE TABLE IF NOT EXISTS video_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        file_size INTEGER,
        file_type TEXT,
        duration INTEGER,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `

    await database.exec(createVideoPointsTable)

    // 创建视频点位表索引
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_location ON video_points(latitude, longitude)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_gcj02_location ON video_points(gcj02_lat, gcj02_lng)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_folder_id ON video_points(folder_id)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_is_visible ON video_points(is_visible)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_created_at ON video_points(created_at)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_title ON video_points(title)')
    await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_sort_order ON video_points(sort_order)')

    // 初始化默认文件夹
    try {
      const { initDefaultFolder } = require('../init/default-folder')
      await initDefaultFolder()
    } catch (error) {
      console.warn('初始化默认文件夹失败:', error.message)
    }

  } catch (error) {
    console.error('数据库表初始化失败:', error.message)
    throw error
  }
}

// 执行查询
const query = async (sql, params = []) => {
  try {
    const database = await getDatabase()
    
    // 判断是否为SELECT查询
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return await database.all(sql, params)
    } else {
      const result = await database.run(sql, params)
      return result
    }
  } catch (error) {
    console.error('数据库查询错误:', error.message)
    throw error
  }
}

// 执行事务
const transaction = async (callback) => {
  const database = await getDatabase()

  try {
    await database.exec('BEGIN TRANSACTION')
    const result = await callback(database)
    await database.exec('COMMIT')
    return result
  } catch (error) {
    await database.exec('ROLLBACK')
    throw error
  }
}

// 关闭数据库连接
const closeDatabase = async () => {
  try {
    if (db) {
      await db.close()
      db = null
    }
  } catch (error) {
    console.error('关闭数据库连接失败:', error.message)
  }
}

module.exports = {
  getDatabase,
  query,
  transaction,
  testConnection,
  initTables,
  closeDatabase
}
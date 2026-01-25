const Logger = require('../../utils/logger');
const { getDatabase } = require('./connection');
const { runMigrations } = require('./migrations');

const createFoldersTable = async (database) => {
  const sql = `
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
    `;

  await database.exec(sql);
  await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)');
  await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(sort_order)');
  await database.exec('CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name)');
};

const createPanoramasTable = async (database) => {
  const sql = `
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
    `;

  await database.exec(sql);
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_panoramas_location ON panoramas(latitude, longitude)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_panoramas_gcj02_location ON panoramas(gcj02_lat, gcj02_lng)'
  );
  await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_folder_id ON panoramas(folder_id)');
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_panoramas_is_visible ON panoramas(is_visible)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_panoramas_created_at ON panoramas(created_at)'
  );
  await database.exec('CREATE INDEX IF NOT EXISTS idx_panoramas_title ON panoramas(title)');
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_panoramas_sort_order ON panoramas(sort_order)'
  );
};

const createKmlFilesTable = async (database) => {
  const sql = `
      CREATE TABLE IF NOT EXISTS kml_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        is_basemap INTEGER DEFAULT 0,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `;

  await database.exec(sql);
  await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_folder_id ON kml_files(folder_id)');
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_files_is_visible ON kml_files(is_visible)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_files_created_at ON kml_files(created_at)'
  );
  await database.exec('CREATE INDEX IF NOT EXISTS idx_kml_files_title ON kml_files(title)');
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_files_sort_order ON kml_files(sort_order)'
  );
};

const createKmlPointsTable = async (database) => {
  const sql = `
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
    `;

  await database.exec(sql);
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_points_kml_file_id ON kml_points(kml_file_id)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_points_location ON kml_points(latitude, longitude)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_points_gcj02_location ON kml_points(gcj02_lat, gcj02_lng)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_kml_points_point_type ON kml_points(point_type)'
  );
};

const createVideoPointsTable = async (database) => {
  const sql = `
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
    `;

  await database.exec(sql);
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_video_points_location ON video_points(latitude, longitude)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_video_points_gcj02_location ON video_points(gcj02_lat, gcj02_lng)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_video_points_folder_id ON video_points(folder_id)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_video_points_is_visible ON video_points(is_visible)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_video_points_created_at ON video_points(created_at)'
  );
  await database.exec('CREATE INDEX IF NOT EXISTS idx_video_points_title ON video_points(title)');
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_video_points_sort_order ON video_points(sort_order)'
  );
};

/**
 * 创建图片集表
 * image_sets: 图片集主表，存储图片集的基本信息和位置
 */
const createImageSetsTable = async (database) => {
  const sql = `
      CREATE TABLE IF NOT EXISTS image_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        cover_url TEXT,
        thumbnail_url TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gcj02_lat REAL,
        gcj02_lng REAL,
        image_count INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        folder_id INTEGER DEFAULT NULL,
        is_visible INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        owner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `;

  await database.exec(sql);
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_sets_location ON image_sets(latitude, longitude)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_sets_gcj02_location ON image_sets(gcj02_lat, gcj02_lng)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_sets_folder_id ON image_sets(folder_id)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_sets_is_visible ON image_sets(is_visible)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_sets_created_at ON image_sets(created_at)'
  );
  await database.exec('CREATE INDEX IF NOT EXISTS idx_image_sets_title ON image_sets(title)');
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_sets_sort_order ON image_sets(sort_order)'
  );
};

/**
 * 创建图片集图片表
 * image_set_images: 存储图片集中的每张图片
 */
const createImageSetImagesTable = async (database) => {
  const sql = `
      CREATE TABLE IF NOT EXISTS image_set_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_set_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        file_type TEXT,
        width INTEGER,
        height INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_set_id) REFERENCES image_sets(id) ON DELETE CASCADE
      )
    `;

  await database.exec(sql);
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_set_images_set_id ON image_set_images(image_set_id)'
  );
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_image_set_images_sort_order ON image_set_images(sort_order)'
  );
};

const createUsersTable = async (database) => {
  const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        salt TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

  await database.exec(sql);
  await database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');
};

const createSessionsTable = async (database) => {
  const sql = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        sid TEXT NOT NULL UNIQUE,
        userId INTEGER,
        expires_at DATETIME NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

  await database.exec(sql);
};

const createPasswordResetTable = async (database) => {
  const sql = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

  await database.exec(sql);
  await database.exec(
    'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)'
  );
};

const initTables = async () => {
  try {
    const database = await getDatabase();

    await createFoldersTable(database);
    await createPanoramasTable(database);
    await createKmlFilesTable(database);
    await createKmlPointsTable(database);
    await createVideoPointsTable(database);
    await createImageSetsTable(database);
    await createImageSetImagesTable(database);
    await createUsersTable(database);
    await createSessionsTable(database);

    try {
      await runMigrations(database);
    } catch (err) {
      Logger.warn('运行迁移失败:', err.message);
    }

    await createPasswordResetTable(database);

    try {
      const { initDefaultFolder } = require('../../init/init-default-folder');
      await initDefaultFolder();
    } catch (error) {
      Logger.warn('初始化默认文件夹失败:', error.message);
    }
  } catch (error) {
    Logger.error('数据库表初始化失败:', error.message);
    throw error;
  }
};

module.exports = {
  initTables,
};

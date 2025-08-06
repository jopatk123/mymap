-- 地图全景系统统一数据库脚本
-- 版本: 2.0.0
-- 创建时间: 2024-01-01

-- 创建数据库
CREATE DATABASE IF NOT EXISTS panorama_map 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE panorama_map;

-- 1. 创建文件夹表
CREATE TABLE IF NOT EXISTS folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '文件夹名称',
  parent_id INT DEFAULT NULL COMMENT '父文件夹ID',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
  INDEX idx_parent_id (parent_id),
  INDEX idx_name (name),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件夹表';

-- 2. 创建全景图表
CREATE TABLE IF NOT EXISTS panoramas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '全景图标题',
  description TEXT COMMENT '全景图描述',
  image_url VARCHAR(500) NOT NULL COMMENT '全景图URL',
  thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
  latitude DECIMAL(10, 8) NOT NULL COMMENT '纬度(WGS84)',
  longitude DECIMAL(11, 8) NOT NULL COMMENT '经度(WGS84)',
  gcj02_lat DECIMAL(10, 8) COMMENT '纬度(GCJ02)',
  gcj02_lng DECIMAL(11, 8) COMMENT '经度(GCJ02)',
  file_size BIGINT COMMENT '文件大小(字节)',
  file_type VARCHAR(100) COMMENT '文件类型',
  folder_id INT DEFAULT NULL COMMENT '所属文件夹ID',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
  INDEX idx_location (latitude, longitude),
  INDEX idx_gcj02_location (gcj02_lat, gcj02_lng),
  INDEX idx_folder_id (folder_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全景图表';

-- 3. 创建视频点位表
CREATE TABLE IF NOT EXISTS video_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '视频标题',
  description TEXT COMMENT '视频描述',
  video_url VARCHAR(500) NOT NULL COMMENT '视频文件URL',
  thumbnail_url VARCHAR(500) COMMENT '视频缩略图URL',
  latitude DECIMAL(10, 8) NOT NULL COMMENT '纬度(WGS84)',
  longitude DECIMAL(11, 8) NOT NULL COMMENT '经度(WGS84)',
  gcj02_lat DECIMAL(10, 8) COMMENT '纬度(GCJ02)',
  gcj02_lng DECIMAL(11, 8) COMMENT '经度(GCJ02)',
  file_size BIGINT COMMENT '文件大小(字节)',
  file_type VARCHAR(100) COMMENT '文件类型',
  duration INT COMMENT '视频时长(秒)',
  folder_id INT DEFAULT NULL COMMENT '所属文件夹ID',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
  INDEX idx_latitude (latitude),
  INDEX idx_longitude (longitude),
  INDEX idx_gcj02_lat (gcj02_lat),
  INDEX idx_gcj02_lng (gcj02_lng),
  INDEX idx_folder_id (folder_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频点位表';

-- 4. 创建KML文件表
CREATE TABLE IF NOT EXISTS kml_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT 'KML文件标题',
  description TEXT COMMENT 'KML文件描述',
  file_url VARCHAR(500) NOT NULL COMMENT 'KML文件URL',
  file_size BIGINT COMMENT '文件大小(字节)',
  folder_id INT DEFAULT NULL COMMENT '所属文件夹ID',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
  INDEX idx_folder_id (folder_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KML文件表';

-- 5. 创建KML点位表
CREATE TABLE IF NOT EXISTS kml_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kml_file_id INT NOT NULL COMMENT '所属KML文件ID',
  name VARCHAR(255) COMMENT '点位名称',
  description TEXT COMMENT '点位描述',
  latitude DECIMAL(10, 8) NOT NULL COMMENT '纬度(WGS84)',
  longitude DECIMAL(11, 8) NOT NULL COMMENT '经度(WGS84)',
  gcj02_lat DECIMAL(10, 8) COMMENT '纬度(GCJ02)',
  gcj02_lng DECIMAL(11, 8) COMMENT '经度(GCJ02)',
  altitude DECIMAL(10, 2) DEFAULT 0 COMMENT '海拔高度',
  point_type ENUM('Point', 'LineString', 'Polygon') DEFAULT 'Point' COMMENT '几何类型',
  coordinates TEXT COMMENT '完整坐标数据(JSON格式)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  FOREIGN KEY (kml_file_id) REFERENCES kml_files(id) ON DELETE CASCADE,
  INDEX idx_kml_file_id (kml_file_id),
  INDEX idx_latitude (latitude),
  INDEX idx_longitude (longitude),
  INDEX idx_gcj02_lat (gcj02_lat),
  INDEX idx_gcj02_lng (gcj02_lng),
  INDEX idx_point_type (point_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KML点位表';

-- 6. 插入默认文件夹
INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES
('默认文件夹', NULL, TRUE, 0),
('北京景点', NULL, TRUE, 1),
('历史建筑', 2, TRUE, 0),
('现代建筑', 2, TRUE, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 7. 插入示例全景图数据
INSERT INTO panoramas (title, description, image_url, thumbnail_url, latitude, longitude, gcj02_lat, gcj02_lng, file_size, file_type, folder_id) VALUES
('天安门广场', '北京天安门广场全景图', '/uploads/panoramas/sample1.jpg', '/uploads/thumbnails/sample1.jpg', 39.9042, 116.4074, 39.9042, 116.4074, 2048000, 'image/jpeg', 3),
('故宫太和殿', '北京故宫太和殿全景图', '/uploads/panoramas/sample2.jpg', '/uploads/thumbnails/sample2.jpg', 39.9163, 116.3972, 39.9163, 116.3972, 1856000, 'image/jpeg', 3),
('颐和园昆明湖', '北京颐和园昆明湖全景图', '/uploads/panoramas/sample3.jpg', '/uploads/thumbnails/sample3.jpg', 39.9999, 116.2755, 39.9999, 116.2755, 2304000, 'image/jpeg', 3),
('长城八达岭', '北京八达岭长城全景图', '/uploads/panoramas/sample4.jpg', '/uploads/thumbnails/sample4.jpg', 40.3584, 116.0138, 40.3584, 116.0138, 2560000, 'image/jpeg', 3),
('鸟巢体育场', '北京国家体育场(鸟巢)全景图', '/uploads/panoramas/sample5.jpg', '/uploads/thumbnails/sample5.jpg', 39.9928, 116.3975, 39.9928, 116.3975, 1792000, 'image/jpeg', 4)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- 8. 插入示例视频点位数据
INSERT INTO video_points (title, description, video_url, latitude, longitude, gcj02_lat, gcj02_lng, file_size, file_type, duration, folder_id) VALUES
('天安门广场视频', '北京天安门广场实时视频', '/uploads/videos/sample1.mp4', 39.9042, 116.4074, 39.9042, 116.4074, 10485760, 'video/mp4', 120, 3),
('故宫太和殿视频', '北京故宫太和殿介绍视频', '/uploads/videos/sample2.mp4', 39.9163, 116.3972, 39.9163, 116.3972, 8388608, 'video/mp4', 90, 3),
('颐和园昆明湖视频', '北京颐和园昆明湖风景视频', '/uploads/videos/sample3.mp4', 39.9999, 116.2755, 39.9999, 116.2755, 12582912, 'video/mp4', 150, 3)
ON DUPLICATE KEY UPDATE title = VALUES(title);

COMMIT;
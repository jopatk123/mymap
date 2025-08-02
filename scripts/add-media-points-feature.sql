-- 添加视频点位和KML文件功能的数据库脚本

USE panorama_map;

-- 创建视频点位表
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
  
  INDEX idx_latitude (latitude),
  INDEX idx_longitude (longitude),
  INDEX idx_gcj02_lat (gcj02_lat),
  INDEX idx_gcj02_lng (gcj02_lng),
  INDEX idx_folder_id (folder_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title),
  
  CONSTRAINT fk_video_points_folder 
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频点位表';

-- 创建KML文件表
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
  
  INDEX idx_folder_id (folder_id),
  INDEX idx_is_visible (is_visible),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title),
  
  CONSTRAINT fk_kml_files_folder 
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KML文件表';

-- 创建KML点位表（解析KML文件后的点位数据）
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
  style_data TEXT COMMENT '样式数据(JSON格式)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_kml_file_id (kml_file_id),
  INDEX idx_latitude (latitude),
  INDEX idx_longitude (longitude),
  INDEX idx_gcj02_lat (gcj02_lat),
  INDEX idx_gcj02_lng (gcj02_lng),
  INDEX idx_point_type (point_type),
  
  CONSTRAINT fk_kml_points_file 
  FOREIGN KEY (kml_file_id) REFERENCES kml_files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KML点位表';

-- 修改文件夹表的统计功能，添加视频和KML文件计数
-- 这里我们需要在应用层处理统计，因为涉及多个表

COMMIT;
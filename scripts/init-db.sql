-- 地图全景系统数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS panorama_map 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE panorama_map;

-- 创建全景图表
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
  file_size INT COMMENT '文件大小(字节)',
  file_type VARCHAR(50) COMMENT '文件类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX idx_location (latitude, longitude),
  INDEX idx_gcj02_location (gcj02_lat, gcj02_lng),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全景图表';

-- 插入示例数据
INSERT INTO panoramas (title, description, image_url, thumbnail_url, latitude, longitude, gcj02_lat, gcj02_lng, file_size, file_type) VALUES
('天安门广场', '北京天安门广场全景图', '/uploads/panoramas/sample1.jpg', '/uploads/thumbnails/sample1.jpg', 39.9042, 116.4074, 39.9042, 116.4074, 2048000, 'image/jpeg'),
('故宫太和殿', '北京故宫太和殿全景图', '/uploads/panoramas/sample2.jpg', '/uploads/thumbnails/sample2.jpg', 39.9163, 116.3972, 39.9163, 116.3972, 1856000, 'image/jpeg'),
('颐和园昆明湖', '北京颐和园昆明湖全景图', '/uploads/panoramas/sample3.jpg', '/uploads/thumbnails/sample3.jpg', 39.9999, 116.2755, 39.9999, 116.2755, 2304000, 'image/jpeg'),
('长城八达岭', '北京八达岭长城全景图', '/uploads/panoramas/sample4.jpg', '/uploads/thumbnails/sample4.jpg', 40.3584, 116.0138, 40.3584, 116.0138, 2560000, 'image/jpeg'),
('鸟巢体育场', '北京国家体育场(鸟巢)全景图', '/uploads/panoramas/sample5.jpg', '/uploads/thumbnails/sample5.jpg', 39.9928, 116.3975, 39.9928, 116.3975, 1792000, 'image/jpeg');

-- 创建用户表（预留，用于后续扩展）
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  role ENUM('admin', 'user') DEFAULT 'user' COMMENT '用户角色',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建全景图收藏表（预留，用于后续扩展）
CREATE TABLE IF NOT EXISTS panorama_favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  panorama_id INT NOT NULL COMMENT '全景图ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  
  UNIQUE KEY uk_user_panorama (user_id, panorama_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (panorama_id) REFERENCES panoramas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全景图收藏表';

-- 创建访问日志表（预留，用于后续扩展）
CREATE TABLE IF NOT EXISTS access_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  panorama_id INT COMMENT '全景图ID',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  referer VARCHAR(500) COMMENT '来源页面',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  
  INDEX idx_panorama_id (panorama_id),
  INDEX idx_ip_address (ip_address),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (panorama_id) REFERENCES panoramas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访问日志表';

COMMIT;
-- 添加视频点位表
USE panorama_map;

-- 创建视频点位表
CREATE TABLE IF NOT EXISTS video_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '视频标题',
  description TEXT COMMENT '视频描述',
  video_url VARCHAR(500) NOT NULL COMMENT '视频URL',
  thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
  latitude DECIMAL(10, 8) NOT NULL COMMENT '纬度(WGS84)',
  longitude DECIMAL(11, 8) NOT NULL COMMENT '经度(WGS84)',
  gcj02_lat DECIMAL(10, 8) COMMENT '纬度(GCJ02)',
  gcj02_lng DECIMAL(11, 8) COMMENT '经度(GCJ02)',
  file_size INT COMMENT '文件大小(字节)',
  file_type VARCHAR(50) COMMENT '文件类型',
  duration INT COMMENT '视频时长(秒)',
  folder_id INT COMMENT '文件夹ID',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX idx_location (latitude, longitude),
  INDEX idx_gcj02_location (gcj02_lat, gcj02_lng),
  INDEX idx_created_at (created_at),
  INDEX idx_title (title),
  INDEX idx_folder_id (folder_id),
  INDEX idx_visible (is_visible),
  
  -- 外键约束
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频点位表';

-- 插入示例视频点位数据
INSERT INTO video_points (title, description, video_url, latitude, longitude, gcj02_lat, gcj02_lng, file_size, file_type, duration) VALUES
('天安门广场视频', '北京天安门广场实时视频', '/uploads/videos/sample1.mp4', 39.9042, 116.4074, 39.9042, 116.4074, 10485760, 'video/mp4', 120),
('故宫太和殿视频', '北京故宫太和殿介绍视频', '/uploads/videos/sample2.mp4', 39.9163, 116.3972, 39.9163, 116.3972, 8388608, 'video/mp4', 90),
('颐和园昆明湖视频', '北京颐和园昆明湖风景视频', '/uploads/videos/sample3.mp4', 39.9999, 116.2755, 39.9999, 116.2755, 12582912, 'video/mp4', 150);

COMMIT;
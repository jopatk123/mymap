-- 添加点位样式配置功能的数据库脚本

USE panorama_map;

-- 创建视频点位样式配置表
CREATE TABLE IF NOT EXISTS video_point_styles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 点样式配置
  point_color VARCHAR(32) DEFAULT '#ff4757' COMMENT '点颜色',
  point_size INT DEFAULT 10 COMMENT '点大小',
  point_opacity DECIMAL(3,2) DEFAULT 1.0 COMMENT '点透明度',
  point_icon_type VARCHAR(50) DEFAULT 'marker' COMMENT '点图标类型',
  point_label_size INT DEFAULT 14 COMMENT '标签字体大小',
  point_label_color VARCHAR(32) DEFAULT '#000000' COMMENT '标签颜色',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频点位样式配置表';

-- 创建全景图点位样式配置表
CREATE TABLE IF NOT EXISTS panorama_point_styles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 点样式配置
  point_color VARCHAR(32) DEFAULT '#2ed573' COMMENT '点颜色',
  point_size INT DEFAULT 8 COMMENT '点大小',
  point_opacity DECIMAL(3,2) DEFAULT 1.0 COMMENT '点透明度',
  point_icon_type VARCHAR(50) DEFAULT 'circle' COMMENT '点图标类型',
  point_label_size INT DEFAULT 12 COMMENT '标签字体大小',
  point_label_color VARCHAR(32) DEFAULT '#000000' COMMENT '标签颜色',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全景图点位样式配置表';

-- 插入默认视频点位样式配置
INSERT INTO video_point_styles (id) VALUES (1) 
ON DUPLICATE KEY UPDATE id = id;

-- 插入默认全景图点位样式配置
INSERT INTO panorama_point_styles (id) VALUES (1) 
ON DUPLICATE KEY UPDATE id = id;

COMMIT;
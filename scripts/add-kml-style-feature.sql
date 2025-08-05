-- 添加KML样式配置功能的数据库脚本

USE panorama_map;

-- 创建KML文件样式配置表
CREATE TABLE IF NOT EXISTS kml_file_styles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kml_file_id INT NOT NULL COMMENT 'KML文件ID',
  
  -- 点样式配置
    point_color VARCHAR(32) DEFAULT '#ff7800' COMMENT '点颜色',
    point_size INT DEFAULT 8 COMMENT '点大小',
    point_opacity DECIMAL(3,2) DEFAULT 1.0 COMMENT '点透明度',
    point_icon_type VARCHAR(50) DEFAULT 'circle' COMMENT '点图标类型',
    point_label_size INT DEFAULT 12 COMMENT '标签字体大小',
    point_label_color VARCHAR(32) DEFAULT '#000000' COMMENT '标签颜色',
    
    -- 线样式配置
    line_color VARCHAR(32) DEFAULT '#ff7800' COMMENT '线颜色',
    line_width INT DEFAULT 2 COMMENT '线宽度',
    line_opacity DECIMAL(3,2) DEFAULT 0.8 COMMENT '线透明度',
    line_style ENUM('solid', 'dashed', 'dotted', 'dash-dot') DEFAULT 'solid' COMMENT '线样式',
    
    -- 面样式配置
    polygon_fill_color VARCHAR(32) DEFAULT '#ff7800' COMMENT '面填充颜色',
    polygon_fill_opacity DECIMAL(3,2) DEFAULT 0.3 COMMENT '面填充透明度',
    polygon_stroke_color VARCHAR(32) DEFAULT '#ff7800' COMMENT '面边框颜色',
    polygon_stroke_width INT DEFAULT 2 COMMENT '面边框宽度',
    polygon_stroke_style ENUM('solid', 'dashed', 'dotted') DEFAULT 'solid' COMMENT '面边框样式',
    
    -- 聚合配置
    cluster_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用聚合',
    cluster_radius INT DEFAULT 50 COMMENT '聚合半径(像素)',
    cluster_min_points INT DEFAULT 2 COMMENT '最小聚合点数',
    cluster_max_zoom INT DEFAULT 16 COMMENT '最大聚合缩放级别',
    cluster_icon_color VARCHAR(32) DEFAULT '#409EFF' COMMENT '聚合图标颜色',
    cluster_text_color VARCHAR(32) DEFAULT '#FFFFFF' COMMENT '聚合文字颜色',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 外键约束
  FOREIGN KEY (kml_file_id) REFERENCES kml_files(id) ON DELETE CASCADE,
  
  -- 唯一约束
  UNIQUE KEY uk_kml_file_style (kml_file_id),
  
  -- 索引
  INDEX idx_kml_file_id (kml_file_id),
  INDEX idx_cluster_enabled (cluster_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KML文件样式配置表';

-- 创建全景图聚合全局配置表
CREATE TABLE IF NOT EXISTS panorama_cluster_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cluster_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用全景图聚合',
  cluster_radius INT DEFAULT 50 COMMENT '聚合半径',
  cluster_min_points INT DEFAULT 2 COMMENT '最小聚合点数',
  cluster_max_zoom INT DEFAULT 16 COMMENT '最大聚合缩放级别',
  cluster_icon_color VARCHAR(7) DEFAULT '#67C23A' COMMENT '聚合图标颜色',
  cluster_text_color VARCHAR(7) DEFAULT '#FFFFFF' COMMENT '聚合文字颜色',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全景图聚合配置表';

-- 插入默认全景图聚合配置
INSERT INTO panorama_cluster_config (id) VALUES (1) 
ON DUPLICATE KEY UPDATE id = id;

COMMIT;
-- 添加文件夹功能的数据库脚本

USE panorama_map;

-- 创建文件夹表
CREATE TABLE IF NOT EXISTS folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '文件夹名称',
  parent_id INT DEFAULT NULL COMMENT '父文件夹ID',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 外键约束
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
  
  -- 索引
  INDEX idx_parent_id (parent_id),
  INDEX idx_name (name),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件夹表';

-- 修改全景图表，添加文件夹关联和可见性字段
ALTER TABLE panoramas 
ADD COLUMN folder_id INT DEFAULT NULL COMMENT '所属文件夹ID',
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
ADD COLUMN sort_order INT DEFAULT 0 COMMENT '排序顺序';

-- 添加外键约束
ALTER TABLE panoramas 
ADD CONSTRAINT fk_panoramas_folder 
FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;

-- 添加索引
ALTER TABLE panoramas 
ADD INDEX idx_folder_id (folder_id),
ADD INDEX idx_is_visible (is_visible),
ADD INDEX idx_sort_order (sort_order);

-- 插入默认文件夹
INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES
('默认文件夹', NULL, TRUE, 0),
('北京景点', NULL, TRUE, 1),
('历史建筑', 2, TRUE, 0),
('现代建筑', 2, TRUE, 1);

-- 将现有全景图分配到相应文件夹
UPDATE panoramas SET folder_id = 3 WHERE title IN ('天安门广场', '故宫太和殿', '颐和园昆明湖', '长城八达岭');
UPDATE panoramas SET folder_id = 4 WHERE title = '鸟巢体育场';

COMMIT;
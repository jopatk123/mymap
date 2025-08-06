-- 更新KML样式配置的默认图标类型为地图标记
-- 执行时间：2024年

USE panorama_map;

-- 修改表结构，将默认值改为 'marker'
ALTER TABLE kml_file_styles 
MODIFY COLUMN point_icon_type VARCHAR(50) DEFAULT 'marker' COMMENT '点图标类型';

-- 更新现有记录中为 'circle' 的记录为 'marker'（可选，如果想要更新现有数据）
-- UPDATE kml_file_styles 
-- SET point_icon_type = 'marker' 
-- WHERE point_icon_type = 'circle';

-- 验证更新结果
SELECT 
  COUNT(*) as total_records,
  point_icon_type,
  COUNT(*) as count_by_type
FROM kml_file_styles 
GROUP BY point_icon_type;

-- 显示表结构确认默认值已更新
SHOW CREATE TABLE kml_file_styles;
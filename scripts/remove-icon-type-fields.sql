-- 删除点位图标形状字段的数据库脚本
-- 执行前请备份数据库

USE panorama_map;

-- 删除 kml_file_styles 表中的 point_icon_type 字段
ALTER TABLE kml_file_styles DROP COLUMN point_icon_type;

-- 删除 panorama_point_styles 表中的 point_icon_type 字段
ALTER TABLE panorama_point_styles DROP COLUMN point_icon_type;

-- 删除 video_point_styles 表中的 point_icon_type 字段
ALTER TABLE video_point_styles DROP COLUMN point_icon_type;

-- 验证表结构
DESCRIBE kml_file_styles;
DESCRIBE panorama_point_styles;
DESCRIBE video_point_styles;

-- 显示修改结果
SELECT 'kml_file_styles 表结构已更新' as message;
SELECT 'panorama_point_styles 表结构已更新' as message;
SELECT 'video_point_styles 表结构已更新' as message;
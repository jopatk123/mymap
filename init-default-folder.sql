-- 创建默认文件夹
INSERT INTO folders (name, parent_id, is_visible, sort_order) 
SELECT '默认文件夹', NULL, TRUE, 0
WHERE NOT EXISTS (
    SELECT 1 FROM folders WHERE name = '默认文件夹'
);

-- 获取默认文件夹ID
SELECT id INTO @default_folder_id FROM folders WHERE name = '默认文件夹' LIMIT 1;

-- 更新所有未分类（folder_id IS NULL）的全景图到默认文件夹
UPDATE panoramas 
SET folder_id = (SELECT id FROM folders WHERE name = '默认文件夹' LIMIT 1)
WHERE folder_id IS NULL;

-- 验证结果
SELECT 
    f.name as folder_name,
    f.id as folder_id,
    COUNT(p.id) as panorama_count
FROM folders f
LEFT JOIN panoramas p ON f.id = p.folder_id
WHERE f.name = '默认文件夹'
GROUP BY f.id, f.name;
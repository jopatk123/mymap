const { query } = require('./server/src/config/database');
const FolderModel = require('./server/src/models/folder.model');

/**
 * 检查并初始化默认文件夹
 */
async function initDefaultFolder() {
  try {
    console.log('📁 检查默认文件夹...');
    
    // 检查是否存在名为"默认文件夹"的记录
    const existingFolder = await query(
      'SELECT id, name FROM folders WHERE name = ? LIMIT 1',
      ['默认文件夹']
    );
    
    let defaultFolderId;
    
    if (existingFolder && existingFolder.length > 0) {
      defaultFolderId = existingFolder[0].id;
      console.log(`✅ 默认文件夹已存在，ID: ${defaultFolderId}`);
    } else {
      console.log('🆕 创建默认文件夹...');
      const newFolder = await FolderModel.create({
        name: '默认文件夹',
        parentId: null,
        isVisible: true,
        sortOrder: 0
      });
      defaultFolderId = newFolder.id;
      console.log(`✅ 创建默认文件夹成功，ID: ${defaultFolderId}`);
    }
    
    // 检查有多少全景图在默认文件夹
    const countSql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id = ?';
    const [{ count }] = await query(countSql, [defaultFolderId]);
    console.log(`📊 默认文件夹中的全景图数量: ${count}`);
    
    // 检查有多少全景图未分类（folder_id IS NULL）
    const nullCountSql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id IS NULL';
    const [{ count: nullCount }] = await query(nullCountSql);
    console.log(`📊 未分类全景图数量: ${nullCount}`);
    
    // 更新未分类的全景图到默认文件夹
    if (nullCount > 0) {
      console.log('🔄 将未分类全景图移动到默认文件夹...');
      await query(
        'UPDATE panoramas SET folder_id = ? WHERE folder_id IS NULL',
        [defaultFolderId]
      );
      console.log('✅ 移动完成');
    }
    
    console.log('🎉 默认文件夹初始化完成！');
    return defaultFolderId;
    
  } catch (error) {
    console.error('❌ 初始化默认文件夹失败:', error.message);
    throw error;
  }
}

// 执行检查
initDefaultFolder()
  .then((folderId) => {
    console.log(`默认文件夹ID: ${folderId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  });
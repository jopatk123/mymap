const { query } = require('../config/database')

/**
 * 初始化默认文件夹
 * 确保数据库中存在名为"默认文件夹"的文件夹
 */
async function initDefaultFolder() {
  try {
    console.log('📁 初始化默认文件夹...')
    
    // 检查是否已存在名为"默认文件夹"的文件夹
    const existingFolder = await query(
      'SELECT id, name FROM folders WHERE name = ? LIMIT 1',
      ['默认文件夹']
    )
    
    if (existingFolder && existingFolder.length > 0) {
      console.log(`✅ 默认文件夹已存在，ID: ${existingFolder[0].id}`)
      return existingFolder[0].id
    }

    // 创建默认文件夹
    const result = await query(
      'INSERT INTO folders (name, parent_id, is_visible, sort_order) VALUES (?, ?, ?, ?)',
      ['默认文件夹', null, true, 0]
    )

    console.log(`✅ 创建默认文件夹成功，ID: ${result.insertId}`)
    return result.insertId
  } catch (error) {
    console.error('❌ 初始化默认文件夹失败:', error.message)
    throw error
  }
}

module.exports = { initDefaultFolder }
const { query } = require('../config/database')

class FolderModel {
  // 获取所有文件夹（树形结构）
  static async findAll() {
    const sql = `
      SELECT id, name, parent_id, is_visible, sort_order, created_at, updated_at
      FROM folders 
      ORDER BY parent_id ASC, sort_order ASC, name ASC
    `
    const rows = await query(sql)
    return this.buildTree(rows)
  }

  // 获取文件夹列表（平铺结构）
  static async findAllFlat() {
    const sql = `
      SELECT id, name, parent_id, is_visible, sort_order, created_at, updated_at
      FROM folders 
      ORDER BY parent_id ASC, sort_order ASC, name ASC
    `
    return await query(sql)
  }

  // 根据ID获取文件夹
  static async findById(id) {
    const sql = 'SELECT * FROM folders WHERE id = ?'
    const rows = await query(sql, [id])
    return rows[0] || null
  }

  // 获取子文件夹
  static async findChildren(parentId) {
    const sql = `
      SELECT * FROM folders 
      WHERE parent_id = ? 
      ORDER BY sort_order ASC, name ASC
    `
    return await query(sql, [parentId])
  }

  // 创建文件夹
  static async create(folderData) {
    const { name, parentId = null, isVisible = true, sortOrder = 0 } = folderData
    
    const sql = `
      INSERT INTO folders (name, parent_id, is_visible, sort_order)
      VALUES (?, ?, ?, ?)
    `
    
    const result = await query(sql, [name, parentId, isVisible, sortOrder])
    return await this.findById(result.insertId)
  }

  // 更新文件夹
  static async update(id, folderData) {
    const { name, parentId, isVisible, sortOrder } = folderData
    
    const sql = `
      UPDATE folders SET
        name = ?,
        parent_id = ?,
        is_visible = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    
    await query(sql, [name, parentId, isVisible, sortOrder, id])
    return await this.findById(id)
  }

  // 删除文件夹
  static async delete(id) {
    // 检查是否有子文件夹
    const children = await this.findChildren(id)
    if (children.length > 0) {
      throw new Error('无法删除包含子文件夹的文件夹')
    }

    // 检查是否有全景图
    const panoramaCountSql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id = ?'
    const [{ count }] = await query(panoramaCountSql, [id])
    if (count > 0) {
      throw new Error('无法删除包含全景图的文件夹')
    }

    const sql = 'DELETE FROM folders WHERE id = ?'
    const result = await query(sql, [id])
    return result.affectedRows > 0
  }

  // 移动文件夹
  static async move(id, newParentId) {
    // 检查是否会形成循环引用
    if (await this.wouldCreateCycle(id, newParentId)) {
      throw new Error('无法移动文件夹：会形成循环引用')
    }

    const sql = 'UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    await query(sql, [newParentId, id])
    return await this.findById(id)
  }

  // 更新可见性
  static async updateVisibility(id, isVisible) {
    const sql = 'UPDATE folders SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    await query(sql, [isVisible, id])
    return await this.findById(id)
  }

  // 获取文件夹中的全景图数量
  static async getPanoramaCount(folderId) {
    const sql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id = ?'
    const [{ count }] = await query(sql, [folderId])
    return count
  }

  // 构建树形结构
  static buildTree(folders, parentId = null) {
    const tree = []
    
    for (const folder of folders) {
      if (folder.parent_id === parentId) {
        const children = this.buildTree(folders, folder.id)
        if (children.length > 0) {
          folder.children = children
        }
        tree.push(folder)
      }
    }
    
    return tree
  }

  // 检查是否会形成循环引用
  static async wouldCreateCycle(folderId, newParentId) {
    if (!newParentId) return false
    if (folderId === newParentId) return true

    let currentParentId = newParentId
    while (currentParentId) {
      if (currentParentId === folderId) return true
      
      const parent = await this.findById(currentParentId)
      currentParentId = parent ? parent.parent_id : null
    }
    
    return false
  }

  // 获取文件夹路径
  static async getPath(folderId) {
    const path = []
    let currentId = folderId

    while (currentId) {
      const folder = await this.findById(currentId)
      if (!folder) break
      
      path.unshift(folder)
      currentId = folder.parent_id
    }

    return path
  }
}

module.exports = FolderModel
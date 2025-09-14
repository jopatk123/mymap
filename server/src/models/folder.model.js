const SQLiteAdapter = require('../utils/sqlite-adapter');

class FolderModel {
  // 获取所有文件夹（树形结构）
  static async findAll() {
    const sql = `
      SELECT id, name, parent_id, is_visible, sort_order, created_at, updated_at
      FROM folders 
      ORDER BY parent_id ASC, sort_order ASC, name ASC
    `;
    const rows = await SQLiteAdapter.all(sql);
    return this.buildTree(rows);
  }

  // 获取文件夹列表（平铺结构）
  static async findAllFlat() {
    const sql = `
      SELECT id, name, parent_id, is_visible, sort_order, created_at, updated_at
      FROM folders 
      ORDER BY parent_id ASC, sort_order ASC, name ASC
    `;
    return await SQLiteAdapter.all(sql);
  }

  // 根据ID获取文件夹
  static async findById(id) {
    const sql = 'SELECT * FROM folders WHERE id = ?';
    const rows = await SQLiteAdapter.all(sql, [id]);
    return rows[0] || null;
  }

  // 获取子文件夹
  static async findChildren(parentId) {
    const sql = `
      SELECT * FROM folders 
      WHERE parent_id = ? 
      ORDER BY sort_order ASC, name ASC
    `;
    return await SQLiteAdapter.all(sql, [parentId]);
  }

  // 创建文件夹
  static async create(folderData) {
    const { name, parentId = null, isVisible = true, sortOrder = 0 } = folderData;

    const sql = `
      INSERT INTO folders (name, parent_id, is_visible, sort_order)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await SQLiteAdapter.execute(sql, [name, parentId, isVisible, sortOrder]);
    return await this.findById(result.insertId);
  }

  // 更新文件夹
  static async update(id, folderData) {
    const { name, parentId, isVisible, sortOrder } = folderData;

    const sql = `
      UPDATE folders SET
        name = ?,
        parent_id = ?,
        is_visible = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await SQLiteAdapter.execute(sql, [name, parentId, isVisible, sortOrder, id]);
    return await this.findById(id);
  }

  // 删除文件夹
  static async delete(id) {
    // 检查是否有子文件夹
    const children = await this.findChildren(id);
    if (children.length > 0) {
      throw new Error('无法删除包含子文件夹的文件夹');
    }

    // 检查是否有全景图
    const panoramaCount = await this.getPanoramaCount(id);
    if (panoramaCount > 0) {
      throw new Error('无法删除包含全景图的文件夹');
    }

    // 检查是否有视频点位
    const videoPointCount = await this.getVideoPointCount(id);
    if (videoPointCount > 0) {
      throw new Error('无法删除包含视频点位的文件夹');
    }

    // 检查是否有KML文件
    const kmlFileCount = await this.getKmlFileCount(id);
    if (kmlFileCount > 0) {
      throw new Error('无法删除包含KML文件的文件夹');
    }

    const sql = 'DELETE FROM folders WHERE id = ?';
    const [result] = await SQLiteAdapter.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // 移动文件夹
  static async move(id, newParentId) {
    // 检查是否会形成循环引用
    if (await this.wouldCreateCycle(id, newParentId)) {
      throw new Error('无法移动文件夹：会形成循环引用');
    }

    const sql = 'UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await SQLiteAdapter.execute(sql, [newParentId, id]);
    return await this.findById(id);
  }

  // 更新可见性
  static async updateVisibility(id, isVisible) {
    const sql = 'UPDATE folders SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await SQLiteAdapter.execute(sql, [isVisible, id]);
    return await this.findById(id);
  }

  // 获取文件夹中的全景图数量
  static async getPanoramaCount(folderId) {
    if (folderId === 0 || folderId === '0') {
      const sql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id IS NULL';
      const [{ count }] = await SQLiteAdapter.all(sql, []);
      return count;
    } else {
      const sql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id = ?';
      const [{ count }] = await SQLiteAdapter.all(sql, [folderId]);
      return count;
    }
  }

  // 获取文件夹中的视频点位数量
  static async getVideoPointCount(folderId) {
    if (folderId === 0 || folderId === '0') {
      const sql = 'SELECT COUNT(*) as count FROM video_points WHERE folder_id IS NULL';
      const [{ count }] = await SQLiteAdapter.all(sql, []);
      return count;
    } else {
      const sql = 'SELECT COUNT(*) as count FROM video_points WHERE folder_id = ?';
      const [{ count }] = await SQLiteAdapter.all(sql, [folderId]);
      return count;
    }
  }

  // 获取文件夹中的KML文件数量
  static async getKmlFileCount(folderId) {
    if (folderId === 0 || folderId === '0') {
      const sql = 'SELECT COUNT(*) as count FROM kml_files WHERE folder_id IS NULL';
      const [{ count }] = await SQLiteAdapter.all(sql, []);
      return count;
    } else {
      const sql = 'SELECT COUNT(*) as count FROM kml_files WHERE folder_id = ?';
      const [{ count }] = await SQLiteAdapter.all(sql, [folderId]);
      return count;
    }
  }

  // 获取文件夹中的总内容数量（全景图 + 视频点位 + KML文件）
  static async getTotalContentCount(folderId) {
    const panoramaCount = await this.getPanoramaCount(folderId);
    const videoPointCount = await this.getVideoPointCount(folderId);
    const kmlFileCount = await this.getKmlFileCount(folderId);
    return panoramaCount + videoPointCount + kmlFileCount;
  }

  // 构建树形结构
  static buildTree(folders, parentId = null) {
    const tree = [];

    for (const folder of folders) {
      if (folder.parent_id === parentId) {
        const children = this.buildTree(folders, folder.id);
        if (children.length > 0) {
          folder.children = children;
        }
        tree.push(folder);
      }
    }

    return tree;
  }

  // 检查是否会形成循环引用
  static async wouldCreateCycle(folderId, newParentId) {
    if (!newParentId) return false;
    if (folderId === newParentId) return true;

    let currentParentId = newParentId;
    while (currentParentId) {
      if (currentParentId === folderId) return true;

      const parent = await this.findById(currentParentId);
      currentParentId = parent ? parent.parent_id : null;
    }

    return false;
  }

  // 获取文件夹路径
  static async getPath(folderId) {
    const path = [];
    let currentId = folderId;

    while (currentId) {
      const folder = await this.findById(currentId);
      if (!folder) break;

      path.unshift(folder);
      currentId = folder.parent_id;
    }

    return path;
  }

  // 获取所有可见的文件夹ID（递归检查父文件夹）
  static async getVisibleFolderIds() {
    const allFolders = await this.findAllFlat();
    const visibleFolderIds = new Set();

    // 检查文件夹是否可见（包括其所有父文件夹）
    const isFolderVisible = (folderId, folderMap) => {
      if (!folderId) return true; // 根目录始终可见

      const folder = folderMap.get(folderId);
      if (!folder) return false;

      // 如果当前文件夹不可见，则不可见
      if (!folder.is_visible) return false;

      // 递归检查父文件夹
      return isFolderVisible(folder.parent_id, folderMap);
    };

    // 创建文件夹映射
    const folderMap = new Map();
    allFolders.forEach((folder) => {
      folderMap.set(folder.id, folder);
    });

    // 检查每个文件夹的可见性
    allFolders.forEach((folder) => {
      if (isFolderVisible(folder.id, folderMap)) {
        visibleFolderIds.add(folder.id);
      }
    });

    return Array.from(visibleFolderIds);
  }

  // 检查文件夹是否可见（包括其所有父文件夹）
  static async isFolderVisible(folderId) {
    if (!folderId) return true; // 根目录始终可见

    const folder = await this.findById(folderId);
    if (!folder) return false;

    // 如果当前文件夹不可见，则不可见
    if (!folder.is_visible) return false;

    // 递归检查父文件夹
    return await this.isFolderVisible(folder.parent_id);
  }
}

module.exports = FolderModel;

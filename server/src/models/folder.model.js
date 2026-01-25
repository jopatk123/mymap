const SQLiteAdapter = require('../utils/sqlite-adapter');

class FolderModel {
  // 获取所有文件夹（树形结构）
  static async findAll(ownerId = null) {
    let sql = `
      SELECT id, name, parent_id, is_visible, sort_order, owner_id, created_at, updated_at
      FROM folders 
    `;
    const params = [];
    if (ownerId) {
      sql += ' WHERE owner_id = ? ';
      params.push(ownerId);
    }
    sql += ' ORDER BY parent_id ASC, sort_order ASC, name ASC';
    const rows = await SQLiteAdapter.all(sql, params);
    return this.buildTree(rows);
  }

  // 获取文件夹列表（平铺结构）
  static async findAllFlat(ownerId = null) {
    let sql = `
      SELECT id, name, parent_id, is_visible, sort_order, owner_id, created_at, updated_at
      FROM folders 
    `;
    const params = [];
    if (ownerId) {
      sql += ' WHERE owner_id = ? ';
      params.push(ownerId);
    }
    sql += ' ORDER BY parent_id ASC, sort_order ASC, name ASC';
    return await SQLiteAdapter.all(sql, params);
  }

  // 根据ID获取文件夹
  static async findById(id, ownerId = null) {
    let sql = 'SELECT * FROM folders WHERE id = ?';
    const params = [id];
    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }
    const rows = await SQLiteAdapter.all(sql, params);
    return rows[0] || null;
  }

  // 获取子文件夹
  static async findChildren(parentId, ownerId = null) {
    let sql = `
      SELECT * FROM folders 
      WHERE parent_id = ? 
    `;
    const params = [parentId];
    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }
    sql += ' ORDER BY sort_order ASC, name ASC';
    return await SQLiteAdapter.all(sql, params);
  }

  // 创建文件夹
  static async create(folderData) {
    const { name, parentId = null, isVisible = true, sortOrder = 0, ownerId = null } = folderData;

    // 安全检查：如果指定了父文件夹，且有 ownerId，必须确保父文件夹也属于该 owner
    if (parentId && ownerId) {
      const parent = await this.findById(parentId, ownerId);
      if (!parent) {
        throw new Error('父文件夹不存在或无权访问');
      }
    }

    const sql = `
      INSERT INTO folders (name, parent_id, is_visible, sort_order, owner_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await SQLiteAdapter.execute(sql, [name, parentId, isVisible, sortOrder, ownerId]);
    return await this.findById(result.insertId);
  }

  // 更新文件夹
  static async update(id, folderData, ownerId = null) {
    const { name, parentId, isVisible, sortOrder } = folderData;

    // 先检查权限
    if (ownerId) {
      const folder = await this.findById(id, ownerId);
      if (!folder) {
        throw new Error('文件夹不存在或无权操作');
      }
      
      // 如果尝试更改父文件夹，检查目标父文件夹权限
      if (parentId && parentId !== folder.parentId) {
        const parent = await this.findById(parentId, ownerId);
        if (!parent) {
          throw new Error('父文件夹不存在或无权访问');
        }
      }
    }

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
  static async delete(id, ownerId = null) {
    // 先检查权限
    if (ownerId) {
      const folder = await this.findById(id, ownerId);
      if (!folder) {
        throw new Error('文件夹不存在或无权操作');
      }
    }

    // 检查是否有子文件夹
    const children = await this.findChildren(id);
    if (children.length > 0) {
      throw new Error('无法删除包含子文件夹的文件夹');
    }

    // 检查是否有全景图
    const panoramaCount = await this.getPanoramaCount(id, ownerId);
    if (panoramaCount > 0) {
      throw new Error('无法删除包含全景图的文件夹');
    }

    // 检查是否有视频点位
    const videoPointCount = await this.getVideoPointCount(id, ownerId);
    if (videoPointCount > 0) {
      throw new Error('无法删除包含视频点位的文件夹');
    }

    // 检查是否有KML文件
    const kmlFileCount = await this.getKmlFileCount(id, ownerId);
    if (kmlFileCount > 0) {
      throw new Error('无法删除包含KML文件的文件夹');
    }

    const sql = 'DELETE FROM folders WHERE id = ?';
    const [result] = await SQLiteAdapter.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // 移动文件夹
  static async move(id, newParentId, ownerId = null) {
    // 先检查权限
    if (ownerId) {
      const folder = await this.findById(id, ownerId);
      if (!folder) {
        throw new Error('文件夹不存在或无权操作');
      }

      // 检查目标父文件夹权限
      if (newParentId) {
        const parent = await this.findById(newParentId, ownerId);
        if (!parent) {
          throw new Error('目标父文件夹不存在或无权访问');
        }
      }
    }

    // 检查是否会形成循环引用
    if (await this.wouldCreateCycle(id, newParentId)) {
      throw new Error('无法移动文件夹：会形成循环引用');
    }

    const sql = 'UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await SQLiteAdapter.execute(sql, [newParentId, id]);
    return await this.findById(id);
  }

  // 更新可见性
  static async updateVisibility(id, isVisible, ownerId = null) {
    // 先检查权限
    if (ownerId) {
      const folder = await this.findById(id, ownerId);
      if (!folder) {
        throw new Error('文件夹不存在或无权操作');
      }
    }

    const sql = 'UPDATE folders SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await SQLiteAdapter.execute(sql, [isVisible, id]);
    return await this.findById(id);
  }

  // 获取文件夹中的全景图数量
  static async getPanoramaCount(folderId, ownerId = null) {
    let sql, params;
    if (folderId === 0 || folderId === '0') {
      sql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id IS NULL';
      params = [];
    } else {
      sql = 'SELECT COUNT(*) as count FROM panoramas WHERE folder_id = ?';
      params = [folderId];
    }
    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }
    const [{ count }] = await SQLiteAdapter.all(sql, params);
    return count;
  }

  // 获取文件夹中的视频点位数量
  static async getVideoPointCount(folderId, ownerId = null) {
    let sql, params;
    if (folderId === 0 || folderId === '0') {
      sql = 'SELECT COUNT(*) as count FROM video_points WHERE folder_id IS NULL';
      params = [];
    } else {
      sql = 'SELECT COUNT(*) as count FROM video_points WHERE folder_id = ?';
      params = [folderId];
    }
    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }
    const [{ count }] = await SQLiteAdapter.all(sql, params);
    return count;
  }

  // 获取文件夹中的KML文件数量
  static async getKmlFileCount(folderId, ownerId = null) {
    let sql, params;
    if (folderId === 0 || folderId === '0') {
      sql = 'SELECT COUNT(*) as count FROM kml_files WHERE folder_id IS NULL';
      params = [];
    } else {
      sql = 'SELECT COUNT(*) as count FROM kml_files WHERE folder_id = ?';
      params = [folderId];
    }
    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }
    const [{ count }] = await SQLiteAdapter.all(sql, params);
    return count;
  }

  // 获取文件夹中的图片集数量
  static async getImageSetCount(folderId, ownerId = null) {
    let sql, params;
    if (folderId === 0 || folderId === '0') {
      sql = 'SELECT COUNT(*) as count FROM image_sets WHERE folder_id IS NULL';
      params = [];
    } else {
      sql = 'SELECT COUNT(*) as count FROM image_sets WHERE folder_id = ?';
      params = [folderId];
    }
    if (ownerId) {
      sql += ' AND owner_id = ?';
      params.push(ownerId);
    }
    const [{ count }] = await SQLiteAdapter.all(sql, params);
    return count;
  }

  // 获取文件夹中的总内容数量（全景图 + 视频点位 + KML文件 + 图片集 + 图片集）
  static async getTotalContentCount(folderId, ownerId = null) {
    const panoramaCount = await this.getPanoramaCount(folderId, ownerId);
    const videoPointCount = await this.getVideoPointCount(folderId, ownerId);
    const kmlFileCount = await this.getKmlFileCount(folderId, ownerId);
    const imageSetCount = await this.getImageSetCount(folderId, ownerId);
    return panoramaCount + videoPointCount + kmlFileCount + imageSetCount;
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
  static async getVisibleFolderIds(ownerId = null) {
    const allFolders = await this.findAllFlat(ownerId);
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

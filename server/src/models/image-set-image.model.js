const SQLiteAdapter = require('../utils/sqlite-adapter');
const Logger = require('../utils/logger');

class ImageSetImageModel {
  /**
   * 添加图片到图片集
   */
  static async create({
    imageSetId,
    imageUrl,
    thumbnailUrl,
    fileName,
    fileSize,
    fileType,
    width,
    height,
    sortOrder = 0,
  }) {
    try {
      const [result] = await SQLiteAdapter.execute(
        `INSERT INTO image_set_images (
          image_set_id, image_url, thumbnail_url,
          file_name, file_size, file_type,
          width, height, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          imageSetId,
          imageUrl,
          thumbnailUrl,
          fileName,
          fileSize,
          fileType,
          width,
          height,
          sortOrder,
        ]
      );
      return await this.findById(result.insertId);
    } catch (error) {
      Logger.error('添加图片到图片集失败:', error);
      throw error;
    }
  }

  /**
   * 批量添加图片到图片集
   */
  static async batchCreate(imageSetId, images) {
    try {
      const results = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const result = await this.create({
          imageSetId,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          fileName: img.fileName,
          fileSize: img.fileSize,
          fileType: img.fileType,
          width: img.width,
          height: img.height,
          sortOrder: img.sortOrder ?? i,
        });
        results.push(result);
      }
      return results;
    } catch (error) {
      Logger.error('批量添加图片失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找图片
   */
  static async findById(id) {
    try {
      const [rows] = await SQLiteAdapter.execute(
        'SELECT * FROM image_set_images WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      Logger.error('查找图片失败:', error);
      throw error;
    }
  }

  /**
   * 获取图片集的所有图片
   */
  static async findByImageSetId(imageSetId) {
    try {
      const [rows] = await SQLiteAdapter.execute(
        'SELECT * FROM image_set_images WHERE image_set_id = ? ORDER BY sort_order ASC, id ASC',
        [imageSetId]
      );
      return rows;
    } catch (error) {
      Logger.error('获取图片集图片失败:', error);
      throw error;
    }
  }

  /**
   * 更新图片信息
   */
  static async update(id, data) {
    try {
      const updates = [];
      const params = [];

      if (Object.prototype.hasOwnProperty.call(data, 'sortOrder')) {
        updates.push('sort_order = ?');
        params.push(parseInt(data.sortOrder) || 0);
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      const sql = `UPDATE image_set_images SET ${updates.join(', ')} WHERE id = ?`;
      params.push(id);
      await SQLiteAdapter.execute(sql, params);
      return await this.findById(id);
    } catch (error) {
      Logger.error('更新图片信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除图片
   */
  static async delete(id) {
    try {
      const image = await this.findById(id);
      if (!image) return null;

      await SQLiteAdapter.execute('DELETE FROM image_set_images WHERE id = ?', [id]);
      return image;
    } catch (error) {
      Logger.error('删除图片失败:', error);
      throw error;
    }
  }

  /**
   * 删除图片集的所有图片
   */
  static async deleteByImageSetId(imageSetId) {
    try {
      const images = await this.findByImageSetId(imageSetId);
      await SQLiteAdapter.execute('DELETE FROM image_set_images WHERE image_set_id = ?', [
        imageSetId,
      ]);
      return images;
    } catch (error) {
      Logger.error('删除图片集图片失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新排序
   */
  static async batchUpdateSortOrder(updates) {
    try {
      for (const { id, sortOrder } of updates) {
        await SQLiteAdapter.execute('UPDATE image_set_images SET sort_order = ? WHERE id = ?', [
          sortOrder,
          id,
        ]);
      }
      return true;
    } catch (error) {
      Logger.error('批量更新排序失败:', error);
      throw error;
    }
  }

  /**
   * 获取图片集的图片数量和总大小
   */
  static async getImageSetStats(imageSetId) {
    try {
      const [result] = await SQLiteAdapter.execute(
        `SELECT 
          COUNT(*) as count,
          COALESCE(SUM(file_size), 0) as totalSize
        FROM image_set_images WHERE image_set_id = ?`,
        [imageSetId]
      );
      return {
        count: result[0].count || 0,
        totalSize: result[0].totalSize || 0,
      };
    } catch (error) {
      Logger.error('获取图片集统计失败:', error);
      throw error;
    }
  }
}

module.exports = ImageSetImageModel;

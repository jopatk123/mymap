const PanoramaModel = require('../../models/panorama.model');
const Logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class PanoramaMutationService {
  static async createPanorama(data) {
    try {
      const { transaction } = require('../../config/database');
      let insertedId = null;
      try {
        await transaction(async (db) => {
          const sql = `INSERT INTO panoramas (title, description, image_url, thumbnail_url, latitude, longitude, gcj02_lat, gcj02_lng, file_size, file_type, folder_id, is_visible, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
          const params = [
            data.title,
            data.description || null,
            data.imageUrl,
            data.thumbnailUrl || null,
            data.lat,
            data.lng,
            data.gcj02Lat || null,
            data.gcj02Lng || null,
            data.fileSize || null,
            data.fileType || null,
            data.folderId || null,
            1,
            0,
          ];
          const res = await db.run(sql, params);
          insertedId = res.lastID;
          if (!insertedId) throw new Error('创建全景图记录失败');
        });

        return await PanoramaModel.findById(insertedId);
      } catch (txErr) {
        // 上传已完成但事务失败，尝试删除已上载的文件以避免孤儿文件
        try {
          const fs = require('fs').promises;
          const path = require('path');
          if (data.imageUrl) {
            const img = path.basename(data.imageUrl);
            await fs.unlink(path.join(process.cwd(), 'uploads', 'panoramas', img)).catch(() => {});
          }
          if (data.thumbnailUrl) {
            const th = path.basename(data.thumbnailUrl);
            await fs.unlink(path.join(process.cwd(), 'uploads', 'thumbnails', th)).catch(() => {});
          }
        } catch (_) {}

        throw txErr;
      }
    } catch (error) {
      Logger.error('创建全景图失败', error);
      throw error;
    }
  }

  static async updatePanorama(id, updateData) {
    try {
      const mapped = { ...updateData };
      // 读取当前记录，确保未提供时保留关键归属/状态字段
      const current = await PanoramaModel.findById(parseInt(id));
      if (!current) {
        throw new Error('全景图不存在');
      }
      if (!Object.prototype.hasOwnProperty.call(mapped, 'folderId')) {
        mapped.folderId = current.folder_id;
      }
      if (!Object.prototype.hasOwnProperty.call(mapped, 'isVisible')) {
        mapped.isVisible = current.is_visible;
      }
      if (!Object.prototype.hasOwnProperty.call(mapped, 'sortOrder')) {
        mapped.sortOrder = current.sort_order;
      }
      if (Object.prototype.hasOwnProperty.call(mapped, 'lat')) {
        mapped.latitude = mapped.lat;
        delete mapped.lat;
      }
      if (Object.prototype.hasOwnProperty.call(mapped, 'lng')) {
        mapped.longitude = mapped.lng;
        delete mapped.lng;
      }
      // 调试：记录入参关键字段
      try {
        const debugKeys = Object.keys(mapped);
        Logger.debug('[PanoramaMutationService.updatePanorama] keys', { id, keys: debugKeys });
      } catch (_) {}
      const panorama = await PanoramaModel.update(id, mapped);
      if (!panorama) {
        throw new Error('全景图不存在');
      }
      return panorama;
    } catch (error) {
      Logger.error('更新全景图失败', error);
      throw error;
    }
  }

  static async deletePanorama(id) {
    try {
      const panorama = await PanoramaModel.findById(parseInt(id));
      if (!panorama) {
        throw new Error('全景图不存在');
      }

      const { transaction } = require('../../config/database');
      try {
        await transaction(async (db) => {
          const delRes = await db.run('DELETE FROM panoramas WHERE id = ?', [parseInt(id)]);
          if (!delRes || delRes.changes === 0) {
            throw new Error('删除数据库记录失败');
          }

          // 删除物理文件，如果删除失败（非ENOENT）则抛错触发回滚
          const fs = require('fs').promises;
          const path = require('path');

          if (panorama.image_url) {
            const imageFilename = path.basename(panorama.image_url);
            const imagePath = path.join(process.cwd(), 'uploads', 'panoramas', imageFilename);
            try {
              await fs.unlink(imagePath);
            } catch (err) {
              if (err && err.code === 'ENOENT') {
                // 已不存在，忽略
              } else {
                throw err;
              }
            }
          }

          if (panorama.thumbnail_url) {
            const thumbFilename = path.basename(panorama.thumbnail_url);
            const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
            try {
              await fs.unlink(thumbPath);
            } catch (err) {
              if (err && err.code === 'ENOENT') {
                // 已不存在，忽略
              } else {
                throw err;
              }
            }
          }
        });

        return true;
      } catch (txErr) {
        Logger.error('事务性删除全景图失败:', txErr);
        throw txErr;
      }
    } catch (error) {
      Logger.error('删除全景图失败', error);
      throw error;
    }
  }

  static async batchDeletePanoramas(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return 0;

      const panoramasToDelete = [];
      for (const pid of ids) {
        try {
          const p = await PanoramaModel.findById(parseInt(pid));
          if (p) panoramasToDelete.push(p);
        } catch (e) {
          Logger.warn(`获取全景图信息失败 (ID: ${pid})`, e);
        }
      }

      const { transaction } = require('../../config/database');
      try {
        let affected = 0;
        await transaction(async (db) => {
          // 删除数据库记录
          const { clause, params } = require('../../utils/QueryBuilder').buildInClause(ids);
          const delRes = await db.run(`DELETE FROM panoramas WHERE id ${clause}`, params);
          affected = delRes.changes || 0;

          // 删除物理文件，若出现不可忽略错误则抛出以回滚
          const fs = require('fs').promises;
          const path = require('path');
          for (const pano of panoramasToDelete) {
            if (pano.image_url) {
              const imageFilename = path.basename(pano.image_url);
              const imagePath = path.join(process.cwd(), 'uploads', 'panoramas', imageFilename);
              try {
                await fs.unlink(imagePath);
              } catch (err) {
                if (err.code !== 'ENOENT') throw err;
              }
            }
            if (pano.thumbnail_url) {
              const thumbFilename = path.basename(pano.thumbnail_url);
              const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
              try {
                await fs.unlink(thumbPath);
              } catch (err) {
                if (err.code !== 'ENOENT') throw err;
              }
            }
          }
        });
        return affected;
      } catch (txErr) {
        Logger.error('事务性批量删除全景图失败:', txErr);
        throw txErr;
      }
    } catch (error) {
      Logger.error('批量删除全景图失败', error);
      throw error;
    }
  }

  static async movePanoramaToFolder(id, folderId) {
    try {
      return await PanoramaModel.update(id, { folderId });
    } catch (error) {
      Logger.error('移动全景图失败', error);
      throw error;
    }
  }

  static async batchMovePanoramasToFolder(ids, folderId) {
    try {
      return await PanoramaModel.batchMoveToFolder(ids, folderId);
    } catch (error) {
      Logger.error('批量移动全景图失败', error);
      throw error;
    }
  }

  static async updatePanoramaVisibility(id, isVisible) {
    try {
      return await PanoramaModel.update(id, { is_visible: isVisible });
    } catch (error) {
      Logger.error('更新全景图可见性失败', error);
      throw error;
    }
  }

  static async batchUpdatePanoramaVisibility(ids, isVisible) {
    try {
      return await PanoramaModel.batchUpdateVisibility(ids, isVisible);
    } catch (error) {
      Logger.error('批量更新全景图可见性失败', error);
      throw error;
    }
  }

  static async deletePanoramaFiles(panorama) {
    try {
      // 删除原图
      if (panorama.image_url) {
        const imageFilename = path.basename(panorama.image_url);
        const imagePath = path.join(process.cwd(), 'uploads', 'panoramas', imageFilename);
        try {
          await fs.access(imagePath);
          await fs.unlink(imagePath);
          Logger.debug('删除全景原图成功', { imagePath });
        } catch (error) {
          Logger.warn('全景原图不存在或删除失败', { imagePath, error: error.message });
        }
      }

      // 删除缩略图
      if (panorama.thumbnail_url) {
        const thumbFilename = path.basename(panorama.thumbnail_url);
        const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
        try {
          await fs.access(thumbPath);
          await fs.unlink(thumbPath);
          Logger.debug('删除全景缩略图成功', { thumbPath });
        } catch (error) {
          Logger.warn('全景缩略图不存在或删除失败', { thumbPath, error: error.message });
        }
      }
    } catch (error) {
      Logger.warn('删除全景图文件失败:', error);
    }
  }
}

module.exports = PanoramaMutationService;

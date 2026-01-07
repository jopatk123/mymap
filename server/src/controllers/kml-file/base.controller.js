const KmlFileModel = require('../../models/kml-file.model');
const KmlPointModel = require('../../models/kml-point.model');
const kmlParserService = require('../../services/kml-parser.service');
const Logger = require('../../utils/logger');

class KmlFileBaseController {
  static async getKmlFiles(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = '',
        folderId = null,
        includeHidden = false,
        respectFolderVisibility = false,
        includeBasemap = false,
        basemapOnly = false,
      } = req.query;
      const ownerId = req.user?.id;

      let searchParams = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
        folderId: folderId ? parseInt(folderId) : null,
        includeHidden: includeHidden === 'true',
        includeBasemap: includeBasemap === 'true',
        basemapOnly: basemapOnly === 'true',
        ownerId,
      };

      if (respectFolderVisibility === 'true' || respectFolderVisibility === true) {
        const FolderModel = require('../../models/folder.model');
        const visibleFolderIds = await FolderModel.getVisibleFolderIds(ownerId);
        searchParams.visibleFolderIds = visibleFolderIds;
      }

      const result = await KmlFileModel.findAll(searchParams);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      Logger.error('获取KML文件列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取KML文件列表失败',
        error: error.message,
      });
    }
  }

  static async getKmlFileById(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user?.id;
      const kmlFile = await KmlFileModel.findById(parseInt(id), ownerId);

      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在',
        });
      }

      const points = await KmlPointModel.findByKmlFileId(parseInt(id));

      res.json({
        success: true,
        data: {
          ...kmlFile,
          points,
        },
      });
    } catch (error) {
      Logger.error('获取KML文件详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取KML文件详情失败',
        error: error.message,
      });
    }
  }

  static async uploadKmlFile(req, res) {
    try {
      const { uploadedFile } = req;
      const { title, description, folderId } = req.body;
      const ownerId = req.user?.id;

      // 延迟加载工具以避免可能的循环依赖导致的初始化问题
      const KmlFileUtils = require('../../utils/kml-file-utils');

      const typeValidation = KmlFileUtils.validateKmlFileType(uploadedFile);
      if (!typeValidation.valid) {
        return res.status(400).json({ success: false, message: typeValidation.message });
      }

      const paramValidation = KmlFileUtils.validateUploadParams({ title });
      if (!paramValidation.valid) {
        return res.status(400).json({ success: false, message: paramValidation.message });
      }

      const filePath = uploadedFile.path;
      const placemarks = await kmlParserService.parseKmlFile(filePath);

      if (placemarks.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'KML文件中没有找到有效的地标数据',
        });
      }

      const { transaction } = require('../../config/database');
      const { wgs84ToGcj02 } = require('../../utils/coordinate');
      const isBasemapFlag =
        req.body &&
        (req.body.isBasemap === '1' ||
          req.body.isBasemap === 'true' ||
          req.body.isBasemap === true);

      try {
        let insertedFileId = null;
        await transaction(async (db) => {
          // 插入 kml_files
          const insertFileSql = `INSERT INTO kml_files (title, description, file_url, file_size, folder_id, is_visible, sort_order, is_basemap, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
          const fileRes = await db.run(insertFileSql, [
            title,
            description || '',
            uploadedFile.url,
            uploadedFile.size,
            folderId ? parseInt(folderId) : null,
            1,
            0,
            isBasemapFlag ? 1 : 0,
            ownerId || null,
          ]);
          insertedFileId = fileRes.lastID;

          if (!insertedFileId) throw new Error('创建KML文件记录失败');

          // 批量插入点位
          if (placemarks && placemarks.length > 0) {
            // SQLite has a limit on number of bound variables (default 999).
            // Each point uses 11 variables; chunk inserts to stay under the limit.
            const varsPerPoint = 11;
            const maxSqlVars = 999;
            const maxPointsPerBatch = Math.max(1, Math.floor(maxSqlVars / varsPerPoint));

            for (let i = 0; i < placemarks.length; i += maxPointsPerBatch) {
              const chunk = placemarks.slice(i, i + maxPointsPerBatch);
              const values = [];
              const params = [];
              for (const p of chunk) {
                const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(p.longitude, p.latitude);
                values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                params.push(
                  insertedFileId,
                  p.name || '',
                  p.description || '',
                  p.latitude,
                  p.longitude,
                  gcj02Lat || null,
                  gcj02Lng || null,
                  p.altitude || 0,
                  p.pointType || 'Point',
                  JSON.stringify(p.coordinates || {}),
                  JSON.stringify(p.styleData || {})
                );
              }
              const insertPointsSql = `INSERT INTO kml_points (kml_file_id, name, description, latitude, longitude, gcj02_lat, gcj02_lng, altitude, point_type, coordinates, style_data) VALUES ${values.join(
                ','
              )}`;
              await db.run(insertPointsSql, params);
            }
          }
        });

        const completeKmlFile = await KmlFileModel.findById(insertedFileId);
        res.status(201).json({
          success: true,
          message: `KML文件上传成功，解析出 ${placemarks.length} 个地标`,
          data: completeKmlFile,
        });
      } catch (txErr) {
        // 事务失败：尝试删除物理文件以避免孤儿文件
        try {
          await require('../../utils/kml-file-utils').deletePhysicalFile(uploadedFile.url);
        } catch (e) {
          /* ignore */
        }
        Logger.error('上传事务失败:', txErr);
        return res
          .status(500)
          .json({ success: false, message: '上传失败（事务回滚）', error: txErr.message });
      }
    } catch (error) {
      Logger.error('上传KML文件失败:', error);
      res.status(500).json({
        success: false,
        message: '上传KML文件失败',
        error: error.message,
      });
    }
  }

  static async setBasemapFlag(req, res) {
    try {
      const { id } = req.params;
      const { isBasemap } = req.body;
      const ownerId = req.user?.id;
      if (typeof isBasemap === 'undefined') {
        return res.status(400).json({ success: false, message: '请提供 isBasemap 字段' });
      }

      const KmlFileModel = require('../../models/kml-file.model');
      const updated = await KmlFileModel.update(parseInt(id), { is_basemap: isBasemap ? 1 : 0 }, ownerId);
      if (!updated) return res.status(404).json({ success: false, message: 'KML 文件不存在' });
      res.json({ success: true, data: updated });
    } catch (error) {
      Logger.error('设置 KML 底图标志失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async validateKmlFile(req, res) {
    try {
      const { uploadedFile } = req;
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: '请上传KML文件',
        });
      }
      const validation = await kmlParserService.validateKmlFile(uploadedFile.path);
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      Logger.error('验证KML文件失败:', error);
      res.status(500).json({
        success: false,
        message: '验证KML文件失败',
        error: error.message,
      });
    }
  }

  static async updateKmlFile(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const ownerId = req.user?.id;
      const kmlFile = await KmlFileModel.update(parseInt(id), updateData, ownerId);

      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在',
        });
      }

      res.json({
        success: true,
        message: 'KML文件更新成功',
        data: kmlFile,
      });
    } catch (error) {
      Logger.error('更新KML文件失败:', error);
      res.status(500).json({
        success: false,
        message: '更新KML文件失败',
        error: error.message,
      });
    }
  }

  static async deleteKmlFile(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user?.id;
      const kmlFile = await KmlFileModel.findById(parseInt(id), ownerId);
      if (!kmlFile) {
        return res.status(404).json({
          success: false,
          message: 'KML文件不存在',
        });
      }

      // 延迟加载工具以避免循环依赖问题
      const KmlFileUtils = require('../../utils/kml-file-utils');

      const { transaction } = require('../../config/database');

      try {
        // 只在事务中删除数据库相关记录（点位和文件元信息）。
        // 把物理文件删除移到事务外，以避免物理文件系统错误导致数据库回滚，
        // 从而产生不一致或前端看到 500 的情况。
        await transaction(async (db) => {
          // 删除点位
          await db.run('DELETE FROM kml_points WHERE kml_file_id = ?', [parseInt(id)]);

          // 删除文件记录
          const delRes = await db.run('DELETE FROM kml_files WHERE id = ?', [parseInt(id)]);
          if (!delRes || delRes.changes === 0) {
            throw new Error('删除数据库记录失败');
          }
        });

        // 事务提交成功后再尝试删除物理文件；物理文件删除失败不应回滚 DB。
        try {
          await KmlFileUtils.deletePhysicalFile(kmlFile.file_url);
        } catch (fileErr) {
          // 记录但不将错误返回给客户端（避免部分外部文件系统问题导致 500）
          Logger.warn('物理 KML 文件删除失败（已忽略）:', fileErr);
        }

        const ConfigService = require('../../services/config.service');
        // 删除样式配置（如果抛出异常，将会被外层 catch 捕获并返回 500）
        await ConfigService.deleteKmlStyles(id);
        res.json({ success: true, message: 'KML文件删除成功' });
      } catch (err) {
        Logger.error('删除KML文件失败（事务或样式删除出错）:', err);
        return res
          .status(500)
          .json({ success: false, message: '删除KML文件失败', error: err.message });
      }
    } catch (error) {
      Logger.error('删除KML文件失败:', error);
      res.status(500).json({ success: false, message: '删除KML文件失败', error: error.message });
    }
  }

  static async getKmlFileStats(req, res) {
    try {
      const ownerId = req.user?.id;
      const stats = await KmlFileModel.getStats(ownerId);
      res.json({ success: true, data: stats });
    } catch (error) {
      Logger.error('获取KML文件统计失败:', error);
      res
        .status(500)
        .json({ success: false, message: '获取KML文件统计失败', error: error.message });
    }
  }
}

module.exports = KmlFileBaseController;

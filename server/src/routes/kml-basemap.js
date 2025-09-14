const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { DOMParser } = require('xmldom');
const router = express.Router();
const KmlFileModel = require('../models/kml-file.model');
const KmlPointModel = require('../models/kml-point.model');
const { transaction } = require('../config/database');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/kml-basemap');
    try {
      // Ensure the upload directory exists (multer won't create nested dirs by default)
      fsSync.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
      // If creation fails, log a warning and let multer continue (it will error later)
      console.warn('Failed to create upload directory:', err && err.message);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + '-' + originalName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.google-earth.kml+xml' ||
      file.originalname.toLowerCase().endsWith('.kml')
    ) {
      cb(null, true);
    } else {
      cb(new Error('只支持KML格式文件'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 使用数据库模型进行持久化，移除内存模拟存储

/**
 * 解析KML文件内容
 */
function parseKMLFile(kmlContent) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlContent, 'text/xml');
    const placemarks = doc.getElementsByTagName('Placemark');

    const points = [];

    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const nameNode = placemark.getElementsByTagName('name')[0];
      const descriptionNode = placemark.getElementsByTagName('description')[0];
      const coordinatesNode = placemark.getElementsByTagName('coordinates')[0];

      if (coordinatesNode) {
        const coordinates = coordinatesNode.textContent.trim();
        const [lng, lat, alt] = coordinates.split(',').map(Number);

        if (!isNaN(lng) && !isNaN(lat)) {
          points.push({
            id: `point_${Date.now()}_${i}`,
            name: nameNode ? nameNode.textContent : '',
            description: descriptionNode ? descriptionNode.textContent : '',
            latitude: lat,
            longitude: lng,
            altitude: alt || 0,
            visible: false,
          });
        }
      }
    }

    return points;
  } catch (error) {
    console.error('解析KML文件失败:', error);
    throw new Error('KML文件格式错误');
  }
}

/**
 * POST /api/kml-basemap/upload
 * 上传KML底图文件
 */
// 支持前端可能使用的字段名（kml 或 file），使用 upload.any() 接受任意文件字段
// 包装 upload.any() 以便在 multer 抛错时记录详细信息
const multerUploadWrapper = (req, res, next) => {
  // log arrival
  const arrivalLog = `[${new Date().toISOString()}] [KML BASEMAP] upload route hit: ${req.ip} ${
    req.headers['user-agent']
  }\n`;
  try {
    const p = require('path');
    const fs = require('fs');
    const logDir = p.join(__dirname, '../../logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(p.join(logDir, 'upload-debug.log'), arrivalLog);
  } catch (e) {
    /* ignore */
  }
  console.info('[KML BASEMAP] upload route hit:', req.ip, req.headers['user-agent']);
  upload.any()(req, res, (err) => {
    if (err) {
      const errLog = `[${new Date().toISOString()}] [KML BASEMAP] multer upload error: ${
        err && err.stack ? err.stack : err
      }\n`;
      try {
        const p = require('path');
        const fs = require('fs');
        const logDir = p.join(__dirname, '../../logs');
        fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(p.join(logDir, 'upload-debug.log'), errLog);
      } catch (e) {
        /* ignore */
      }
      console.error('[KML BASEMAP] multer upload error:', err);
      // 把错误传递给全局错误处理器，同时在开发环境返回堆栈
      return next(err);
    }
    next();
  });
};

router.post('/upload', multerUploadWrapper, async (req, res) => {
  try {
    // multer.any() 将文件放到 req.files 数组
    const uploadedFile = req.file || (req.files && req.files[0]);
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: '请选择KML文件' });
    }

    const filePath = uploadedFile.path;
    const kmlContent = await fs.readFile(filePath, 'utf-8');

    // 解析KML文件获取点位数据
    const points = parseKMLFile(kmlContent);

    // 从表单中读取额外参数
    const { title, description, folderId } = req.body;
    const fileUrl = `/uploads/kml-basemap/${uploadedFile.filename}`;

    // 修复可能的文件名编码问题（multer 在某些环境会以 latin1 提供 originalname）
    let originalName = uploadedFile.originalname || '';
    try {
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (e) {
      // ignore and keep original
    }

    const KmlFileUtils = require('../utils/kml-file-utils');
    const { transaction } = require('../config/database');
    const { wgs84ToGcj02 } = require('../utils/coordinate');

    try {
      let insertedId = null;
      await transaction(async (db) => {
        const insertFileSql = `INSERT INTO kml_files (title, description, file_url, file_size, folder_id, is_visible, sort_order, is_basemap, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
        const insertRes = await db.run(insertFileSql, [
          title || originalName || uploadedFile.originalname,
          description || '',
          fileUrl,
          uploadedFile.size,
          folderId ? parseInt(folderId) : null,
          1,
          0,
          1,
        ]);
        insertedId = insertRes.lastID;

        if (!insertedId) throw new Error('创建KML文件记录失败');

        if (points && points.length > 0) {
          const varsPerPoint = 11;
          const maxSqlVars = 999;
          const maxPointsPerBatch = Math.max(1, Math.floor(maxSqlVars / varsPerPoint));

          for (let i = 0; i < points.length; i += maxPointsPerBatch) {
            const chunk = points.slice(i, i + maxPointsPerBatch);
            const values = [];
            const params = [];
            for (const p of chunk) {
              const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(p.longitude, p.latitude);
              values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
              params.push(
                insertedId,
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

      const completeKmlFile = await KmlFileModel.findById(insertedId);
      res.status(201).json({
        success: true,
        message: `KML文件上传成功，解析出 ${points.length} 个地标`,
        data: completeKmlFile,
      });
    } catch (txErr) {
      // 事务失败，删除物理文件以避免孤儿文件
      try {
        await KmlFileUtils.deletePhysicalFile(fileUrl);
      } catch (e) {
        /* ignore */
      }
      console.error('上传事务失败:', txErr);
      return res
        .status(500)
        .json({ success: false, message: '上传失败（事务回滚）', error: txErr.message });
    }
  } catch (error) {
    console.error('上传KML文件失败:', error);
    const responseBody = {
      success: false,
      message: error.message || '上传失败',
    };
    if (process.env.NODE_ENV !== 'production') {
      responseBody.error = error && error.stack ? error.stack : error;
    }
    res.status(500).json(responseBody);
  }
});

/**
 * GET /api/kml-basemap/files
 * 获取KML底图文件列表
 */
router.get('/files', async (req, res) => {
  try {
    const { page, pageSize, keyword, folderId, includeHidden, respectFolderVisibility } = req.query;
    const result = await KmlFileModel.findAll({
      page,
      pageSize,
      keyword,
      folderId,
      includeHidden,
      respectFolderVisibility,
      basemapOnly: true,
    });

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
    console.error('获取KML文件列表失败:', error);
    res.status(500).json({ success: false, message: '获取文件列表失败' });
  }
});

/**
 * GET /api/kml-basemap/:fileId/points
 * 获取指定KML文件的点位数据
 */
router.get('/:fileId/points', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const points = await KmlPointModel.findByKmlFileId(fileId);
    res.json({ success: true, data: points });
  } catch (error) {
    console.error('获取KML点位数据失败:', error);
    res.status(500).json({ success: false, message: '获取点位数据失败' });
  }
});

/**
 * GET /api/kml-basemap/:fileId/download
 * 下载KML文件
 */
router.get('/:fileId/download', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const file = await KmlFileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'KML文件不存在' });
    }

    const fileUrl = file.file_url || file.fileUrl || '';
    const filePath = path.join(process.cwd(), fileUrl);

    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ success: false, message: '文件已被删除' });
    }

    const downloadName = file.title || file.name || path.basename(filePath);
    res.download(filePath, downloadName);
  } catch (error) {
    console.error('下载KML文件失败:', error);
    res.status(500).json({ success: false, message: '下载失败' });
  }
});

/**
 * DELETE /api/kml-basemap/:fileId
 * 删除KML底图文件
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const file = await KmlFileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'KML文件不存在' });
    }

    const fileUrl = file.file_url || file.fileUrl || '';
    // ensure relative path
    const filePath = path.join(process.cwd(), (fileUrl || '').replace(/^\//, ''));

    // 使用事务：先在事务中删除点位与文件记录，再删除物理文件；若物理文件删除失败（非ENOENT），回滚事务
    try {
      await transaction(async (db) => {
        // 删除点位
        await db.run('DELETE FROM kml_points WHERE kml_file_id = ?', [fileId]);

        // 删除文件记录
        const delRes = await db.run('DELETE FROM kml_files WHERE id = ?', [fileId]);
        if (!delRes || delRes.changes === 0) {
          throw new Error('删除数据库记录失败');
        }

        // 删除物理文件（如果不存在则视为成功；其他错误则抛出以触发回滚）
        try {
          await fs.unlink(filePath);
        } catch (err) {
          if (err && err.code === 'ENOENT') {
            // 文件已不存在，继续完成事务
            console.warn('物理文件已不存在:', filePath);
          } else {
            console.warn('删除物理文件失败:', err && err.message);
            throw err;
          }
        }
      });

      return res.json({ success: true, message: 'KML文件删除成功' });
    } catch (err) {
      console.error('事务性删除KML文件失败:', err);
      return res.status(500).json({ success: false, message: '删除失败，已回滚' });
    }
  } catch (error) {
    console.error('删除KML文件失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * POST /api/kml-basemap/export
 * 导出选中的KML点位数据
 */
router.post('/export', (req, res) => {
  try {
    const { points, format = 'csv', filename = 'exported_points' } = req.body;

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导出的点位数据',
      });
    }

    let content = '';
    let mimeType = '';
    let fileExtension = '';

    switch (format) {
      case 'csv': {
        // 生成CSV内容
        const csvHeaders = ['序号', '名称', '描述', '纬度', '经度', '海拔'];
        const csvRows = [
          csvHeaders.join(','),
          ...points.map((point, index) =>
            [
              index + 1,
              `"${(point.name || '').replace(/"/g, '""')}"`,
              `"${(point.description || '').replace(/"/g, '""')}"`,
              point.latitude || '',
              point.longitude || '',
              point.altitude || 0,
            ].join(',')
          ),
        ];
        content = '\uFEFF' + csvRows.join('\n'); // 添加BOM
        mimeType = 'text/csv;charset=utf-8';
        fileExtension = 'csv';
        break;
      }

      case 'json': {
        content = JSON.stringify(
          {
            exportTime: new Date().toISOString(),
            totalCount: points.length,
            points: points,
          },
          null,
          2
        );
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: '不支持的导出格式',
        });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.send(content);
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const PanoramaController = require('../controllers/panorama.controller');
const {
  validatePanoramaData,
  validateUpdatePanoramaData,
  validateSearchParams,
  validateBoundsParams,
  validateId,
  validateBatchIds,
  validateBatchMoveParams,
} = require('../middleware/validator.middleware');
const { handleSingleUpload, handleBatchUpload } = require('../middleware/upload.middleware');
const path = require('path');
const fs = require('fs').promises;
const PanoramaModel = require('../models/panorama.model');
const { errorResponse } = require('../utils/response');

// 获取全景图列表
router.get('/', PanoramaController.getPanoramas);

// 根据地图边界获取全景图
router.get('/bounds', validateBoundsParams, PanoramaController.getPanoramasByBounds);

// 获取附近的全景图
router.get('/nearby', PanoramaController.getNearbyPanoramas);

// 搜索全景图
router.get('/search', validateSearchParams, PanoramaController.searchPanoramas);

// 获取统计信息
router.get('/stats', PanoramaController.getStats);

// 坐标转换
router.get('/convert-coordinate', PanoramaController.convertCoordinate);

// 创建全景图
router.post('/', validatePanoramaData, PanoramaController.createPanorama);

// 单文件上传
router.post('/upload', handleSingleUpload, async (req, res) => {
  const { uploadedFile } = req;
  const { title, description, lat, lng, folderId } = req.body || {};

  // 优先使用客户端提供的坐标
  let latNum = lat && !isNaN(parseFloat(lat)) ? parseFloat(lat) : null;
  let lngNum = lng && !isNaN(parseFloat(lng)) ? parseFloat(lng) : null;

  // 若未提供或无效，尝试从图片EXIF提取（服务端兜底）
  if ((latNum === null || lngNum === null) && uploadedFile?.path) {
    try {
      const exifr = require('exifr');
      const fsRaw = require('fs');
      const buf = fsRaw.readFileSync(uploadedFile.path);
      const gps = await exifr.gps(buf);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        latNum = latNum === null ? gps.latitude : latNum;
        lngNum = lngNum === null ? gps.longitude : lngNum;
      }
    } catch (e) {
      try {
        const Logger = require('../utils/logger');
        Logger.warn('服务端 EXIF GPS 提取失败（将继续按现有参数创建）:', e.message || e);
      } catch (_) {}
    }
  }

  // 构建全景图数据
  const panoramaData = {
    title: title || '未命名全景图',
    description: description || '',
    lat: latNum,
    lng: lngNum,
    imageUrl: uploadedFile.imageUrl,
    thumbnailUrl: uploadedFile.thumbnailUrl,
    fileSize: uploadedFile.size,
    fileType: uploadedFile.mimetype,
    folderId:
      folderId !== undefined && folderId !== null
        ? folderId === 0
          ? null
          : parseInt(folderId)
        : null,
  };

  // 将数据添加到请求体中，然后调用创建控制器
  req.body = panoramaData;
  PanoramaController.createPanorama(req, res);
});

// 批量文件上传
router.post('/batch-upload', handleBatchUpload, async (req, res) => {
  try {
    const { uploadedFiles } = req;
    const results = [];

    // 为每个文件创建全景图记录
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const panoramaData = {
        title: `全景图 ${i + 1}`,
        description: `批量上传的全景图 - ${file.originalName}`,
        lat: 39.9042, // 默认坐标，用户需要后续修改
        lng: 116.4074,
        imageUrl: file.imageUrl,
        thumbnailUrl: file.thumbnailUrl,
        fileSize: file.size,
        fileType: file.mimetype,
      };

      try {
        // 创建临时请求对象
        const tempReq = { body: panoramaData };
        const tempRes = {
          status: () => tempRes,
          json: (data) => data,
        };

        const result = await PanoramaController.createPanorama(tempReq, tempRes);
        results.push({
          success: true,
          file: file.originalName,
          data: result,
        });
      } catch (error) {
        results.push({
          success: false,
          file: file.originalName,
          error: error.message,
        });
      }
    }

    res.json({
      code: 200,
      success: true,
      message: '批量上传完成',
      data: {
        total: uploadedFiles.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
    });
  } catch (error) {
    const Logger = require('../utils/logger');
    Logger.error('批量上传处理失败:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: '批量上传处理失败',
      data: null,
    });
  }
});

// 批量操作路由 - 这些需要在具体ID路由之前定义
// 批量移动全景图到文件夹
router.patch('/batch/move', validateBatchMoveParams, PanoramaController.batchMovePanoramasToFolder);

// 批量删除全景图
router.delete('/', validateBatchIds, PanoramaController.batchDeletePanoramas);

// 批量更新全景图可见性
router.patch(
  '/batch/visibility',
  validateBatchIds,
  PanoramaController.batchUpdatePanoramaVisibility
);

// 根据ID获取全景图详情
router.get('/:id', validateId, PanoramaController.getPanoramaById);

// 更新全景图
router.put('/:id', validateId, validateUpdatePanoramaData, PanoramaController.updatePanorama);

// 删除全景图
router.delete('/:id', validateId, PanoramaController.deletePanorama);

// 移动全景图到文件夹
router.patch('/:id/move', validateId, PanoramaController.movePanoramaToFolder);

// 更新全景图可见性
router.patch('/:id/visibility', validateId, PanoramaController.updatePanoramaVisibility);

// 带EXIF GPS的下载（仅JPEG支持注入EXIF；其他类型原样返回）
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json(errorResponse('无效的ID'));
    }
    const pano = await PanoramaModel.findById(id);
    if (!pano || !pano.image_url) {
      return res.status(404).json(errorResponse('未找到全景图'));
    }

    // 仅处理本地存储的相对路径“/uploads/panoramas/<filename>”
    const fileName = path.basename(pano.image_url);
    const absPath = path.join(process.cwd(), 'uploads', 'panoramas', fileName);

    // 读取文件buffer
    let buffer;
    try {
      buffer = await fs.readFile(absPath);
    } catch (e) {
      return res.status(404).json(errorResponse('源文件不存在'));
    }

    const mime = String(pano.file_type || 'image/jpeg');

    // 根据标题生成下载文件名（UTF-8 兼容），并选择合适扩展名
    const rawTitle = (pano.title || `panorama-${id}`).toString();
    const safeBase = rawTitle
      .replace(/[\/:*?"<>|]/g, ' ') // 去除非法文件名字符
      .replace(/\s+/g, ' ') // 合并空格
      .trim();
    const origExt = path.extname(fileName).replace(/^\./, '').toLowerCase();
    const suggestName = (ext) => `${safeBase || `panorama-${id}`}.${ext}`;
    const setDownloadHeaders = (fileNameOut, contentType) => {
      res.setHeader('Content-Type', contentType);
      // 同时设置 filename 与 filename*（RFC 5987），兼容中文文件名
      const encoded = encodeURIComponent(fileNameOut);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileNameOut}"; filename*=UTF-8''${encoded}`
      );
    };

    // 仅对 JPEG 写入 EXIF；其他类型原样透传
    const isJpeg = /image\/(jpeg|jpg)/i.test(mime) || /\.jpe?g$/i.test(fileName);
    if (!isJpeg) {
      // 非 JPEG 原样返回，并尽量沿用原扩展名
      const ext = origExt || (mime.split('/')[1] || 'bin');
      setDownloadHeaders(suggestName(ext), mime);
      return res.send(buffer);
    }

    // 从 DB 取 WGS84 坐标
    const lat = Number(pano.latitude);
    const lng = Number(pano.longitude);
    const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasGps) {
      // 若无坐标，直接返回原图（命名仍使用标题）
      setDownloadHeaders(suggestName('jpg'), 'image/jpeg');
      return res.send(buffer);
    }

    // 使用 piexifjs 写入 GPS EXIF
    const piexif = require('piexifjs');
    const b64 = buffer.toString('binary');
    // 将十进制度转换为度分秒分数
    const toRational = (num) => {
      const denom = 1000000;
      return [Math.round(num * denom), denom];
    };
    const absLat = Math.abs(lat);
    const absLng = Math.abs(lng);
    const degMinSec = (v) => {
      const deg = Math.floor(v);
      const minFloat = (v - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = (minFloat - min) * 60;
      return [toRational(deg), toRational(min), toRational(sec)];
    };

    const gpsIfd = {};
    gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
    gpsIfd[piexif.GPSIFD.GPSLatitude] = degMinSec(absLat);
    gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';
    gpsIfd[piexif.GPSIFD.GPSLongitude] = degMinSec(absLng);

    let exifObj = {};
    try {
      exifObj = piexif.load(b64);
    } catch (_) {
      exifObj = { '0th': {}, Exif: {}, GPS: {}, '1st': {} };
    }
    exifObj.GPS = { ...(exifObj.GPS || {}), ...gpsIfd };
    const exifBytes = piexif.dump(exifObj);
    const newB64 = piexif.insert(exifBytes, b64);
    const outBuf = Buffer.from(newB64, 'binary');

    setDownloadHeaders(suggestName('jpg'), 'image/jpeg');
    return res.send(outBuf);
  } catch (error) {
    try {
      const Logger = require('../utils/logger');
      Logger.error('下载并写入EXIF失败:', error);
    } catch (_) {}
    return res.status(500).json(errorResponse('下载失败'));
  }
});

module.exports = router;

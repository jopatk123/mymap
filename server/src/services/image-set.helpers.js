const path = require('path');
const fs = require('fs').promises;
const Logger = require('../utils/logger');
const ImageSetImageModel = require('../models/image-set-image.model');

const parseIdOrThrow = (value, message) => {
  if (!value || isNaN(value)) throw new Error(message);
  return parseInt(value);
};

const ensureArrayOrThrow = (value, message) => {
  if (!Array.isArray(value) || value.length === 0) throw new Error(message);
  return value;
};

const normalizeFolderId = (folderId) =>
  folderId && parseInt(folderId) !== 0 ? parseInt(folderId) : null;

const computeImageStats = (images) => {
  const imageCount = images.length;
  const totalSize = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);
  const coverUrl = images.length > 0 ? images[0].imageUrl : null;
  const thumbnailUrl = images.length > 0 ? images[0].thumbnailUrl : null;
  return { imageCount, totalSize, coverUrl, thumbnailUrl };
};

const insertImageRecords = async (db, imageSetId, images, startOrder = 0, useProvidedSortOrder = true) => {
  const imgSql = `INSERT INTO image_set_images (
    image_set_id, image_url, thumbnail_url,
    file_name, file_size, file_type,
    width, height, sort_order, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    await db.run(imgSql, [
      imageSetId,
      img.imageUrl,
      img.thumbnailUrl,
      img.fileName,
      img.fileSize || null,
      img.fileType || null,
      img.width || null,
      img.height || null,
      startOrder + (useProvidedSortOrder ? (img.sortOrder ?? i) : i),
    ]);
  }
};

const updateImageSetStats = async (db, imageSetId) => {
  const stats = await ImageSetImageModel.getImageSetStats(parseInt(imageSetId));
  const firstImage = await db.get(
    'SELECT * FROM image_set_images WHERE image_set_id = ? ORDER BY sort_order ASC LIMIT 1',
    [parseInt(imageSetId)]
  );

  await db.run(
    `UPDATE image_sets SET 
      image_count = ?, 
      total_size = ?, 
      cover_url = ?,
      thumbnail_url = ?,
      updated_at = datetime('now') 
    WHERE id = ?`,
    [stats.count, stats.totalSize, firstImage?.image_url || null, firstImage?.thumbnail_url || null, parseInt(imageSetId)]
  );
};

const deleteFileIfExists = async (filePath, logContext) => {
  try {
    await fs.unlink(filePath);
    Logger.debug(logContext.successMessage, { ...logContext.details, filePath });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      Logger.warn(logContext.failMessage, { ...logContext.details, error: err.message, filePath });
    }
  }
};

const cleanupUploadedFiles = async (images) => {
  for (const img of images) {
    try {
      if (img.imageUrl) {
        const filename = path.basename(img.imageUrl);
        const filePath = path.join(process.cwd(), 'uploads', 'image-sets', filename);
        await fs.unlink(filePath).catch(() => {});
      }
      if (img.thumbnailUrl) {
        const thumbFilename = path.basename(img.thumbnailUrl);
        const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
        await fs.unlink(thumbPath).catch(() => {});
      }
    } catch (e) {
      Logger.warn('清理上传文件失败:', e);
    }
  }
};

const deletePhysicalFiles = async (images) => {
  for (const img of images) {
    try {
      // 删除原图
      if (img.image_url || img.imageUrl) {
        const url = img.image_url || img.imageUrl;
        const filename = path.basename(url);
        const filePath = path.join(process.cwd(), 'uploads', 'image-sets', filename);
        await deleteFileIfExists(filePath, {
          successMessage: '删除图片文件成功',
          failMessage: '删除图片文件失败',
          details: {},
        });
      }

      // 删除缩略图
      if (img.thumbnail_url || img.thumbnailUrl) {
        const url = img.thumbnail_url || img.thumbnailUrl;
        const thumbFilename = path.basename(url);
        const thumbPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbFilename);
        await deleteFileIfExists(thumbPath, {
          successMessage: '删除缩略图成功',
          failMessage: '删除缩略图失败',
          details: {},
        });
      }
    } catch (e) {
      Logger.warn('删除物理文件失败:', e);
    }
  }
};

module.exports = {
  parseIdOrThrow,
  ensureArrayOrThrow,
  normalizeFolderId,
  computeImageStats,
  insertImageRecords,
  updateImageSetStats,
  cleanupUploadedFiles,
  deletePhysicalFiles,
};

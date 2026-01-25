const path = require('path');
const fs = require('fs').promises;
const config = require('../../config');

// 确保上传目录存在
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../../../', config.upload.dir);
  const panoramaDir = path.join(uploadDir, 'panoramas');
  const thumbnailDir = path.join(uploadDir, 'thumbnails');
  const kmlDir = path.join(uploadDir, 'kml');
  const videoDir = path.join(uploadDir, 'videos');
  const imageSetDir = path.join(uploadDir, 'image-sets');

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(panoramaDir, { recursive: true });
    await fs.mkdir(thumbnailDir, { recursive: true });
    await fs.mkdir(kmlDir, { recursive: true });
    await fs.mkdir(videoDir, { recursive: true });
    await fs.mkdir(imageSetDir, { recursive: true });
  } catch (error) {
    try {
      const Logger = require('../../utils/logger');
      Logger.error('创建上传目录失败:', error);
    } catch (_) {}
  }
};

// 初始化上传目录
ensureUploadDir();

module.exports = {
  ensureUploadDir,
  uploadDir: path.join(__dirname, '../../../', config.upload.dir),
};

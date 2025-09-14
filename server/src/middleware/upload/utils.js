const sharp = require('sharp');
const fs = require('fs').promises;
// path and uploadDir intentionally not used in this module but kept for future references

/**
 * 生成缩略图
 * @param {string} inputPath 原图路径
 * @param {string} outputPath 缩略图输出路径
 * @param {number} width 缩略图宽度
 * @param {number} height 缩略图高度
 */
const generateThumbnail = async (inputPath, outputPath, width = 300, height = 150) => {
  try {
    // inputPath is expected to be used; keep behavior unchanged
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    return true;
  } catch (error) {
    console.error('生成缩略图失败:', error);
    return false;
  }
};

/**
 * 删除文件
 * @param {string} filePath 文件路径
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
};

/**
 * 获取文件信息
 * @param {string} filePath 文件路径
 */
const getFileInfo = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch (error) {
    console.error('获取文件信息失败:', error);
    return null;
  }
};

/**
 * 构建文件URL
 * @param {Object} req Express请求对象
 * @param {string} filePath 相对文件路径
 */
const buildFileUrl = (req, filePath) => {
  // 使用相对路径，避免反向代理场景下 Host 端口缺失导致的访问失败
  // 统一以 "/uploads/..." 的站内绝对路径返回，前端以当前来源加载
  return `/${filePath}`;
};

/**
 * 清理上传的文件
 * @param {Array|string} filePaths 文件路径数组或单个路径
 */
const cleanupFiles = async (filePaths) => {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('清理文件失败:', error);
      }
    })
  );
};

module.exports = {
  generateThumbnail,
  deleteFile,
  getFileInfo,
  buildFileUrl,
  cleanupFiles,
};

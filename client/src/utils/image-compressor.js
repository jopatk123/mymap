/**
 * 图片压缩工具
 * 在上传前将图片压缩到指定大小以内
 */

// 默认配置
const DEFAULT_OPTIONS = {
  maxSizeKB: 1024, // 最大文件大小 1MB = 1024KB
  maxWidthOrHeight: 2560, // 最大宽度或高度
  initialQuality: 0.9, // 初始压缩质量
  minQuality: 0.5, // 最小压缩质量
  qualityStep: 0.1, // 质量递减步长
};

/**
 * 将 File 对象转换为 Image 元素
 * @param {File} file - 图片文件
 * @returns {Promise<HTMLImageElement>}
 */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('图片加载失败'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 计算压缩后的尺寸
 * @param {number} width - 原始宽度
 * @param {number} height - 原始高度
 * @param {number} maxWidthOrHeight - 最大宽度或高度
 * @returns {{ width: number, height: number }}
 */
function calculateDimensions(width, height, maxWidthOrHeight) {
  if (width <= maxWidthOrHeight && height <= maxWidthOrHeight) {
    return { width, height };
  }

  const ratio = width / height;
  if (width > height) {
    return {
      width: maxWidthOrHeight,
      height: Math.round(maxWidthOrHeight / ratio),
    };
  } else {
    return {
      width: Math.round(maxWidthOrHeight * ratio),
      height: maxWidthOrHeight,
    };
  }
}

/**
 * 将 Canvas 转换为 Blob
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * 压缩单张图片
 * @param {File} file - 要压缩的图片文件
 * @param {Object} options - 压缩选项
 * @returns {Promise<File>} - 压缩后的文件
 */
export async function compressImage(file, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxSizeBytes = opts.maxSizeKB * 1024;

  // 如果文件已经足够小，直接返回
  if (file.size <= maxSizeBytes) {
    return file;
  }

  // 只处理图片文件
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // GIF 图片不压缩（会丢失动画）
  if (file.type === 'image/gif') {
    return file;
  }

  try {
    const img = await fileToImage(file);
    const { width, height } = calculateDimensions(img.width, img.height, opts.maxWidthOrHeight);

    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 绘制图片
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // 确定输出格式（PNG 透明图转 JPEG 会有问题，但为了压缩率，统一用 JPEG）
    const outputType = 'image/jpeg';
    let quality = opts.initialQuality;
    let blob = await canvasToBlob(canvas, outputType, quality);

    // 迭代压缩直到文件大小符合要求
    while (blob.size > maxSizeBytes && quality > opts.minQuality) {
      quality -= opts.qualityStep;
      blob = await canvasToBlob(canvas, outputType, quality);
    }

    // 如果压缩后仍然太大，尝试进一步缩小尺寸
    if (blob.size > maxSizeBytes) {
      let scale = 0.9;
      while (blob.size > maxSizeBytes && scale > 0.3) {
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        blob = await canvasToBlob(canvas, outputType, opts.minQuality);
        scale -= 0.1;
      }
    }

    // 生成新的文件名
    const originalName = file.name;
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const newFileName = `${nameWithoutExt}.jpg`;

    // 创建新的 File 对象
    const compressedFile = new File([blob], newFileName, {
      type: outputType,
      lastModified: Date.now(),
    });

    // 保留原始文件的一些属性（如果需要的话）
    compressedFile._originalSize = file.size;
    compressedFile._compressed = true;

    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 压缩失败时返回原文件
    return file;
  }
}

/**
 * 批量压缩图片
 * @param {File[]} files - 要压缩的图片文件数组
 * @param {Object} options - 压缩选项
 * @param {Function} onProgress - 进度回调 (current, total, file)
 * @returns {Promise<File[]>} - 压缩后的文件数组
 */
export async function compressImages(files, options = {}, onProgress = null) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const compressedFile = await compressImage(file, options);
    results.push(compressedFile);

    if (onProgress) {
      onProgress(i + 1, total, compressedFile);
    }
  }

  return results;
}

/**
 * 格式化文件大小
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default {
  compressImage,
  compressImages,
  formatFileSize,
};

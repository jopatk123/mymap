/**
 * 图片集压缩下载工具
 * 将图片集中的所有图片打包成 ZIP 文件下载
 */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { imageSetApi } from '@/api/image-set.js';

/**
 * 获取图片集的完整数据（包含所有图片）
 * @param {number|string} imageSetId - 图片集 ID
 * @returns {Promise<Object>} - 图片集详情
 */
async function fetchImageSetDetails(imageSetId) {
  const response = await imageSetApi.getImageSet(imageSetId);
  // API 响应拦截器返回的是解包后的对象
  return response?.data || response;
}

/**
 * 从 URL 获取图片 Blob
 * @param {string} url - 图片 URL
 * @returns {Promise<Blob>}
 */
async function fetchImageBlob(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`获取图片失败: ${response.status}`);
  }
  return response.blob();
}

/**
 * 从 URL 中提取文件扩展名
 * @param {string} url - 文件 URL
 * @param {string} defaultExt - 默认扩展名
 * @returns {string}
 */
function getExtensionFromUrl(url, defaultExt = 'jpg') {
  if (!url) return defaultExt;
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : defaultExt;
}

/**
 * 下载图片集为 ZIP 压缩包
 * @param {Object} imageSetData - 图片集数据（至少包含 id 和 title）
 * @param {Function} onProgress - 进度回调 (current, total, message)
 * @returns {Promise<void>}
 */
export async function downloadImageSetAsZip(imageSetData, onProgress = null) {
  const imageSetId = imageSetData.id;
  const title = imageSetData.title || `图片集_${imageSetId}`;

  // 1. 获取图片集详情
  if (onProgress) onProgress(0, 100, '正在获取图片集信息...');
  
  let imageSet;
  try {
    imageSet = await fetchImageSetDetails(imageSetId);
  } catch (error) {
    throw new Error('获取图片集信息失败: ' + error.message);
  }

  const images = imageSet?.images || [];
  if (images.length === 0) {
    throw new Error('图片集中没有图片');
  }

  // 2. 创建 ZIP 文件
  const zip = new JSZip();
  const folder = zip.folder(title);
  const total = images.length;
  let completed = 0;

  // 3. 并发下载所有图片（限制并发数）
  const concurrency = 3;
  const downloadImage = async (image, index) => {
    const imageUrl = image.image_url || image.imageUrl;
    if (!imageUrl) return;

    try {
      const blob = await fetchImageBlob(imageUrl);
      const ext = getExtensionFromUrl(imageUrl);
      const fileName = image.file_name || `image_${index + 1}.${ext}`;
      
      folder.file(fileName, blob);
      completed++;
      
      if (onProgress) {
        const progress = Math.round((completed / total) * 80) + 10; // 10-90%
        onProgress(progress, 100, `正在下载: ${completed}/${total}`);
      }
    } catch (error) {
      console.error(`下载图片失败: ${imageUrl}`, error);
      // 继续下载其他图片
      completed++;
    }
  };

  // 分批并发下载
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    await Promise.all(batch.map((img, idx) => downloadImage(img, i + idx)));
  }

  if (completed === 0) {
    throw new Error('所有图片下载失败');
  }

  // 4. 生成并下载 ZIP 文件
  if (onProgress) onProgress(90, 100, '正在生成压缩包...');
  
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // 5. 触发下载
  const zipFileName = `${title}.zip`;
  saveAs(zipBlob, zipFileName);

  if (onProgress) onProgress(100, 100, '下载完成');
}

/**
 * 检查是否是图片集类型
 * @param {Object} file - 文件对象
 * @returns {boolean}
 */
export function isImageSetFile(file) {
  return file?.fileType === 'image-set' || file?.type === 'image-set';
}

export default {
  downloadImageSetAsZip,
  isImageSetFile,
};

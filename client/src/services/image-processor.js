import {
  isPanoramaImage,
  extractTitleFromFilename,
  extractGPSFromImage,
  compressImageToTargetSize,
  getImageDimensions,
  isImageFile,
} from '@/utils/image-utils.js';

export class ImageProcessor {
  constructor() {
    this.processing = false;
    this.processingText = '';
    this.callbacks = {
      onProcessingChange: null,
      onTextChange: null,
      onError: null,
      onSuccess: null,
    };
  }

  // 设置回调函数
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 更新处理状态
  updateProcessing(processing, text = '') {
    this.processing = processing;
    this.processingText = text;

    if (this.callbacks.onProcessingChange) {
      this.callbacks.onProcessingChange(processing);
    }
    if (this.callbacks.onTextChange) {
      this.callbacks.onTextChange(text);
    }
  }

  // 处理文件
  async processFile(file) {
    this.updateProcessing(true, '正在检查文件...');

    try {
      // 检查是否为图片文件
      if (!isImageFile(file)) {
        throw new Error('请选择图片文件！');
      }

      this.updateProcessing(true, '正在验证全景图格式...');

      // 检查是否为全景图
      const isPanorama = await isPanoramaImage(file);
      if (!isPanorama) {
        throw new Error('请选择全景图！全景图的宽高比应该约为2:1，且尺寸不小于1000x500');
      }

      // 自动设置标题为文件名（不含扩展名）
      const title = extractTitleFromFilename(file.name);

      this.updateProcessing(true, '正在提取GPS坐标...');

      // 尝试从图片中提取GPS坐标
      let gpsData = null;
      try {
        gpsData = await extractGPSFromImage(file);
      } catch (error) {
        console.warn('提取GPS坐标失败:', error);
      }

      this.updateProcessing(true, '正在生成预览...');

      // 生成预览URL
      const previewUrl = await this.generatePreview(file);

      const result = {
        file,
        title,
        gpsData,
        previewUrl,
      };

      this.updateProcessing(false);

      if (this.callbacks.onSuccess) {
        this.callbacks.onSuccess(result);
      }

      return result;
    } catch (error) {
      this.updateProcessing(false);

      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }

      throw error;
    }
  }

  // 生成预览
  generatePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 压缩图片
  async compressImageIfNeeded(
    file,
    maxWidth = 8000,
    maxHeight = 4000,
    quality = 0.85,
    forceReencode = true
  ) {
    try {
      const dimensions = await getImageDimensions(file);

      if (
        dimensions.width > maxWidth ||
        dimensions.height > maxHeight ||
        // 即使不缩放，也可以选择性进行有损重编码（JPEG/WebP）
        forceReencode
      ) {
        // 使用按目标字节多轮压缩的策略，先以给定 quality 进行一次压缩，再根据需要逐步降低 quality，目标为 5MB
        const qualities = Array.from(new Set([quality, 0.75, 0.65, 0.55, 0.45]));
        const targetBytes = 5 * 1024 * 1024; // 5MB
        const compressedFile = await compressImageToTargetSize(
          file,
          maxWidth,
          maxHeight,
          qualities,
          targetBytes
        );
        return {
          file: compressedFile,
          compressed: true,
          originalDimensions: dimensions,
          // 实际新尺寸在前端不易直接得知，这里仅回显目标约束
          newDimensions: {
            width: Math.min(dimensions.width, maxWidth),
            height: Math.min(dimensions.height, maxHeight),
          },
        };
      }

      return {
        file,
        compressed: false,
        originalDimensions: dimensions,
      };
    } catch (error) {
      console.error('压缩图片失败:', error);
      return {
        file,
        compressed: false,
        error: error.message,
      };
    }
  }

  // 验证文件
  async validateFile(file) {
    const errors = [];

    // 检查文件类型
    if (!isImageFile(file)) {
      errors.push('文件类型不正确，请选择图片文件');
    }

    // 检查文件大小
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      errors.push('文件大小不能超过50MB');
    }

    // 检查是否为全景图
    try {
      const isPanorama = await isPanoramaImage(file);
      if (!isPanorama) {
        errors.push('请选择全景图，宽高比应约为2:1');
      }
    } catch (error) {
      errors.push('无法验证图片格式');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // 获取处理状态
  getProcessingStatus() {
    return {
      processing: this.processing,
      processingText: this.processingText,
    };
  }
}

// 创建单例实例
export const imageProcessor = new ImageProcessor();

export default ImageProcessor;

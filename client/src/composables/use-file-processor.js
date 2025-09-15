import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { imageProcessor } from '@/services/image-processor.js';

export function useVideoProcessor() {
  const previewUrl = ref('');

  const processFile = async (file, form) => {
    // 设置文件到表单
    form.file = file;

    // 自动提取文件名作为标题
    if (!form.title && file.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      form.title = nameWithoutExt;
    }

    // 创建预览URL
    if (file) {
      previewUrl.value = URL.createObjectURL(file);
    }

    return { previewUrl: previewUrl.value };
  };

  const validateFile = (file) => {
    // 检查文件对象是否有效
    if (!file || typeof file !== 'object') {
      ElMessage.error('文件对象无效!');
      return false;
    }

    if (!file.type || !file.size) {
      ElMessage.error('文件信息不完整!');
      return false;
    }

    const isVideo = file.type.startsWith('video/');
    const isLt500M = file.size / 1024 / 1024 < 500;

    if (!isVideo) {
      ElMessage.error('只能上传视频文件!');
      return false;
    }
    if (!isLt500M) {
      ElMessage.error('视频大小不能超过 500MB!');
      return false;
    }
    return true;
  };

  const cleanup = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = '';
    }
  };

  return {
    previewUrl,
    processFile,
    validateFile,
    cleanup,
  };
}

export function useKmlProcessor() {
  const validationResult = ref(null);

  // 读取文件内容为文本
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file, 'utf-8');
    });
  };

  // 验证KML内容
  const validateKmlContent = async (content) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        return { valid: false, error: 'XML格式错误' };
      }

      const kmlElement = xmlDoc.getElementsByTagName('kml')[0];
      if (!kmlElement) {
        return { valid: false, error: '不是有效的KML文件' };
      }

      const placemarks = [];
      const placemarkElements = xmlDoc.getElementsByTagName('Placemark');

      for (let i = 0; i < placemarkElements.length; i++) {
        const placemark = placemarkElements[i];
        const name = placemark.getElementsByTagName('name')[0]?.textContent || `地标${i + 1}`;

        const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent;
        if (coordinates) {
          const coords = coordinates.trim().split(/[\s,]+/);
          if (coords.length >= 2) {
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              placemarks.push({ name, latitude: lat, longitude: lng, pointType: 'Point' });
            }
          }
        }
      }

      return {
        valid: true,
        placemarkCount: placemarks.length,
        placemarks: placemarks.slice(0, 10),
      };
    } catch (error) {
      return { valid: false, error: '解析KML文件失败: ' + (error?.message || error) };
    }
  };

  const validateKmlFile = async (file) => {
    try {
      const fileContent = await readFileAsText(file);
      const validation = await validateKmlContent(fileContent);

      validationResult.value = validation;

      if (validation.valid) {
        ElMessage.success(`KML文件验证成功，包含 ${validation.placemarkCount || 0} 个地标`);
      } else {
        ElMessage.error('KML文件格式错误: ' + validation.error);
      }

      return validation;
    } catch (error) {
      const msg = error?.message || error;
      validationResult.value = { valid: false, error: msg };
      ElMessage.error('解析KML文件失败: ' + msg);
      return { valid: false, error: msg };
    }
  };

  const processFile = async (file, form = null) => {
    if (form && !form.title && file?.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      form.title = nameWithoutExt;
    }

    // 验证KML文件并返回结果
    return await validateKmlFile(file);
  };

  const validateFile = (file) => {
    if (!file || typeof file !== 'object') {
      ElMessage.error('文件对象无效!');
      return false;
    }

    if (!file.name || !file.size) {
      ElMessage.error('文件信息不完整!');
      return false;
    }

    const isKml = file.name.toLowerCase().endsWith('.kml');
    const isLt10M = file.size / 1024 / 1024 < 10;

    if (!isKml) {
      ElMessage.error('只能上传KML格式文件!');
      return false;
    }
    if (!isLt10M) {
      ElMessage.error('文件大小不能超过 10MB!');
      return false;
    }
    return true;
  };

  return {
    validationResult,
    processFile,
    validateFile,
  };
}

export function usePanoramaProcessor() {
  const previewUrl = ref('');

  const processFile = async (file, form) => {
    try {
      const result = await imageProcessor.processFile(file);

      // 设置文件到表单
      if (form) {
        form.file = result.file;

        // 自动设置标题（如果表单中没有标题）
        if (!form.title && result.title) {
          form.title = result.title;
        }

        // 设置GPS坐标（如果有的话）
        if (result.gpsData) {
          form.lat = parseFloat(result.gpsData.lat);
          form.lng = parseFloat(result.gpsData.lng);
          ElMessage.success('已自动提取图片中的GPS坐标');
        }
      }

      // 设置预览URL
      previewUrl.value = result.previewUrl;

      return result;
    } catch (_error) {
      // console.error('处理文件失败:', _error);
      ElMessage.error(_error.message);
      throw _error;
    }
  };

  const validateFile = (file) => {
    // 检查文件对象是否有效
    if (!file || typeof file !== 'object') {
      ElMessage.error('文件对象无效!');
      return false;
    }

    if (!file.type || !file.size) {
      ElMessage.error('文件信息不完整!');
      return false;
    }

    const isImage = file.type.startsWith('image/');
    const isLt50M = file.size / 1024 / 1024 < 50;

    if (!isImage) {
      ElMessage.error('只能上传图片文件!');
      return false;
    }
    if (!isLt50M) {
      ElMessage.error('图片大小不能超过 50MB!');
      return false;
    }

    return true;
  };

  return {
    previewUrl,
    processFile,
    validateFile,
  };
}

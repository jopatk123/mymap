// 前端验证工具
export class Validators {
  // 验证坐标
  static validateCoordinate(lat, lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, message: '坐标必须为数字' };
    }

    if (latitude < -90 || latitude > 90) {
      return { valid: false, message: '纬度必须在 -90 到 90 之间' };
    }

    if (longitude < -180 || longitude > 180) {
      return { valid: false, message: '经度必须在 -180 到 180 之间' };
    }

    return { valid: true, latitude, longitude };
  }

  // 验证文件类型
  static validateFileType(file, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']) {
    if (!file) return { valid: false, message: '请选择文件' };

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: `只支持 ${allowedTypes.join(', ')} 格式的文件` };
    }

    return { valid: true };
  }

  // 验证文件大小
  static validateFileSize(file, maxSize = 50 * 1024 * 1024) {
    // 默认50MB
    if (!file) return { valid: false, message: '请选择文件' };

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return { valid: false, message: `文件大小不能超过 ${maxSizeMB}MB` };
    }

    return { valid: true };
  }

  // 验证字符串长度
  static validateStringLength(str, maxLength = 255, minLength = 0) {
    if (typeof str !== 'string') {
      return { valid: false, message: '必须为字符串' };
    }

    if (str.length < minLength) {
      return { valid: false, message: `长度不能少于 ${minLength} 个字符` };
    }

    if (str.length > maxLength) {
      return { valid: false, message: `长度不能超过 ${maxLength} 个字符` };
    }

    return { valid: true, value: str.trim() };
  }

  // 验证必填字段
  static validateRequired(value, fieldName = '字段') {
    if (value === null || value === undefined || value === '') {
      return { valid: false, message: `${fieldName}不能为空` };
    }

    return { valid: true };
  }
}

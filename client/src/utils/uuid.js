// UUID 生成工具函数，提供跨浏览器兼容性
// 支持 crypto.randomUUID() API 以及在不支持的环境下的 fallback

/**
 * 生成 UUID v4
 * 优先使用 crypto.randomUUID()，不支持时使用 fallback 实现
 * @returns {string} UUID 字符串
 */
export function generateUUID() {
  // 检查是否支持 crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID() failed, using fallback:', error);
    }
  }

  // Fallback 实现：使用 Math.random() 生成 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 检查当前环境是否支持 crypto.randomUUID
 * @returns {boolean} 是否支持
 */
export function isCryptoUUIDSupported() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
}

/**
 * 检查当前是否在安全上下文中
 * @returns {boolean} 是否为安全上下文
 */
export function isSecureContext() {
  return typeof window !== 'undefined' && window.isSecureContext;
}

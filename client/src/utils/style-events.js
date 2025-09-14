/**
 * 样式事件管理器
 * 用于管理样式更新事件的监听和触发
 */

// 存储事件监听器
const styleListeners = new Set();
const refreshListeners = new Set();

/**
 * 添加样式更新监听器
 * @param {Function} listener 监听器函数
 */
export function addStyleListener(listener) {
  if (typeof listener === 'function') {
    styleListeners.add(listener);
  }
}

/**
 * 移除样式更新监听器
 * @param {Function} listener 监听器函数
 */
export function removeStyleListener(listener) {
  styleListeners.delete(listener);
}

/**
 * 添加标记刷新监听器
 * @param {Function} listener 监听器函数
 */
export function addRefreshListener(listener) {
  if (typeof listener === 'function') {
    refreshListeners.add(listener);
  }
}

/**
 * 移除标记刷新监听器
 * @param {Function} listener 监听器函数
 */
export function removeRefreshListener(listener) {
  refreshListeners.delete(listener);
}

/**
 * 通知点位样式更新
 * @param {string} type 样式类型 'video' | 'panorama' | 'all'
 * @param {Object} styles 新的样式配置
 */
export function notifyPointStyleUpdate(type, styles) {
  styleListeners.forEach((listener) => {
    try {
      listener(type, styles);
    } catch (error) {
      console.warn('样式监听器执行失败:', error);
    }
  });
}

/**
 * 通知标记需要刷新
 * @param {Object} options 刷新选项
 */
export function notifyMarkersRefresh(options = {}) {
  refreshListeners.forEach((listener) => {
    try {
      listener(options);
    } catch (error) {
      console.warn('刷新监听器执行失败:', error);
    }
  });
}

/**
 * 清除所有监听器
 */
export function clearAllListeners() {
  styleListeners.clear();
  refreshListeners.clear();
}

/**
 * 获取监听器统计信息
 * @returns {Object} 监听器统计
 */
export function getListenerStats() {
  return {
    styleListeners: styleListeners.size,
    refreshListeners: refreshListeners.size,
  };
}

/**
 * 性能优化工具集
 * 用于解决绘制工具在地图缩放时的卡顿问题
 */

import { dlog } from './debug.js';

// 防抖函数
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 优化的样式管理器
 * 缓存样式状态，避免重复的 setStyle 调用
 */
export class StyleManager {
  constructor() {
    this.styleCache = new WeakMap();
    this.isMapInteracting = false;
  }

  // 设置地图交互状态
  setMapInteracting(isInteracting) {
    this.isMapInteracting = isInteracting;
    dlog('[StyleManager] Map interacting:', isInteracting);
  }

  // 优化的设置样式方法
  setStyle(layer, newStyle, force = false) {
    // 如果地图正在交互且不是强制更新，跳过样式更新
    if (this.isMapInteracting && !force) {
      dlog('[StyleManager] Skip style update during map interaction');
      return;
    }

    const currentStyle = this.styleCache.get(layer);
    
    // 检查样式是否有变化
    if (currentStyle && this.stylesEqual(currentStyle, newStyle)) {
      return; // 样式无变化，跳过更新
    }

    // 更新样式
    layer.setStyle(newStyle);
    this.styleCache.set(layer, { ...newStyle });
    dlog('[StyleManager] Style updated for layer');
  }

  // 比较两个样式对象是否相等
  stylesEqual(style1, style2) {
    const keys1 = Object.keys(style1);
    const keys2 = Object.keys(style2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => style1[key] === style2[key]);
  }

  // 清除缓存
  clearCache() {
    this.styleCache = new WeakMap();
  }
}

/**
 * 优化的事件管理器
 * 在地图交互期间暂停某些事件处理
 */
export class EventManager {
  constructor(mapInstance) {
    this.mapInstance = mapInstance;
    this.isMapInteracting = false;
    this.pausedEvents = new Set();
    this.setupMapInteractionDetection();
  }

  // 设置地图交互检测
  setupMapInteractionDetection() {
    if (!this.mapInstance) return;

    // 监听地图缩放开始
    this.mapInstance.on('zoomstart', () => {
      this.setMapInteracting(true);
    });

    // 监听地图缩放结束
    this.mapInstance.on('zoomend', () => {
      this.setMapInteracting(false);
    });

    // 监听地图拖拽开始
    this.mapInstance.on('dragstart', () => {
      this.setMapInteracting(true);
    });

    // 监听地图拖拽结束
    this.mapInstance.on('dragend', () => {
      this.setMapInteracting(false);
    });

    dlog('[EventManager] Map interaction detection setup complete');
  }

  setMapInteracting(isInteracting) {
    this.isMapInteracting = isInteracting;
    dlog('[EventManager] Map interacting:', isInteracting);
  }

  // 创建优化的事件处理器
  createOptimizedHandler(originalHandler, eventType = 'default') {
    return (...args) => {
      // 如果地图正在交互且是可暂停的事件类型，跳过处理
      if (this.isMapInteracting && this.pausedEvents.has(eventType)) {
        dlog(`[EventManager] Skip ${eventType} event during map interaction`);
        return;
      }
      
      return originalHandler(...args);
    };
  }

  // 添加可暂停的事件类型
  addPausableEvent(eventType) {
    this.pausedEvents.add(eventType);
  }

  // 移除可暂停的事件类型
  removePausableEvent(eventType) {
    this.pausedEvents.delete(eventType);
  }
}

// 全局实例
let globalStyleManager = null;
let globalEventManager = null;

export function getStyleManager() {
  if (!globalStyleManager) {
    globalStyleManager = new StyleManager();
  }
  return globalStyleManager;
}

export function getEventManager(mapInstance) {
  if (!globalEventManager && mapInstance) {
    globalEventManager = new EventManager(mapInstance);
    // 默认暂停悬停相关事件
    globalEventManager.addPausableEvent('mouseover');
    globalEventManager.addPausableEvent('mouseout');
  }
  return globalEventManager;
}

export function resetPerformanceManagers() {
  globalStyleManager = null;
  globalEventManager = null;
}
/**
 * marker-refresh.js
 *
 * 改进点：
 * - 避免对全局 `window.allPoints` 的强依赖，支持将点数组通过参数传入
 * - 去掉固定的 setTimeout 时序 hack，支持同步或异步的 addPointMarkers
 * - 保持向后兼容：仍会在 window 上暴露实例与方法（但不依赖它们）
 */

let mapInstanceData = null;

/**
 * 注册地图实例（应该包含 clearMarkers 和 addPointMarkers 方法）
 * 保持向后兼容：会尝试写入 window._markerRefreshMapInstance
 */
export function setMapInstance(data) {
  mapInstanceData = data;
  try {
    if (typeof window !== 'undefined') {
      window._markerRefreshMapInstance = mapInstanceData;
    }
  } catch (e) {
    // noop
  }
}

/**
 * 占位：保留原 API（可扩展）
 */
export function setMarkersData(/* markers */) {
  // intentionally no-op; prefer passing points into refreshAllMarkers
}

/**
 * 刷新所有标注
 * @param {Array} [points] - 可选的点数组，若未提供将回退到 window.allPoints（向后兼容）
 * @param {Object} [options]
 * @param {boolean} [options.exposeGlobal=true] - 是否在 window 上暴露 refreshAllMarkers（兼容旧代码）
 * @returns {Promise<boolean>} 成功返回 true，失败返回 false
 */
export async function refreshAllMarkers(points = null, options = {}) {
  const { exposeGlobal = true } = options;

  if (
    !mapInstanceData ||
    typeof mapInstanceData.clearMarkers !== 'function' ||
    typeof mapInstanceData.addPointMarkers !== 'function'
  ) {
    return false;
  }

  try {
    mapInstanceData.clearMarkers();
  } catch (err) {
    try {
      console.warn('[marker-refresh] clearMarkers failed', err);
    } catch (e) {
      /* noop */
    }
  }

  // 优先使用显式提供的 points，未提供时回退到 window.allPoints（兼容旧代码）
  let currentPoints = Array.isArray(points) ? points : null;
  if (!currentPoints) {
    if (typeof window !== 'undefined' && Array.isArray(window.allPoints)) {
      currentPoints = window.allPoints;
    } else {
      currentPoints = [];
    }
  }

  if (currentPoints.length === 0) {
    try {
      console.debug &&
        console.debug(
          '[marker-refresh] refreshAllMarkers: no points to add, cleared existing markers'
        );
    } catch (e) {
      /* noop */
    }
    return true;
  }

  try {
    // 支持同步或返回 Promise 的 addPointMarkers
    const maybePromise = mapInstanceData.addPointMarkers(currentPoints);
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise;
    }
    return true;
  } catch (err) {
    try {
      console.warn('[marker-refresh] addPointMarkers failed', err);
    } catch (e) {
      /* noop */
    }
    return false;
  } finally {
    if (exposeGlobal && typeof window !== 'undefined') {
      try {
        window.refreshAllMarkers = refreshAllMarkers;
      } catch (e) {
        /* noop */
      }
    }
  }
}

// 向后兼容：默认将方法暴露到 window（可以通过 options.exposeGlobal 取消）
if (typeof window !== 'undefined') {
  try {
    window.refreshAllMarkers = refreshAllMarkers;
  } catch (e) {
    /* noop */
  }
}

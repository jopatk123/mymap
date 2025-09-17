import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';
import { createPointMarker } from '@/utils/map-utils.js';

// 管理视口裁剪逻辑（空间网格、差异更新、事件绑定）
export function createViewportClipping(map, clusterManager, markers, onMarkerClick) {
  const state = {
    enabled: false,
    bufferPad: 0.2,
    minZoom: 0,
    sourcePoints: [],
    renderedIds: new Set(),
    throttleTimer: null,
    updateIntervalMs: 200,
    coordCache: new Map(), // id -> [lng,lat]
    idToMarker: new Map(), // id -> { marker, type }
    onMoveEnd: null,
    onZoomEnd: null,
    onZoomStart: null,
    isZooming: false,
    prevInterval: null,
    spatialIndex: new Map(),
    cellSizeDeg: 0.05,
    buildIndexScheduled: false,
  };

  // Inline worker for building spatial index off the main thread (PoC)
  let indexWorker = null;
  const ensureIndexWorker = () => {
    if (indexWorker) return indexWorker;
    try {
      const workerCode = `
      self.onmessage = function(e) {
        const msg = e.data;
        if (!msg || msg.type !== 'buildIndex') return;
        const points = msg.points || [];
        const cellSize = msg.cellSizeDeg || 0.05;
        const index = Object.create(null);
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          try {
            const coords = p && p.wgs84_lng != null && p.wgs84_lat != null ? [p.wgs84_lng, p.wgs84_lat] : (p && p.coordinates ? (Array.isArray(p.coordinates) ? p.coordinates : null) : null);
            if (!coords) continue;
            const lng = coords[0]; const lat = coords[1];
            if (!isFinite(lng) || !isFinite(lat)) continue;
            const x = Math.floor(lng / cellSize);
            const y = Math.floor(lat / cellSize);
            const key = x + ':' + y;
            if (!index[key]) index[key] = [];
            index[key].push(p);
          } catch (err) { /* skip bad point */ }
        }
        self.postMessage({ type: 'indexBuilt', index });
      };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      indexWorker = new Worker(URL.createObjectURL(blob));
      indexWorker.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === 'indexBuilt') {
          try {
            // convert received plain object to Map for existing code compatibility
            state.spatialIndex = new Map(Object.entries(msg.index || {}));
            // debug logging removed
          } catch (err) {
            try {
              console.warn('Failed to apply spatial index from worker', err);
            } catch {}
          }
        }
      };
      indexWorker.onerror = (err) => {
        try {
          console.warn('Index worker error', err);
        } catch {}
      };
      return indexWorker;
    } catch (err) {
      try {
        console.warn('Failed to create index worker', err);
      } catch {}
      indexWorker = null;
      return null;
    }
  };

  const getPaneNameByType = (type) => (type === 'video' ? 'videoPane' : 'panoramaPane');

  const scheduleViewportUpdate = () => {
    if (state.throttleTimer) return;
    state.throttleTimer = setTimeout(() => {
      state.throttleTimer = null;
      updateViewportRendering();
    }, state.updateIntervalMs);
  };

  const getCellKey = (lng, lat) => {
    const size = state.cellSizeDeg;
    return `${Math.floor(lng / size)}:${Math.floor(lat / size)}`;
  };

  const buildSpatialIndex = () => {
    // 优先使用 worker 进行索引构建
    const worker = ensureIndexWorker();
    adjustCellSizeByZoom();
    if (worker) {
      try {
        // worker 接收原始点数组；为避免 circular 引用，传送最小字段
        const payloadPoints = state.sourcePoints.map((p) => ({
          id: p.id,
          wgs84_lng: p.wgs84_lng,
          wgs84_lat: p.wgs84_lat,
          coordinates: p.coordinates,
        }));
        worker.postMessage({
          type: 'buildIndex',
          points: payloadPoints,
          cellSizeDeg: state.cellSizeDeg,
        });
        return;
      } catch (err) {
        try {
          console.warn(
            '[Map] index worker postMessage failed, falling back to main-thread build',
            err
          );
        } catch {}
      }
    }

    // fallback: 同步构建（原实现）
    state.spatialIndex.clear();
    for (const p of state.sourcePoints) {
      let coords = state.coordCache.get(p.id);
      if (!coords) {
        coords = getDisplayCoordinates(p);
        if (coords) state.coordCache.set(p.id, coords);
      }
      if (!coords) continue;
      const [lng, lat] = coords;
      if (!isFinite(lat) || !isFinite(lng)) continue;
      const key = getCellKey(lng, lat);
      let bucket = state.spatialIndex.get(key);
      if (!bucket) {
        bucket = [];
        state.spatialIndex.set(key, bucket);
      }
      bucket.push(p);
    }
    // debug logging removed
  };

  // 根据当前地图缩放级别自适应 cellSizeDeg
  const adjustCellSizeByZoom = () => {
    try {
      const z = typeof map.value.getZoom === 'function' ? map.value.getZoom() : null;
      if (typeof z !== 'number' || isNaN(z)) return;
      // 经验映射：缩放越小（更远），cell 更大；缩放越大（更近），cell 更精细
      let newSize = 0.05;
      if (z <= 6) newSize = 1.0;
      else if (z <= 9) newSize = 0.5;
      else if (z <= 12) newSize = 0.1;
      else if (z <= 15) newSize = 0.05;
      else newSize = 0.02;
      if (Math.abs(newSize - state.cellSizeDeg) > 1e-9) {
        state.cellSizeDeg = newSize;
        // debug logging removed
      }
    } catch {}
  };

  const getCandidatesByBounds = (west, south, east, north) => {
    const size = state.cellSizeDeg;
    const minX = Math.floor(west / size);
    const maxX = Math.floor(east / size);
    const minY = Math.floor(south / size);
    const maxY = Math.floor(north / size);
    const out = [];
    const seen = new Set();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const bucket = state.spatialIndex.get(`${x}:${y}`);
        if (!bucket || bucket.length === 0) continue;
        for (const p of bucket) {
          if (!seen.has(p.id)) {
            out.push(p);
            seen.add(p.id);
          }
        }
      }
    }
    return out;
  };

  const getPaddedBounds = () => {
    const b = map.value.getBounds();
    try {
      const z = typeof map.value.getZoom === 'function' ? map.value.getZoom() : null;
      let pad = state.bufferPad;
      if (typeof z === 'number') {
        if (z <= 8) pad = Math.min(pad, 0.05);
        else if (z <= 12) pad = Math.min(pad, 0.1);
      }
      return b.pad(pad);
    } catch {
      return b;
    }
  };

  const createMarkerInfo = (point) => {
    if (!map.value) return null;
    let coordinates = state.coordCache.get(point.id);
    if (!coordinates) {
      coordinates = getDisplayCoordinates(point);
      if (coordinates) state.coordCache.set(point.id, coordinates);
    }
    if (!coordinates) return null;
    const [displayLng, displayLat] = coordinates;
    const pointType = point.type || 'panorama';
    const paneName = getPaneNameByType(pointType);
    const marker = createPointMarker(
      [displayLat, displayLng],
      pointType,
      {
        title: point.title || (pointType === 'video' ? '视频点位' : '全景图'),
        updateWhenZoom: false,
        pane: paneName,
      },
      point.styleConfig || null
    );
    marker.on('click', () => onMarkerClick.value(point));
    return { id: point.id, marker, type: pointType, data: point };
  };

  const updateViewportRendering = () => {
    if (!map.value || !state.enabled || !state.sourcePoints?.length) return;
    const bounds = getPaddedBounds();
    const sw = bounds?._southWest;
    const ne = bounds?._northEast;
    if (!sw || !ne) return;
    const south = sw.lat,
      west = sw.lng,
      north = ne.lat,
      east = ne.lng;

    const toAdd = [];
    const currentInBounds = new Set();
    const candidates = getCandidatesByBounds(west, south, east, north);
    // debug logging removed
    for (const p of candidates) {
      let coords = state.coordCache.get(p.id);
      if (!coords) {
        coords = getDisplayCoordinates(p);
        if (coords) state.coordCache.set(p.id, coords);
      }
      if (!coords) continue;
      const [lng, lat] = coords;
      if (lat >= south && lat <= north && lng >= west && lng <= east) {
        currentInBounds.add(p.id);
        if (!state.renderedIds.has(p.id)) toAdd.push(p);
      }
    }

    const toRemove = [];
    state.renderedIds.forEach((id) => {
      if (!currentInBounds.has(id)) toRemove.push(id);
    });
    // debug logging removed

    if (toRemove.length) {
      // debug logging removed
      removeMarkersBatch(toRemove);
      toRemove.forEach((id) => state.renderedIds.delete(id));
    }
    if (toAdd.length) {
      const createBatch = [];
      for (const p of toAdd) {
        const info = createMarkerInfo(p);
        if (info) createBatch.push(info);
      }
      // debug logging removed

      if (createBatch.length) {
        const videoBatch = [];
        const panoBatch = [];
        const normalBatch = [];
        const videoStyles = window.videoPointStyles || {};
        const panoStyles = window.panoramaPointStyles || {};
        const videoClusterOn = Boolean(videoStyles.cluster_enabled);
        const panoClusterOn = Boolean(panoStyles.cluster_enabled);

        for (const info of createBatch) {
          markers.value.push(info);
          state.idToMarker.set(info.id, { marker: info.marker, type: info.type });
          if (!window.currentMarkers) window.currentMarkers = [];
          window.currentMarkers.push(info);
          if (info.type === 'video' && videoClusterOn) videoBatch.push(info.marker);
          else if (info.type === 'panorama' && panoClusterOn) panoBatch.push(info.marker);
          else normalBatch.push(info.marker);
          state.renderedIds.add(info.id);
        }
        // debug logging removed

        if (videoBatch.length) {
          const g = clusterManager.ensureClusterGroup('video');
          g.addLayers(videoBatch);
          clusterManager.ensureZoomGuards();
        }
        if (panoBatch.length) {
          const g = clusterManager.ensureClusterGroup('panorama');
          g.addLayers(panoBatch);
          clusterManager.ensureZoomGuards();
        }
        if (normalBatch.length) {
          for (const m of normalBatch) m.addTo(map.value);
        }
        // debug logging removed
      }
    }
  };

  const removeMarkersBatch = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const videoToRemove = [];
    const panoToRemove = [];
    const normalToRemove = [];
    for (const id of ids) {
      const info = state.idToMarker.get(id);
      if (!info) continue;
      const { marker, type } = info;
      const styles =
        type === 'video' ? window.videoPointStyles || {} : window.panoramaPointStyles || {};
      const useCluster = Boolean(styles.cluster_enabled);
      if (useCluster) {
        if (type === 'video') videoToRemove.push(marker);
        else panoToRemove.push(marker);
      } else normalToRemove.push(marker);
      state.idToMarker.delete(id);
      const idx = markers.value.findIndex((m) => m.id === id);
      if (idx > -1) markers.value.splice(idx, 1);
      if (window.currentMarkers)
        window.currentMarkers = window.currentMarkers.filter((m) => m.id !== id);
    }
    if (videoToRemove.length && clusterManager.videoClusterGroup)
      clusterManager.videoClusterGroup.removeLayers(videoToRemove);
    if (panoToRemove.length && clusterManager.panoramaClusterGroup)
      clusterManager.panoramaClusterGroup.removeLayers(panoToRemove);
    if (normalToRemove.length) {
      for (const m of normalToRemove) {
        try {
          if (m && m._map && map.value) map.value.removeLayer(m);
        } catch {}
      }
    }
  };

  const enable = (points, options = {}) => {
    if (!map.value) return;
    state.enabled = true;
    state.bufferPad = options.bufferPad ?? state.bufferPad;
    state.minZoom = options.minZoom ?? state.minZoom;
    state.sourcePoints = points || [];
    state.renderedIds.clear();
    state.coordCache.clear();
    state.spatialIndex.clear();
    state.cellSizeDeg = options.cellSizeDeg ?? state.cellSizeDeg;
    // debug logging removed

    if (!state.buildIndexScheduled) {
      state.buildIndexScheduled = true;
      setTimeout(() => {
        try {
          buildSpatialIndex();
        } finally {
          state.buildIndexScheduled = false;
        }
      }, 0);
    }

    state.onZoomStart = () => {
      state.isZooming = true;
      state.prevInterval = state.updateIntervalMs;
      state.updateIntervalMs = Math.max(state.updateIntervalMs, 300);
    };
    state.onMoveEnd = () => {
      if (!state.isZooming) scheduleViewportUpdate();
    };
    state.onZoomEnd = () => {
      state.isZooming = false;
      if (state.prevInterval != null) {
        state.updateIntervalMs = state.prevInterval;
        state.prevInterval = null;
      }
      // 缩放结束后根据新缩放级别调整栅格大小并重建索引
      adjustCellSizeByZoom();
      if (!state.buildIndexScheduled) {
        state.buildIndexScheduled = true;
        setTimeout(() => {
          try {
            buildSpatialIndex();
          } finally {
            state.buildIndexScheduled = false;
          }
        }, 0);
      }
      scheduleViewportUpdate();
    };
    map.value.on('zoomstart', state.onZoomStart);
    map.value.on('moveend', state.onMoveEnd);
    map.value.on('zoomend', state.onZoomEnd);
    scheduleViewportUpdate();
  };

  const disable = () => {
    state.enabled = false;
    state.sourcePoints = [];
    if (state.onMoveEnd) map.value?.off('moveend', state.onMoveEnd);
    if (state.onZoomEnd) map.value?.off('zoomend', state.onZoomEnd);
    if (state.onZoomStart) map.value?.off('zoomstart', state.onZoomStart);
    state.onMoveEnd = state.onZoomEnd = state.onZoomStart = null;
    state.renderedIds.clear();
    state.coordCache.clear();
    state.idToMarker.clear();
    state.spatialIndex.clear();
    // debug logging removed
  };

  return {
    state,
    enable,
    disable,
    scheduleViewportUpdate,
    updateViewportRendering,
    removeMarkersBatch,
  };
}

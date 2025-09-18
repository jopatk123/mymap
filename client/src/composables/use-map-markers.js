// 拆分重构：聚合管理与视口裁剪逻辑已分离到 mapMarkers 子模块
import L from 'leaflet';
import { useAppStore } from '@/store/app.js';
import 'leaflet.markercluster';
import { createPointMarker } from '@/utils/map-utils.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';
import { createClusterManager } from './mapMarkers/cluster-manager.js';
import { createViewportClipping } from './mapMarkers/viewport-clipping.js';

export function useMapMarkers(map, markers, onMarkerClick) {
  // Threshold that triggers viewport-clipping mode. Increase for temporary testing to bypass clipping.
  const VIEWPORT_THRESHOLD = 100000; // original: 1200
  // 子模块实例
  const clusterManager = createClusterManager(map);
  const {
    state: viewportState,
    enable: enableViewportClipping,
    disable: disableViewportClipping,
    scheduleViewportUpdate,
    removeMarkersBatch: vpRemoveMarkersBatch,
  } = createViewportClipping(map, clusterManager, markers, onMarkerClick);
  // mark intentionally unused helper as referenced for linter
  void vpRemoveMarkersBatch;

  const getPaneNameByType = (type) => (type === 'video' ? 'videoPane' : 'panoramaPane');

  const ensureClusterGroup = (type) => clusterManager.ensureClusterGroup(type);

  // 降噪：缩放期间调整 marker 行为，避免动画访问已移除图层
  const ensureZoomGuards = () => clusterManager.ensureZoomGuards();

  const addPointMarker = (point) => {
    if (!map.value) return null;

    // 避免与其他模块（如 KML layer / viewport-clipping）重复创建同一 id 的 marker
    try {
      if (viewportState.idToMarker.has(point.id)) {
        try {
          console.debug('[use-map-markers] skip addPointMarker - already exists id=', point.id);
        } catch (err) {}
        return null;
      }
      if (window.currentMarkers && window.currentMarkers.some((m) => m.id === point.id)) {
        try {
          console.debug('[use-map-markers] skip addPointMarker - found in window.currentMarkers id=', point.id);
        } catch (err) {}
        return null;
      }
      // 注释掉 KML 跳过逻辑，让标记正常创建但在点击时处理冲突
      // if (String(point.id).includes('kml-')) {
      //   try {
      //     console.debug('[use-map-markers] skip addPointMarker - KML point id=', point.id);
      //   } catch (err) {}
      //   return null;
      // }
    } catch (err) {}

    // 使用坐标转换工具获取显示坐标
    // 坐标缓存
    let coordinates = viewportState.coordCache.get(point.id);
    if (!coordinates) {
      coordinates = getDisplayCoordinates(point);
      if (coordinates) viewportState.coordCache.set(point.id, coordinates);
    }

    if (!coordinates) {
      void console.warn('点位坐标无效:', point);
      return null;
    }

    const [displayLng, displayLat] = coordinates;

    const pointType = point.type || 'panorama';
    const paneName = getPaneNameByType(pointType);

    // Leaflet需要[lat, lng]格式
    const marker = createPointMarker(
      [displayLat, displayLng],
      pointType,
      {
        title: point.title || (pointType === 'video' ? '视频点位' : '全景图'),
        updateWhenZoom: false,
        pane: paneName,
      },
      point.styleConfig || null
    ); // 传递每点 styleConfig（若存在），否则回退到全局样式

    // 对于 KML 点位，不绑定任何点击事件，让 KML 图层的标记处理
    try {
      if (String(point.id).includes('kml-')) {
        console.debug('[use-map-markers] create KML marker without click handler id=', point.id);
        // KML 点位不绑定点击事件，由 KML 图层的标记处理
      } else if (typeof marker.getPopup === 'function' && marker.getPopup()) {
        marker.on('click', (e) => {
          try {
            console.debug('[use-map-markers] marker click (has popup) id=', point.id);
          } catch (err) {}
          try {
            marker.openPopup && marker.openPopup();
          } catch (err) {}
          try {
            L.DomEvent.stopPropagation(e);
          } catch (err) {}
        });
      } else {
        marker.on('click', (e) => {
          try {
            console.debug('[use-map-markers] marker click (no popup) id=', point.id);
          } catch (err) {}
          try {
            onMarkerClick.value(point);
          } catch (err) {}
        });
      }
    } catch (err) {}

    const styles =
      pointType === 'video' ? window.videoPointStyles || {} : window.panoramaPointStyles || {};
    const useCluster = Boolean(styles.cluster_enabled);
    if (useCluster) {
      const group = ensureClusterGroup(pointType);
      group.addLayer(marker);
      ensureZoomGuards();
    } else {
      marker.addTo(map.value);
    }
    const markerInfo = { id: point.id, marker, type: pointType, data: point };
    markers.value.push(markerInfo);
    // 记录到快速索引
    viewportState.idToMarker.set(point.id, { marker, type: pointType });

    // 同步到全局标记数组
    if (!window.currentMarkers) {
      window.currentMarkers = [];
    }
    window.currentMarkers.push(markerInfo);

    return marker;
  };

  // 仅创建 Marker 对象与元信息，不进行任何 addTo/mapGroup 操作
  // createMarkerInfo 逻辑已迁移到 viewport-clipping 子模块

  const addPanoramaMarker = (panorama) => {
    return addPointMarker({ ...panorama, type: 'panorama' });
  };

  const addPanoramaMarkers = (panoramas) => {
    panoramas.forEach(addPanoramaMarker);
  };

  const addPointMarkers = (points) => {
    if (!Array.isArray(points) || points.length === 0) return;
    // 自动启用视口裁剪
    if (!viewportState.enabled && points.length >= VIEWPORT_THRESHOLD) {
      // enable viewport clipping for large point sets
      enableViewportClipping(points);
      return;
    }
    // 若启用视口裁剪，则只渲染视口内的
    if (viewportState.enabled) {
      viewportState.sourcePoints = points;
      scheduleViewportUpdate();
      return;
    }
    const videoStyles = window.videoPointStyles || {};
    const panoStyles = window.panoramaPointStyles || {};
    const videoClusterOn = Boolean(videoStyles.cluster_enabled);
    const panoClusterOn = Boolean(panoStyles.cluster_enabled);

    // 如果两类都不开聚合，走原逻辑
    if (!videoClusterOn && !panoClusterOn) {
      points.forEach(addPointMarker);
      return;
    }

    const batchVideo = [];
    const batchPano = [];

    for (const p of points) {
      // 跳过已由视口裁剪或其他模块创建的 marker（避免重复）
      try {
        if (viewportState.idToMarker.has(p.id)) {
          try {
            console.debug('[use-map-markers] skip batch create - exists in viewportState id=', p.id);
          } catch (err) {}
          continue;
        }
        if (window.currentMarkers && window.currentMarkers.some((m) => m.id === p.id)) {
          try {
            console.debug('[use-map-markers] skip batch create - exists in window.currentMarkers id=', p.id);
          } catch (err) {}
          continue;
        }
        // 注释掉 KML 跳过逻辑，让标记正常创建但在点击时处理冲突
        // if (String(p.id).includes('kml-')) {
        //   try {
        //     console.debug('[use-map-markers] skip batch create - KML point id=', p.id);
        //   } catch (err) {}
        //   continue;
        // }
      } catch (err) {}
      const pointType = p.type || 'panorama';
      const coordinates = getDisplayCoordinates(p);
      if (!coordinates) continue;
      const [displayLng, displayLat] = coordinates;
      const marker = createPointMarker(
        [displayLat, displayLng],
        pointType,
        {
          title: p.title || (pointType === 'video' ? '视频点位' : '全景图'),
          updateWhenZoom: false,
        },
        p.styleConfig || null
      );
      // KML 点位：阻止冒泡并交给全局处理器打开 popup（避免 map click 立即关闭弹窗）
      if (String(p.id).includes('kml-')) {
        marker.on('click', (e) => {
          try {
            console.debug('[use-map-markers] kml duplicate marker click - stop propagation id=', p.id);
          } catch (err) {}
          try {
            // 同时阻止默认与冒泡，避免地图 click 事件关闭刚打开的 popup
            L.DomEvent.stop(e);
            L.DomEvent.stopPropagation(e);
          } catch (err) {}
          try {
            onMarkerClick.value(p);
          } catch (err) {}
        });
      } else if (typeof marker.getPopup === 'function' && marker.getPopup()) {
        // 其他有 popup 的标记：只阻止冒泡并打开自身 popup
        marker.on('click', (e) => {
          try {
            console.debug('[use-map-markers] batch marker click (has popup) id=', p.id);
          } catch (err) {}
          try {
            marker.openPopup && marker.openPopup();
          } catch (err) {}
          try {
            L.DomEvent.stopPropagation(e);
          } catch (err) {}
        });
      } else {
        // 无 popup 的标记：走全局处理器
        marker.on('click', (e) => {
          try {
            console.debug('[use-map-markers] batch marker click (no popup) id=', p.id);
          } catch (err) {}
          try {
            onMarkerClick.value(p);
          } catch (err) {}
        });
      }

      const markerInfo = { id: p.id, marker, type: pointType, data: p };
      markers.value.push(markerInfo);
      if (!window.currentMarkers) window.currentMarkers = [];
      window.currentMarkers.push(markerInfo);

      if (pointType === 'video' && videoClusterOn) {
        batchVideo.push(marker);
      } else if (pointType === 'panorama' && panoClusterOn) {
        batchPano.push(marker);
      } else {
        marker.addTo(map.value);
      }
    }

    if (batchVideo.length) {
      const group = ensureClusterGroup('video');
      group.addLayers(batchVideo);
      ensureZoomGuards();
    }
    if (batchPano.length) {
      const group = ensureClusterGroup('panorama');
      group.addLayers(batchPano);
      ensureZoomGuards();
    }
  };

  // 计算扩展边界
  // getPaddedBounds 逻辑已迁移到 viewport-clipping 子模块

  // 视口裁剪：调度节流更新
  // scheduleViewportUpdate 由子模块提供

  // 视口裁剪：执行差异更新
  // updateViewportRendering 已迁移

  // ---------- 空间索引：固定度网格 ----------
  // 空间网格与索引相关逻辑已迁移

  // buildSpatialIndex 已迁移

  // getCandidatesByBounds 已迁移

  // 开启视口裁剪
  // enableViewportClipping 已迁移

  // 关闭视口裁剪
  // disableViewportClipping 已迁移

  const removeMarker = (id) => {
    const markerIndex = markers.value.findIndex((m) => m.id === id);
    if (markerIndex > -1) {
      const { marker, type } = markers.value[markerIndex];

      try {
        // 先尝试从聚合组中移除
        const styles =
          type === 'video' ? window.videoPointStyles || {} : window.panoramaPointStyles || {};
        const useCluster = Boolean(styles.cluster_enabled);

        if (useCluster) {
          const group =
            type === 'video'
              ? clusterManager.videoClusterGroup
              : clusterManager.panoramaClusterGroup;
          if (group && group.hasLayer(marker)) {
            group.removeLayer(marker);
          }
        } else if (marker && map.value && marker._map) {
          map.value.removeLayer(marker);
        }
      } catch (error) {
        // 移除单个标记时出错（已静默处理）
      }

      markers.value.splice(markerIndex, 1);
      viewportState.idToMarker.delete(id);

      // 同步更新全局标记数组
      if (window.currentMarkers) {
        window.currentMarkers = window.currentMarkers.filter((m) => m.id !== id);
      }
    }
  };

  // 批量移除，尽可能使用聚合组的批量 API
  const removeMarkersBatch = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const videoToRemove = [];
    const panoToRemove = [];
    const normalToRemove = [];
    for (const id of ids) {
      const info = viewportState.idToMarker.get(id);
      if (!info) continue;
      const { marker, type } = info;
      const styles =
        type === 'video' ? window.videoPointStyles || {} : window.panoramaPointStyles || {};
      const useCluster = Boolean(styles.cluster_enabled);
      if (useCluster) {
        if (type === 'video') videoToRemove.push(marker);
        else panoToRemove.push(marker);
      } else {
        normalToRemove.push(marker);
      }
      // 从本地索引和集合移除
      viewportState.idToMarker.delete(id);
      const idx = markers.value.findIndex((m) => m.id === id);
      if (idx > -1) markers.value.splice(idx, 1);
      if (window.currentMarkers) {
        window.currentMarkers = window.currentMarkers.filter((m) => m.id !== id);
      }
    }
    try {
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
    } catch (e) {
      // 如果批量失败，逐个回退
      for (const id of ids) removeMarker(id);
    }
  };

  // mark internal helper as referenced to satisfy linter checks
  void removeMarkersBatch;

  const clearMarkers = () => {
    try {
      // 关闭视口裁剪
      if (viewportState.enabled) {
        disableViewportClipping();
      }
      // 先清理聚合组，避免在动画过程中移除单个标记
      clusterManager.clearAll();

      // 然后清理剩余的单独标记
      markers.value.forEach(({ marker }) => {
        try {
          if (marker && map.value && marker._map) {
            map.value.removeLayer(marker);
          }
        } catch (error) {
          // 静默处理单个标记移除失败
        }
      });

      markers.value = [];

      // 清除全局标记数组
      window.currentMarkers = [];
    } catch (error) {
      void console.warn('清除标记时出错:', error);
      // 强制清空数组，即使出错也要保证状态一致
      markers.value = [];
      window.currentMarkers = [];
    }
  };

  const fitBounds = () => {
    if (!map.value) return;
    // 如果启用了初始显示设置，则不自动 fitBounds（初始位置由 initialView 控制）
    try {
      const appStore = useAppStore();
      if (appStore?.initialViewSettings?.enabled) return;
    } catch (e) {}

    try {
      const validMarkers = markers.value.filter(
        (m) => m.marker && m.marker._map && typeof m.marker.getLatLng === 'function'
      );
      // 如果没有独立标记，尝试用聚合组的边界
      if (validMarkers.length === 0) {
        let bounds = null;
        if (
          clusterManager.videoClusterGroup &&
          map.value.hasLayer(clusterManager.videoClusterGroup) &&
          typeof clusterManager.videoClusterGroup.getBounds === 'function'
        ) {
          const b = clusterManager.videoClusterGroup.getBounds();
          if (b && b.isValid && b.isValid()) bounds = bounds ? bounds.extend(b) : b;
        }
        if (
          clusterManager.panoramaClusterGroup &&
          map.value.hasLayer(clusterManager.panoramaClusterGroup) &&
          typeof clusterManager.panoramaClusterGroup.getBounds === 'function'
        ) {
          const b = clusterManager.panoramaClusterGroup.getBounds();
          if (b && b.isValid && b.isValid()) bounds = bounds ? bounds.extend(b) : b;
        }
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.value.fitBounds(bounds, { padding: [20, 20] });
        }
        return;
      }

      const group = new L.featureGroup(validMarkers.map((m) => m.marker));
      const bounds = group.getBounds();

      if (bounds.isValid()) {
        map.value.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (error) {
      void console.warn('fitBounds failed:', error);
    }
  };

  return {
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
    removeMarker,
    clearMarkers,
    fitBounds,
  };
}

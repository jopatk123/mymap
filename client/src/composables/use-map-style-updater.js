import { ref, watch } from 'vue';
import { createPointMarker } from '@/utils/map-utils.js';

/**
 * 地图样式更新管理器
 * 用于在样式配置更新后重新创建地图标记
 */
export function useMapStyleUpdater(map, markers) {
  const isUpdating = ref(false);
  // watch is imported for potential future use; mark as referenced to satisfy linter
  void watch;

  /**
   * 更新所有标记的样式
   * @param {Array} pointsData 点位数据数组
   */
  const updateAllMarkerStyles = async (pointsData = []) => {
    if (!map.value || isUpdating.value) return;

    isUpdating.value = true;

    try {
      // 保存当前标记的数据
      const currentMarkerData = markers.value.map((markerInfo) => ({
        id: markerInfo.id,
        type: markerInfo.type,
        data: markerInfo.data || {},
      }));

      // 清除所有现有标记
      markers.value.forEach(({ marker }) => {
        if (marker && map.value) {
          map.value.removeLayer(marker);
        }
      });
      markers.value.length = 0;

      // 使用新样式重新创建标记
      const recreatePromises = currentMarkerData.map(async (markerInfo) => {
        try {
          // 从pointsData中找到对应的完整数据，如果没有则使用保存的数据
          const pointData = pointsData.find((p) => p.id === markerInfo.id) || markerInfo.data;

          if (!pointData || !pointData.lat || !pointData.lng) {
            void console.warn('标记数据不完整，跳过重建:', markerInfo.id);
            return;
          }

          // 获取坐标信息
          let displayLat = pointData.lat || pointData.latitude;
          let displayLng = pointData.lng || pointData.longitude;

          // 优先使用GCJ02坐标
          if (pointData.gcj02Lat && pointData.gcj02Lng) {
            displayLat = pointData.gcj02Lat;
            displayLng = pointData.gcj02Lng;
          } else if (pointData.gcj02_lat && pointData.gcj02_lng) {
            displayLat = pointData.gcj02_lat;
            displayLng = pointData.gcj02_lng;
          }

          // 检查坐标是否有效
          if (displayLat == null || displayLng == null || isNaN(displayLat) || isNaN(displayLng)) {
            void console.warn('点位坐标无效，跳过重建:', pointData);
            return;
          }

          const pointType = pointData.type || markerInfo.type || 'panorama';
          const paneName =
            pointType === 'video'
              ? 'videoPane'
              : pointType === 'image-set'
              ? 'imageSetPane'
              : 'panoramaPane';

          // 使用最新样式创建标记，优先使用点级 styleConfig（例如来自 KML 的 styleConfig）
          const marker = createPointMarker(
            [displayLat, displayLng],
            pointType,
            {
              title: pointData.title || (pointType === 'video' ? '视频点位' : '全景图'),
              pane: paneName,
            },
            pointData.styleConfig || markerInfo.data?.styleConfig || null
          );

          // 重新绑定点击事件
          if (window.mapMarkerClickHandler) {
            marker.on('click', () => {
              window.mapMarkerClickHandler(pointData);
            });
          }

          marker.addTo(map.value);
          markers.value.push({
            id: markerInfo.id,
            marker,
            type: pointType,
            data: pointData,
          });
        } catch (error) {
          void console.warn('重建标记失败:', markerInfo.id, error);
        }
      });

      await Promise.all(recreatePromises);

      // 成功信息改为调试级别，开发模式下可查看
      // debug: 成功更新标记样式 (suppressed)
    } catch (error) {
      void console.error('更新标记样式失败:', error);
    } finally {
      isUpdating.value = false;
    }
  };

  /**
   * 更新指定类型标记的样式
   * @param {string} type 标记类型 'video' | 'panorama'
   * @param {Array} pointsData 点位数据数组
   */
  const updateMarkerStylesByType = async (type, pointsData = []) => {
    if (!map.value || isUpdating.value) return;

    isUpdating.value = true;

    try {
      // 找到指定类型的标记
      const typeMarkers = markers.value.filter((m) => m.type === type);

      // 移除这些标记
      typeMarkers.forEach(({ marker }) => {
        if (marker && map.value) {
          map.value.removeLayer(marker);
        }
      });

      // 从markers数组中移除
      markers.value = markers.value.filter((m) => m.type !== type);

      // 重新创建指定类型的标记
      const typePointsData = pointsData.filter((p) => p.type === type);

      for (const pointData of typePointsData) {
        try {
          // 获取坐标信息
          let displayLat = pointData.lat || pointData.latitude;
          let displayLng = pointData.lng || pointData.longitude;

          // 优先使用GCJ02坐标
          if (pointData.gcj02Lat && pointData.gcj02Lng) {
            displayLat = pointData.gcj02Lat;
            displayLng = pointData.gcj02Lng;
          } else if (pointData.gcj02_lat && pointData.gcj02_lng) {
            displayLat = pointData.gcj02_lat;
            displayLng = pointData.gcj02_lng;
          }

          // 检查坐标是否有效
          if (displayLat == null || displayLng == null || isNaN(displayLat) || isNaN(displayLng)) {
            void console.warn('点位坐标无效，跳过重建:', pointData);
            continue;
          }

          // 使用最新样式创建标记，传入点级 styleConfig
          const paneName =
            type === 'video' ? 'videoPane' : type === 'image-set' ? 'imageSetPane' : 'panoramaPane';
          const marker = createPointMarker(
            [displayLat, displayLng],
            type,
            {
              title: pointData.title || (type === 'video' ? '视频点位' : '全景图'),
              pane: paneName,
            },
            pointData.styleConfig || null
          );

          // 重新绑定点击事件
          if (window.mapMarkerClickHandler) {
            marker.on('click', () => {
              window.mapMarkerClickHandler(pointData);
            });
          }

          marker.addTo(map.value);
          markers.value.push({
            id: pointData.id,
            marker,
            type: type,
            data: pointData,
          });
        } catch (error) {
          void console.warn('重建标记失败:', pointData.id, error);
        }
      }

      // 成功信息改为调试级别，开发模式下可查看
      // debug: 成功更新特定类型标记样式 (suppressed)
    } catch (error) {
      void console.error(`更新 ${type} 标记样式失败:`, error);
    } finally {
      isUpdating.value = false;
    }
  };

  return {
    isUpdating,
    updateAllMarkerStyles,
    updateMarkerStylesByType,
  };
}

import { ElMessage } from 'element-plus';
import { usePanoramaStore } from '@/store/panorama.js';
import { useAppStore } from '@/store/app.js';
import { getDisplayCoordinates } from '@/utils/coordinate-transform.js';
import { createPopupContent } from '@/composables/kml-point-renderer.js';

/**
 * 地图交互组合函数
 * 处理地图上的各种交互操作，包括点位选择、上传成功处理等
 */
export function useMapInteractions(
  mapRef,
  selectedPanorama,
  showPanoramaModal,
  visiblePanoramas,
  currentPanorama,
  selectedVideo,
  showVideoModal,
  showPanoramaViewer,
  openPanoramaViewer,
  selectedImageSet = { value: null },
  showImageSetViewer = { value: false }
) {
  const panoramaStore = usePanoramaStore();
  const appStore = useAppStore();

  // 处理点位标记点击（区分全景图和视频点位）
  const handlePanoramaClick = async (point) => {
    // 根据点位类型判断是全景图、视频或 KML 点位
    if (point.type === 'kml') {
      // 尝试为 KML 点位打开与普通 KML 相同的弹窗内容（若可生成）
      try {
        // 组织 feature-like 对象以复用 createPopupContent
        // 构建与 kml-point-renderer 一致的 feature 结构，并携带原始 WGS84 坐标
        const wgsLat =
          point.latitude != null
            ? Number(point.latitude)
            : point.lat != null
            ? Number(point.lat)
            : null;
        const wgsLng =
          point.longitude != null
            ? Number(point.longitude)
            : point.lng != null
            ? Number(point.lng)
            : null;
        const feature = {
          type: 'Feature',
          properties: {
            name: point.title || point.name || '',
            description: point.description || '',
            // kml-point-renderer 依赖的字段，用于在弹窗显示 WGS84 和生成外链
            ...(wgsLat != null && wgsLng != null ? { wgs84_lat: wgsLat, wgs84_lng: wgsLng } : {}),
          },
          geometry: {
            type: 'Point',
            // geometry 使用 [lng, lat]
            coordinates: [wgsLng, wgsLat],
          },
        };

        // 从全局 KML 文件列表中尝试找到来源文件（若存在）
        const kmlFiles =
          typeof window !== 'undefined' && window.allKmlFiles ? window.allKmlFiles : [];
        const kmlFile = kmlFiles.find(
          (f) => f.id === point.fileId || f.id === point.file_id || f.name === point.sourceFile
        ) || { title: '' };

        const popupContent = createPopupContent(feature, kmlFile);

        // 尝试在已存在的 marker 上打开 popup
        const currentMarkers =
          typeof window !== 'undefined' && window.currentMarkers ? window.currentMarkers : [];
        const markerInfo = currentMarkers.find(
          (m) =>
            m && m.data && (m.data.id === point.id || m.data._id === point.id || m.data === point)
        );
        if (markerInfo && markerInfo.marker) {
          try {
            markerInfo.marker.bindPopup(popupContent).openPopup();
            return;
          } catch (e) {
            /* fallback to map popup */
          }
        }

        // 回退：在地图指定坐标处打开 popup
        const mapInstance = typeof window !== 'undefined' ? window.mapInstance : null;
        if (mapInstance && (point.lat || point.latitude) && (point.lng || point.longitude)) {
          const L =
            typeof window !== 'undefined' && window.L
              ? window.L
              : (await import('leaflet')).default;
          L.popup()
            .setLatLng([point.lat || point.latitude, point.lng || point.longitude])
            .setContent(popupContent)
            .openOn(mapInstance);
          return;
        }
      } catch (err) {
        console.warn('打开 KML 点弹窗失败，回退为信息提示', err);
      }

      // 最后回退行为：提示用户查看 KML 管理
      ElMessage.info('此为 KML 底图点位，详情请在KML管理中查看');
      return;
    }

    if (point.type === 'video' || point.videoUrl || point.video_url) {
      // 视频点位 - 直接打开视频播放器
      selectedVideo.value = point;
      showVideoModal.value = true;
    } else if (point.type === 'image-set' || point.imageCount !== undefined) {
      // 图片集点位 - 直接打开图片集查看器
      selectedImageSet.value = point;
      showImageSetViewer.value = true;
    } else {
      // 全景图点位 - 直接打开全景图查看器
      selectedPanorama.value = point;
      panoramaStore.setCurrentPanorama(point);
      // 直接打开全景图查看器，不显示信息模态框
      viewPanorama(point);
    }
  };

  // 处理地图点击
  const handleMapClick = (_latlng) => {
    // 可以在这里添加新增全景图的逻辑
    // _latlng intentionally unused for now
    void _latlng;
  };

  // 选择全景图
  const selectPanorama = (panorama) => {
    selectedPanorama.value = panorama;
    panoramaStore.setCurrentPanorama(panorama);

    // 地图定位到该点位（统一转换为适配高德瓦片的显示坐标）
    if (mapRef.value) {
      const coords = getDisplayCoordinates(panorama);
      if (coords) {
        const [displayLng, displayLat] = coords;
        mapRef.value.setCenter(displayLat, displayLng, 16);
      }
    }
  };

  // 查看全景图 - 直接打开全景图查看器
  const viewPanorama = (panorama) => {
    if (panorama?.type === 'image-set' || panorama?.imageCount !== undefined) {
      selectedImageSet.value = panorama;
      showImageSetViewer.value = true;
      return;
    }

    selectedPanorama.value = panorama;
    panoramaStore.setCurrentPanorama(panorama);
    showPanoramaViewer.value = true;
    openPanoramaViewer(panorama);
  };

  // 查看视频 - 打开视频播放器
  const viewVideo = (video) => {
    selectedVideo.value = video;
    showVideoModal.value = true;
  };

  // 定位到全景图
  const locatePanorama = (panorama) => {
    // 隐藏点位列表然后定位到指定点位
    try {
      appStore.setPanoramaListVisible(false);
    } catch (e) {
      // 若 store 方法不可用则静默失败
      void e;
    }

    if (mapRef.value) {
      const coords = getDisplayCoordinates(panorama);
      if (coords) {
        const [displayLng, displayLat] = coords;
        mapRef.value.setCenter(displayLat, displayLng, 18);
      }
    }
  };

  // 搜索处理
  const handleSearch = async (params) => {
    if (params.keyword?.trim()) {
      panoramaStore.setSearchParams(params);
      await panoramaStore.fetchPanoramas();
    } else {
      // 清空搜索时不加载全部，直接清空列表以节省流量
      panoramaStore.clearSearchParams();
      panoramaStore.setPanoramas([]);
    }
  };

  // 切换侧边栏
  const toggleSidebar = () => {
    appStore.toggleSidebar();
  };

  // 切换全景图列表显示/隐藏
  const togglePanoramaList = () => {
    appStore.togglePanoramaList();
  };

  // 上传成功处理
  const handleUploadSuccess = async () => {
    try {
      // 重新加载所有点位数据
      const { pointsApi } = await import('@/api/points.js');
      const pageSize = 10000;
      const firstResponse = await pointsApi.getAllPoints({
        page: 1,
        pageSize,
        respectFolderVisibility: true,
      });

      if (!firstResponse || !firstResponse.data) {
        throw new Error('获取点位数据失败');
      }

      const firstData = Array.isArray(firstResponse.data) ? firstResponse.data : [];
      const pagination = firstResponse.pagination || {};
      const total = Number(pagination.total) || firstData.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      const responses = [];
      for (let page = 2; page <= totalPages; page += 1) {
        responses.push(
          pointsApi.getAllPoints({
            page,
            pageSize,
            respectFolderVisibility: true,
          })
        );
      }

      const restResponses = responses.length > 0 ? await Promise.all(responses) : [];
      const allPoints = [
        ...firstData,
        ...restResponses.flatMap((resp) => (Array.isArray(resp?.data) ? resp.data : [])),
      ];

      // 过滤有效的点位数据
      const filteredPoints = allPoints.filter((point) => {
        // 排除KML文件
        if (point.type === 'kml') return false;

        // 确保有有效的坐标
        const lat = point.lat || point.latitude;
        const lng = point.lng || point.longitude;
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      });

      // 同时更新两个数据源，确保数据一致性
      // 保留当前任何由 KML 选区合并到地图的点（window.kmlSelectedPoints）和 basePoints
      try {
        const base = Array.isArray(window.basePoints) ? window.basePoints : [];
        const kmlSel = Array.isArray(window.kmlSelectedPoints) ? window.kmlSelectedPoints : [];
        // filteredPoints 是来自服务端的非 KML 点，优先使用 filteredPoints 覆盖 base
        window.basePoints = filteredPoints;
        window.allPoints = [...filteredPoints, ...kmlSel];
        // base is intentionally captured for debugging/compatibility; mark as used
        void base;
      } catch (err) {
        window.allPoints = filteredPoints;
      }
      // 不将全量点位写入 panoramaStore（侧边栏列表），仅更新总数
      // 侧边栏通过搜索按需加载
      panoramaStore.setPanoramas([]);
      panoramaStore.setPagination({
        page: 1,
        pageSize: 20,
        total: filteredPoints.length,
      });

      ElMessage.success('上传成功');
    } catch (error) {
      // console.error('更新数据失败:', error)
      ElMessage.error('刷新数据失败');
    }
  };

  // 处理全景图删除
  const handlePanoramaDeleted = async (deletedId) => {
    try {
      // 从store中移除已删除的全景图
      await panoramaStore.deletePanoramaAsync(deletedId);

      // 同步移除 window.allPoints 中的对应点位
      if (typeof window !== 'undefined' && Array.isArray(window.allPoints)) {
        window.allPoints = window.allPoints.filter((p) => p.id !== deletedId);
      }
      if (typeof window !== 'undefined' && Array.isArray(window.basePoints)) {
        window.basePoints = window.basePoints.filter((p) => p.id !== deletedId);
      }

      // 重新加载地图标记（从 window.allPoints）
      if (mapRef.value) {
        mapRef.value.clearMarkers();
        const points = (typeof window !== 'undefined' && window.allPoints) || [];
        mapRef.value.addPointMarkers(points);
      }

      // 清空选择状态
      if (currentPanorama.value?.id === deletedId) {
        panoramaStore.setCurrentPanorama(null);
      }
      if (selectedPanorama.value?.id === deletedId) {
        selectedPanorama.value = null;
      }

      ElMessage.success('全景图已从地图中移除');
    } catch (error) {
      // console.error('删除全景图后更新失败:', error)
      ElMessage.error('更新失败，请刷新页面');
    }
  };

  return {
    handlePanoramaClick,
    handleMapClick,
    selectPanorama,
    viewPanorama,
    viewVideo,
    locatePanorama,
    handleSearch,

    toggleSidebar,
    togglePanoramaList,
    handleUploadSuccess,
    handlePanoramaDeleted,
  };
}

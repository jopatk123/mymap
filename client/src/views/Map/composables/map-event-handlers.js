import { ElMessage } from 'element-plus';
import { kmlApi } from '@/api/kml.js';

export function useMapEventHandlers(
  mapRef,
  kmlLayersVisible,
  loadAllPointStyles,
  videoPointStyles,
  panoramaPointStyles,
  loadInitialData
) {
  // 处理文件夹可见性变化
  const handleFolderVisibilityChanged = async () => {
    await loadInitialData();

    // 重新加载数据后，如果KML图层应该显示，则重新加载KML图层
    setTimeout(() => {
      if (mapRef.value && kmlLayersVisible.value) {
        mapRef.value.clearKmlLayers();
        if (window.allKmlFiles && window.allKmlFiles.length > 0) {
          mapRef.value.addKmlLayers(window.allKmlFiles);
        }
      }
    }, 600);
  };

  // 处理KML样式更新
  const handleKmlStylesUpdated = async () => {
    if (!mapRef.value || !kmlLayersVisible.value) return;

    try {
      // 获取最新的KML文件数据
      const kmlResponse = await kmlApi.getKmlFiles({ respectFolderVisibility: true });
      const kmlFiles = kmlResponse.data || [];

      // 获取每个文件的样式配置
      for (const file of kmlFiles) {
        try {
          const styleResponse = await kmlApi.getKmlFileStyles(file.id);
          file.styleConfig = styleResponse.data;
        } catch (error) {
          file.styleConfig = null;
        }
      }

      // 更新全局变量并重新加载图层
      window.allKmlFiles = kmlFiles;
      mapRef.value.clearKmlLayers();
      mapRef.value.addKmlLayers(kmlFiles);
    } catch (error) {
      console.error('更新KML样式失败:', error);
      ElMessage.error('更新KML样式失败');
    }
  };

  // 处理点位样式更新
  const handlePointStylesUpdated = async () => {
    try {
      // 重新加载点位样式配置
      await loadAllPointStyles();

      // 更新全局变量
      window.videoPointStyles = videoPointStyles.value;
      window.panoramaPointStyles = panoramaPointStyles.value;

      // 重新加载数据
      await loadInitialData();
      ElMessage.success('点位样式已更新');
    } catch (error) {
      console.error('更新点位样式失败:', error);
      ElMessage.error('应用点位样式失败');
    }
  };

  return {
    handleFolderVisibilityChanged,
    handleKmlStylesUpdated,
    handlePointStylesUpdated,
  };
}

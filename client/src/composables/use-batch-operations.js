import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePanoramaStore } from '@/store/panorama.js';
import { videoApi } from '@/api/video.js';
import { kmlApi } from '@/api/kml.js';
import * as panoramaApi from '@/api/panorama.js';

export function useBatchOperations() {
  const panoramaStore = usePanoramaStore();
  const selectedRows = ref([]);
  const moving = ref(false);

  // 删除单个全景图
  const deletePanorama = async (panorama, onSuccess) => {
    try {
      await ElMessageBox.confirm(`确定要删除全景图"${panorama.title}"吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await panoramaStore.deletePanoramaAsync(panorama.id);
      ElMessage.success({ message: '删除成功', duration: 1000 });
      onSuccess?.();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error({ message: '删除失败: ' + error.message, duration: 1000 });
      }
    }
  };

  // 切换全景图可见性
  const togglePanoramaVisibility = async (panorama, onSuccess) => {
    try {
      await panoramaStore.updatePanoramaVisibility(panorama.id, !panorama.is_visible);
      ElMessage.success({ message: `全景图已${panorama.is_visible ? '隐藏' : '显示'}`, duration: 1000 });
      onSuccess?.();
    } catch (error) {
      ElMessage.error({ message: '更新可见性失败: ' + error.message, duration: 1000 });
    }
  };

  // 批量更新可见性
  const batchUpdateVisibility = async (selectedRows, isVisible, onSuccess) => {
    try {
      await ElMessageBox.confirm(
        `确定要${isVisible ? '显示' : '隐藏'}选中的 ${selectedRows.length} 个文件吗？`,
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      // 按文件类型分组
      const panoramas = selectedRows
        .filter((row) => row.fileType === 'panorama')
        .map((row) => row.id);
      const videos = selectedRows.filter((row) => row.fileType === 'video').map((row) => row.id);
      const kmls = selectedRows.filter((row) => row.fileType === 'kml').map((row) => row.id);

      const updatePromises = [];

      if (panoramas.length > 0) {
        updatePromises.push(panoramaApi.batchUpdatePanoramaVisibility(panoramas, isVisible));
      }
      if (videos.length > 0) {
        updatePromises.push(videoApi.batchUpdateVideoPointsVisibility(videos, isVisible));
      }
      if (kmls.length > 0) {
        updatePromises.push(kmlApi.batchUpdateKmlFileVisibility(kmls, isVisible));
      }

      const results = await Promise.allSettled(updatePromises);
      const failedUpdates = results.filter((result) => result.status === 'rejected');

      if (failedUpdates.length > 0) {
        ElMessage.error({ message: '部分文件更新可见性失败', duration: 1000 });
        console.error('更新失败详情:', failedUpdates);
      } else {
        ElMessage.success({ message: `批量${isVisible ? '显示' : '隐藏'}成功`, duration: 1000 });
      }

      onSuccess?.();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error({ message: `批量${isVisible ? '显示' : '隐藏'}失败: ` + error.message, duration: 1000 });
      }
    }
  };

  // 批量删除
  const batchDelete = async (selectedRows, onSuccess) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedRows.length} 个文件吗？`,
        '确认批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      // 按文件类型分组
      const panoramas = selectedRows
        .filter((row) => row.fileType === 'panorama')
        .map((row) => row.id);
      const videos = selectedRows.filter((row) => row.fileType === 'video').map((row) => row.id);
      const kmls = selectedRows.filter((row) => row.fileType === 'kml').map((row) => row.id);

      const deletePromises = [];

      if (panoramas.length > 0) {
        deletePromises.push(panoramaApi.batchDeletePanoramas(panoramas));
      }
      if (videos.length > 0) {
        deletePromises.push(videoApi.batchDeleteVideoPoints(videos));
      }
      if (kmls.length > 0) {
        deletePromises.push(kmlApi.batchDeleteKmlFiles(kmls));
      }

      const results = await Promise.allSettled(deletePromises);
      const failedDeletes = results.filter((result) => result.status === 'rejected');

      if (failedDeletes.length > 0) {
        ElMessage.error({ message: '部分文件删除失败', duration: 1000 });
        console.error('删除失败详情:', failedDeletes);
      } else {
        ElMessage.success({ message: '批量删除成功', duration: 1000 });
      }

      onSuccess?.();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error({ message: '批量删除失败: ' + error.message, duration: 1000 });
      }
    }
  };

  // 批量移动文件到文件夹
  const moveFilesToFolder = async (selectedRows, targetFolderId, onSuccess) => {
    try {
      moving.value = true;

      // 按文件类型分组
      const panoramas = selectedRows
        .filter((row) => row.fileType === 'panorama')
        .map((row) => row.id);
      const videos = selectedRows.filter((row) => row.fileType === 'video').map((row) => row.id);
      const kmls = selectedRows.filter((row) => row.fileType === 'kml').map((row) => row.id);

      const movePromises = [];

      if (panoramas.length > 0) {
        movePromises.push(panoramaApi.batchMovePanoramasToFolder(panoramas, targetFolderId));
      }
      if (videos.length > 0) {
        movePromises.push(videoApi.batchMoveVideoPointsToFolder(videos, targetFolderId));
      }
      if (kmls.length > 0) {
        movePromises.push(kmlApi.batchMoveKmlFilesToFolder(kmls, targetFolderId));
      }

      const results = await Promise.allSettled(movePromises);
      const failedMoves = results.filter((result) => result.status === 'rejected');

      if (failedMoves.length > 0) {
        ElMessage.error({ message: '部分文件移动失败', duration: 1000 });
        console.error('移动失败详情:', failedMoves);
      } else {
        ElMessage.success({ message: '移动成功', duration: 1000 });
      }

      onSuccess?.();
    } catch (error) {
      ElMessage.error({ message: '移动失败: ' + error.message, duration: 1000 });
    } finally {
      moving.value = false;
    }
  };

  // 选择变化处理
  const handleSelectionChange = (selection) => {
    selectedRows.value = selection;
  };

  // 批量操作处理
  const handleBatchAction = async (command, onSuccess) => {
    switch (command) {
      case 'move':
        // 移动操作由调用方处理
        break;
      case 'show':
        await batchUpdateVisibility(selectedRows.value, true, onSuccess);
        break;
      case 'hide':
        await batchUpdateVisibility(selectedRows.value, false, onSuccess);
        break;
      case 'delete':
        await batchDelete(selectedRows.value, onSuccess);
        break;
    }
  };

  return {
    selectedRows,
    moving,
    handleSelectionChange,
    handleBatchAction,
    deletePanorama,
    togglePanoramaVisibility,
    batchUpdateVisibility,
    batchDelete,
    moveFilesToFolder,
  };
}

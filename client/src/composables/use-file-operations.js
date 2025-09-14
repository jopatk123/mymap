import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { deletePanorama, batchMovePanoramasToFolder } from '@/api/panorama.js';
import { videoApi } from '@/api/video.js';
import { kmlApi } from '@/api/kml.js';

export function useFileOperations() {
  // 当前操作的文件
  const currentFile = ref(null);

  // 对话框状态
  const dialogStates = reactive({
    showEditDialog: false,
    showViewDialog: false,
    showMoveDialog: false,
  });

  // 移动相关状态
  const moveToFolderId = ref(null);
  const movingFiles = ref([]);
  const moving = ref(false);

  // 查看文件
  const viewFile = (file) => {
    currentFile.value = file;
    dialogStates.showViewDialog = true;
  };

  // 编辑文件
  const editFile = (file) => {
    currentFile.value = file;
    dialogStates.showEditDialog = true;
  };

  // 删除文件
  const deleteFile = async (file, onSuccess) => {
    try {
      // debug: 准备删除文件 (suppressed)

      await ElMessageBox.confirm(`确定要删除${file.displayType}"${file.title}"吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });

      // debug: 用户确认删除，开始调用API (suppressed)

      // 根据文件类型调用相应的删除API
      let req;
      switch (file.fileType) {
        case 'panorama':
          // debug: 调用全景图删除API (suppressed)
          req = deletePanorama(file.id);
          break;
        case 'video':
          // debug: 调用视频删除API (suppressed)
          req = videoApi.deleteVideoPoint(file.id);
          break;
        case 'kml':
          // debug: 调用KML删除API (suppressed)
          req = kmlApi.deleteKmlFile(file.id);
          break;
        default:
          throw new Error('未知文件类型');
      }

      const result = await req;
      // debug: 删除API调用成功 (suppressed)

      ElMessage.success('删除成功');

      // debug: 准备调用 onSuccess (suppressed)
      if (onSuccess) {
        await onSuccess();
        // debug: onSuccess 回调已执行 (suppressed)
      } else {
        // debug: onSuccess 回调未提供 (suppressed)
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除失败:', error);
        ElMessage.error('删除失败: ' + error.message);
      }
    }
  };

  // 移动确认
  const handleMoveConfirm = async (onSuccess) => {
    if (!movingFiles.value || movingFiles.value.length === 0) {
      ElMessage.warning('没有选择要移动的文件');
      return;
    }

    try {
      moving.value = true;

      // 按文件类型分组
      const panoramas = movingFiles.value
        .filter((row) => row.fileType === 'panorama')
        .map((row) => row.id);
      const videos = movingFiles.value
        .filter((row) => row.fileType === 'video')
        .map((row) => row.id);
      const kmls = movingFiles.value.filter((row) => row.fileType === 'kml').map((row) => row.id);

      // 如果moveToFolderId是0，则表示根目录，应设为null
      const targetFolderId = moveToFolderId.value === 0 ? null : moveToFolderId.value;

      const movePromises = [];

      if (panoramas.length > 0) {
        movePromises.push(batchMovePanoramasToFolder(panoramas, targetFolderId));
      }
      if (videos.length > 0) {
        movePromises.push(videoApi.batchMoveVideoPointsToFolder(videos, targetFolderId));
      }
      if (kmls.length > 0) {
        movePromises.push(kmlApi.batchMoveKmlFilesToFolder(kmls, targetFolderId));
      }

      if (movePromises.length === 0) {
        ElMessage.info('没有需要移动的文件');
        return;
      }

      const results = await Promise.allSettled(movePromises);
      const failedMoves = results.filter((result) => result.status === 'rejected');

      if (failedMoves.length > 0) {
        ElMessage.error('部分文件移动失败');
        // 记录失败详情到控制台以便开发调试（仅在调试时查看）
        // console.error('移动失败详情:', failedMoves);
      } else {
        ElMessage.success('移动成功');
      }

      dialogStates.showMoveDialog = false;
      moveToFolderId.value = null;
      movingFiles.value = [];
      onSuccess?.();
    } catch (error) {
      ElMessage.error('移动失败: ' + error.message);
    } finally {
      moving.value = false;
    }
  };

  // 处理文件删除成功
  const handleFileDeleted = async (onSuccess) => {
    try {
      dialogStates.showViewDialog = false;
      ElMessage.success('文件已从列表中移除');
      onSuccess?.();
    } catch (error) {
      // console.error('删除文件后更新失败:', error);
      ElMessage.error('更新失败，请刷新页面');
    }
  };

  // 图片加载错误处理
  const handleImageError = (event) => {
    event.target.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA2MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjRjVGNUY1Ii8+CjxyZWN0IHg9IjIwIiB5PSI4IiB3aWR0aD0iMjAiIGhlaWdodD0iMTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0NDQ0NDQyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuaWh+S7tjwvdGV4dD4KPHN2Zz4K';
  };

  return {
    // 数据
    currentFile,
    dialogStates,
    moveToFolderId,
    movingFiles,
    moving,

    // 方法
    viewFile,
    editFile,
    deleteFile,
    handleMoveConfirm,
    handleFileDeleted,
    handleImageError,
  };
}

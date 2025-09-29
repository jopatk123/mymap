import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { deletePanorama as deletePanoramaAPI } from '@/api/panorama.js';

export function usePanoramaModal() {
  const visible = ref(false);
  const viewerVisible = ref(false);
  const autoRotating = ref(false);

  // 处理模态框关闭
  const handleClose = () => {
    visible.value = false;
    if (viewerVisible.value) {
      closeViewer();
    }
  };

  // 关闭全景图查看器
  const closeViewer = () => {
    viewerVisible.value = false;
    autoRotating.value = false;
  };

  // 复制坐标
  const copyCoordinate = async (panorama) => {
    if (!panorama) return;

    const coordinate = `${parseFloat(panorama.lng).toFixed(6)},${parseFloat(panorama.lat).toFixed(
      6
    )}`;

    try {
      await navigator.clipboard.writeText(coordinate);
      ElMessage.success('坐标已复制到剪贴板');
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = coordinate;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      ElMessage.success('坐标已复制到剪贴板');
    }
  };

  // 在新窗口打开全景图查看器
  const openInNewTab = (panorama) => {
    if (!panorama?.id) {
      ElMessage.error('全景图ID不存在');
      return;
    }

    if (!panorama?.imageUrl) {
      ElMessage.error('全景图地址不存在，无法打开');
      return;
    }

    // 创建全景图查看页面URL，使用路径参数方式
    const viewerUrl = `/panorama/${panorama.id}`;
    window.open(viewerUrl, '_blank');
  };

  // 删除全景图
  const deletePanorama = async (panorama) => {
    if (!panorama?.id) {
      ElMessage.error('全景图ID不存在');
      return false;
    }

    try {
      await ElMessageBox.confirm(
        '确定要删除这个全景图吗？此操作将永久删除该点位及其所有信息，且无法恢复。',
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
          center: true,
          confirmButtonClass: 'el-button--danger',
        }
      );

      // 用户确认删除
      await callDeletePanoramaAPI(panorama.id);

      ElMessage.success('全景图删除成功');
      return true;
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除全景图失败:', error);
        ElMessage.error('删除失败，请稍后重试');
      }
      return false;
    }
  };

  // 调用API删除全景图
  const callDeletePanoramaAPI = async (id) => {
    const response = await deletePanoramaAPI(id);
    // 检查响应结构：成功时返回 { success: true, message: "删除成功" }
    if (!response.success) {
      throw new Error(response.message || '删除失败');
    }
  };

  return {
    // 状态
    visible,
    viewerVisible,
    autoRotating,

    // 方法
    handleClose,
    closeViewer,
    copyCoordinate,
    openInNewTab,
    deletePanorama,
  };
}

import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useVideoModal() {
  const visible = ref(false)

  // 显示模态框
  const show = (video) => {
    visible.value = true
  }

  // 关闭模态框
  const handleClose = () => {
    visible.value = false
  }

  // 复制坐标
  const copyCoordinate = (video) => {
    if (!video?.lat || !video?.lng) {
      ElMessage.warning('坐标信息不完整')
      return
    }

    const coordinate = `${video.lat}, ${video.lng}`
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(coordinate).then(() => {
        ElMessage.success('坐标已复制到剪贴板')
      }).catch(() => {
        fallbackCopyText(coordinate)
      })
    } else {
      fallbackCopyText(coordinate)
    }
  }

  // 备用复制方法
  const fallbackCopyText = (text) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      ElMessage.success('坐标已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(textArea)
    }
  }

  // 在新标签页打开视频
  const openInNewTab = (video) => {
    if (!video?.videoUrl) {
      ElMessage.warning('视频链接不可用')
      return
    }

    try {
      window.open(video.videoUrl, '_blank')
    } catch (error) {
      console.error('打开新标签页失败:', error)
      ElMessage.error('无法打开新标签页')
    }
  }

  return {
    visible,
    show,
    handleClose,
    copyCoordinate,
    openInNewTab
  }
}
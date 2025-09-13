<!-- 交互管理器组件 - 管理所有弹窗和菜单 -->
<template>
  <div class="interactive-manager">
    <!-- 导出对话框 -->
    <ExportDialog v-model="showExportDialog" />
    
    <!-- 点位交互组件 -->
    <PointInfoPopup
      :visible="showPointPopup"
      :point="selectedPoint"
      :trigger-ref="popupTriggerRef"
      @close="closePointPopup"
      @edit-properties="openPointProperties"
      @delete-point="deletePoint"
    />
    
    <PointContextMenu
      :visible="showPointContextMenu"
      :position="contextMenuPosition"
      @close="closePointContextMenu"
      @edit-properties="openPointProperties"
      @delete-point="deletePoint"
    />
    
    <PointPropertiesDialog
      v-model="showPointPropertiesDialog"
      :point="selectedPoint"
      @save="savePointProperties"
    />
    
    <!-- 线段交互组件 -->
    <LineInfoPopup
      :visible="showLinePopup"
      :line="selectedLine"
      :trigger-ref="popupTriggerRef"
      @close="closeLinePopup"
      @edit-properties="openLineProperties"
      @delete-line="deleteLine"
    />
    
    <LineContextMenu
      :visible="showLineContextMenu"
      :position="contextMenuPosition"
      @close="closeLineContextMenu"
      @edit-properties="openLineProperties"
      @delete-line="deleteLine"
    />
    
    <LinePropertiesDialog
      v-model="showLinePropertiesDialog"
      :line="selectedLine"
      @save="saveLineProperties"
    />
    
    <!-- 面积交互组件 -->
    <PolygonInfoPopup
      :visible="showPolygonPopup"
      :polygon="selectedPolygon"
      :trigger-ref="popupTriggerRef"
      @close="closePolygonPopup"
      @edit-properties="openPolygonProperties"
      @delete-polygon="deletePolygon"
    />
    
    <PolygonContextMenu
      :visible="showPolygonContextMenu"
      :position="contextMenuPosition"
      @close="closePolygonContextMenu"
      @edit-properties="openPolygonProperties"
      @delete-polygon="deletePolygon"
    />
    
    <PolygonPropertiesDialog
      v-model="showPolygonPropertiesDialog"
      :polygon="selectedPolygon"
      @save="savePolygonProperties"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExportDialog from './ExportDialog.vue'

// 点位组件
import PointInfoPopup from './PointInfoPopup.vue'
import PointContextMenu from './PointContextMenu.vue'
import PointPropertiesDialog from './PointPropertiesDialog.vue'

// 线段组件
import LineInfoPopup from './LineInfoPopup.vue'
import LineContextMenu from './LineContextMenu.vue'
import LinePropertiesDialog from './LinePropertiesDialog.vue'

// 面积组件
import PolygonInfoPopup from './PolygonInfoPopup.vue'
import PolygonContextMenu from './PolygonContextMenu.vue'
import PolygonPropertiesDialog from './PolygonPropertiesDialog.vue'

// 工具函数导入
import { createPointIcon } from '@/composables/drawing-tools/tools/point.js'
import { updateLineStyle } from '@/composables/drawing-tools/tools/line.js'
import { updatePolygonStyle } from '@/composables/drawing-tools/tools/polygon.js'

const props = defineProps({
  mapInstance: {
    type: Object,
    default: null
  },
  drawings: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['show-export-dialog'])

// 通用状态
const showExportDialog = ref(false)
const popupTriggerRef = ref(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

// 点位状态
const showPointPopup = ref(false)
const showPointContextMenu = ref(false)
const showPointPropertiesDialog = ref(false)
const selectedPoint = ref(null)

// 线段状态
const showLinePopup = ref(false)
const showLineContextMenu = ref(false)
const showLinePropertiesDialog = ref(false)
const selectedLine = ref(null)

// 面积状态  
const showPolygonPopup = ref(false)
const showPolygonContextMenu = ref(false)
const showPolygonPropertiesDialog = ref(false)
const selectedPolygon = ref(null)

// 点位方法
const closePointPopup = () => {
  showPointPopup.value = false
  selectedPoint.value = null
  popupTriggerRef.value = null
}

const closePointContextMenu = () => {
  showPointContextMenu.value = false
  selectedPoint.value = null
}

const openPointProperties = () => {
  closePointPopup()
  closePointContextMenu()
  showPointPropertiesDialog.value = true
}

const deletePoint = async () => {
  if (!selectedPoint.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除点位"${selectedPoint.value.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    // 从地图上移除标记
    if (selectedPoint.value.marker) {
      props.mapInstance.drawingLayerGroup.removeLayer(selectedPoint.value.marker)
    }
    
    // 从绘图数组中移除
    const index = props.drawings.findIndex(d => d.id === selectedPoint.value.id)
    if (index !== -1) {
      props.drawings.splice(index, 1)
    }
    
    closePointPopup()
    closePointContextMenu()
    
    ElMessage.success('点位已删除')
  } catch (error) {
    // 用户取消删除
  }
}

const savePointProperties = (updatedProperties) => {
  if (!selectedPoint.value) return
  
  // 更新点位数据
  Object.assign(selectedPoint.value, updatedProperties)
  
  // 更新标记图标
  if (selectedPoint.value.marker) {
    selectedPoint.value.marker.setIcon(createPointIcon(selectedPoint.value))
  }
  
  // 更新绘图数组中的数据
  const index = props.drawings.findIndex(d => d.id === selectedPoint.value.id)
  if (index !== -1) {
    Object.assign(props.drawings[index], updatedProperties)
  }
  
  ElMessage.success('点位属性已更新')
}

// 线段方法
const closeLinePopup = () => {
  showLinePopup.value = false
  selectedLine.value = null
  popupTriggerRef.value = null
}

const closeLineContextMenu = () => {
  showLineContextMenu.value = false
  selectedLine.value = null
}

const openLineProperties = () => {
  closeLinePopup()
  closeLineContextMenu()
  showLinePropertiesDialog.value = true
}

const deleteLine = async () => {
  if (!selectedLine.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除线段"${selectedLine.value.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    // 从地图上移除
    if (selectedLine.value.polyline) {
      props.mapInstance.drawingLayerGroup.removeLayer(selectedLine.value.polyline)
    }
    
    // 从绘图数组中移除
    const index = props.drawings.findIndex(d => d.id === selectedLine.value.id)
    if (index !== -1) {
      props.drawings.splice(index, 1)
    }
    
    closeLinePopup()
    closeLineContextMenu()
    
    ElMessage.success('线段已删除')
  } catch (error) {
    // 用户取消删除
  }
}

const saveLineProperties = (updatedProperties) => {
  if (!selectedLine.value) return
  
  // 更新线段数据
  Object.assign(selectedLine.value, updatedProperties)
  
  // 更新线段样式
  if (selectedLine.value.polyline) {
    updateLineStyle(selectedLine.value.polyline, selectedLine.value)
  }
  
  // 更新绘图数组中的数据
  const index = props.drawings.findIndex(d => d.id === selectedLine.value.id)
  if (index !== -1) {
    Object.assign(props.drawings[index], updatedProperties)
  }
  
  ElMessage.success('线段属性已更新')
}

// 面积方法
const closePolygonPopup = () => {
  showPolygonPopup.value = false
  selectedPolygon.value = null
  popupTriggerRef.value = null
}

const closePolygonContextMenu = () => {
  showPolygonContextMenu.value = false
  selectedPolygon.value = null
}

const openPolygonProperties = () => {
  closePolygonPopup()
  closePolygonContextMenu()
  showPolygonPropertiesDialog.value = true
}

const deletePolygon = async () => {
  if (!selectedPolygon.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除面积"${selectedPolygon.value.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    // 从地图上移除
    if (selectedPolygon.value.polygon) {
      props.mapInstance.drawingLayerGroup.removeLayer(selectedPolygon.value.polygon)
    }
    
    // 从绘图数组中移除
    const index = props.drawings.findIndex(d => d.id === selectedPolygon.value.id)
    if (index !== -1) {
      props.drawings.splice(index, 1)
    }
    
    closePolygonPopup()
    closePolygonContextMenu()
    
    ElMessage.success('面积已删除')
  } catch (error) {
    // 用户取消删除
  }
}

const savePolygonProperties = (updatedProperties) => {
  if (!selectedPolygon.value) return
  
  // 更新面积数据
  Object.assign(selectedPolygon.value, updatedProperties)
  
  // 更新面积样式
  if (selectedPolygon.value.polygon) {
    updatePolygonStyle(selectedPolygon.value.polygon, selectedPolygon.value)
  }
  
  // 更新绘图数组中的数据
  const index = props.drawings.findIndex(d => d.id === selectedPolygon.value.id)
  if (index !== -1) {
    Object.assign(props.drawings[index], updatedProperties)
  }
  
  ElMessage.success('面积属性已更新')
}

// 处理不同类型的事件
const handlePointClick = (e) => {
  selectedPoint.value = e.point
  
  // 创建虚拟触发元素用于定位弹窗
  const triggerEl = document.createElement('div')
  triggerEl.style.position = 'absolute'
  triggerEl.style.left = e.containerPoint.x + 'px'
  triggerEl.style.top = e.containerPoint.y + 'px'
  triggerEl.style.width = '1px'
  triggerEl.style.height = '1px'
  triggerEl.style.pointerEvents = 'none'
  props.mapInstance.getContainer().appendChild(triggerEl)
  
  popupTriggerRef.value = triggerEl
  showPointPopup.value = true
  
  // 清理触发元素
  setTimeout(() => {
    if (triggerEl.parentNode) {
      triggerEl.parentNode.removeChild(triggerEl)
    }
  }, 100)
}

const handlePointContextMenu = (e) => {
  selectedPoint.value = e.point
  contextMenuPosition.value = e.position
  showPointContextMenu.value = true
}

const handleLineClick = (e) => {
  selectedLine.value = e.line
  
  const triggerEl = document.createElement('div')
  triggerEl.style.position = 'absolute'
  triggerEl.style.left = e.containerPoint.x + 'px'
  triggerEl.style.top = e.containerPoint.y + 'px'
  triggerEl.style.width = '1px'
  triggerEl.style.height = '1px'
  triggerEl.style.pointerEvents = 'none'
  props.mapInstance.getContainer().appendChild(triggerEl)
  
  popupTriggerRef.value = triggerEl
  showLinePopup.value = true
  
  setTimeout(() => {
    if (triggerEl.parentNode) {
      triggerEl.parentNode.removeChild(triggerEl)
    }
  }, 100)
}

const handleLineContextMenu = (e) => {
  selectedLine.value = e.line
  contextMenuPosition.value = e.position
  showLineContextMenu.value = true
}

const handlePolygonClick = (e) => {
  selectedPolygon.value = e.polygon
  
  const triggerEl = document.createElement('div')
  triggerEl.style.position = 'absolute'
  triggerEl.style.left = e.containerPoint.x + 'px'
  triggerEl.style.top = e.containerPoint.y + 'px'
  triggerEl.style.width = '1px'
  triggerEl.style.height = '1px'
  triggerEl.style.pointerEvents = 'none'
  props.mapInstance.getContainer().appendChild(triggerEl)
  
  popupTriggerRef.value = triggerEl
  showPolygonPopup.value = true
  
  setTimeout(() => {
    if (triggerEl.parentNode) {
      triggerEl.parentNode.removeChild(triggerEl)
    }
  }, 100)
}

const handlePolygonContextMenu = (e) => {
  selectedPolygon.value = e.polygon
  contextMenuPosition.value = e.position
  showPolygonContextMenu.value = true
}

const handleShowExport = () => {
  showExportDialog.value = true
}

// 暴露方法给父组件调用
defineExpose({
  handlePointClick,
  handlePointContextMenu,
  handleLineClick,
  handleLineContextMenu,
  handlePolygonClick,
  handlePolygonContextMenu,
  handleShowExport
})
</script>
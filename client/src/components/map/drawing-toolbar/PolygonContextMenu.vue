<!-- 面积右键菜单组件 -->
<template>
  <el-dropdown
    ref="dropdownRef"
    :visible="visible"
    placement="bottom-start"
    trigger="manual"
    @visible-change="handleVisibleChange"
  >
    <span></span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="$emit('edit-properties')">
          <el-icon><Edit /></el-icon>
          属性
        </el-dropdown-item>
        <el-dropdown-item divided @click="$emit('delete-polygon')">
          <el-icon><Delete /></el-icon>
          删除
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['close', 'edit-properties', 'delete-polygon'])

const dropdownRef = ref(null)

// 监听可见性变化，调整下拉菜单位置
watch(() => props.visible, async (visible) => {
  if (visible && dropdownRef.value) {
    await nextTick()
    // 获取下拉菜单的DOM元素并设置位置，增加空值检查以防止 runtime 错误
    const popperEl = dropdownRef.value?.popperRef?.contentRef
    const pos = props.position || { x: 0, y: 0 }
    if (popperEl && popperEl.style) {
      try {
        popperEl.style.position = 'fixed'
        // 仅在 pos.x/pos.y 有效时设置 left/top
        if (typeof pos.x === 'number') popperEl.style.left = pos.x + 'px'
        if (typeof pos.y === 'number') popperEl.style.top = pos.y + 'px'
        popperEl.style.zIndex = '9999'
      } catch (err) {
        console.warn('[PolygonContextMenu] 设置 context menu 位置失败', err)
      }
    }
  }
})

const handleVisibleChange = (visible) => {
  if (!visible) {
    emit('close')
  }
}
</script>

<style lang="scss" scoped>
// Element Plus 下拉菜单样式会自动应用
</style>
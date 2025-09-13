<!-- 点位信息弹窗组件 -->
<template>
  <el-popover
    :visible="visible"
    :virtual-ref="triggerRef"
    virtual-triggering
    placement="top"
    :width="300"
    trigger="manual"
    @hide="$emit('close')"
  >
    <div class="point-info-popup">
      <div class="popup-header">
        <h4 class="title">{{ point?.name || '未命名点位' }}</h4>
        <el-button 
          type="text" 
          size="small" 
          class="close-btn"
          @click="$emit('close')"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      
      <div class="popup-content" v-if="point">
        <div class="info-item" v-if="point.description">
          <span class="label">描述：</span>
          <span class="value">{{ point.description }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">坐标：</span>
          <span class="value">
            {{ formatCoordinate(point.latlng.lat) }}, {{ formatCoordinate(point.latlng.lng) }}
          </span>
        </div>
        
        <div class="info-item" v-if="point.timestamp">
          <span class="label">创建时间：</span>
          <span class="value">{{ formatDate(point.timestamp) }}</span>
        </div>
        
        <div class="popup-actions">
          <el-button 
            type="primary" 
            size="small"
            @click="$emit('edit-properties')"
          >
            编辑属性
          </el-button>
          <el-button 
            type="danger" 
            size="small"
            @click="$emit('delete-point')"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  point: {
    type: Object,
    default: null
  },
  triggerRef: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'edit-properties', 'delete-point'])

// 格式化坐标显示
const formatCoordinate = (coord) => {
  return typeof coord === 'number' ? coord.toFixed(6) : coord
}

// 格式化日期显示
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.point-info-popup {
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    .title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
    
    .close-btn {
      padding: 4px;
      margin: 0;
    }
  }
  
  .popup-content {
    .info-item {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;
      
      .label {
        min-width: 70px;
        font-weight: 500;
        color: var(--el-text-color-regular);
      }
      
      .value {
        color: var(--el-text-color-primary);
        word-break: break-all;
      }
    }
    
    .popup-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  }
}
</style>
<!-- 面积信息弹窗组件 -->
<template>
  <el-popover
    :visible="visible"
    :virtual-ref="triggerRef"
    virtual-triggering
    placement="top"
    :width="340"
    trigger="manual"
    @hide="$emit('close')"
  >
    <div class="polygon-info-popup">
      <div class="popup-header">
        <h4 class="title">{{ polygon?.name || '未命名面积' }}</h4>
        <el-button 
          type="text" 
          size="small" 
          class="close-btn"
          @click="$emit('close')"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      
      <div class="popup-content" v-if="polygon">
        <div class="info-item" v-if="polygon.description">
          <span class="label">描述：</span>
          <span class="value">{{ polygon.description }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">面积：</span>
          <span class="value">{{ formatArea(polygon.area) }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">周长：</span>
          <span class="value">{{ formatDistance(polygon.perimeter) }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">点数：</span>
          <span class="value">{{ polygon.latlngs?.length || 0 }} 个点</span>
        </div>
        
        <div class="info-item">
          <span class="label">样式：</span>
          <div class="style-preview">
            <div 
              class="color-dot" 
              :style="{ 
                backgroundColor: polygon.fillColor || '#3388ff',
                border: `2px solid ${polygon.color || '#3388ff'}`
              }"
            ></div>
            <span class="style-text">
              边框 {{ polygon.weight || 3 }}px，填充 {{ Math.round((polygon.fillOpacity || 0.2) * 100) }}%
            </span>
          </div>
        </div>
        
        <div class="info-item" v-if="polygon.timestamp">
          <span class="label">创建时间：</span>
          <span class="value">{{ formatDate(polygon.timestamp) }}</span>
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
            @click="$emit('delete-polygon')"
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
  polygon: {
    type: Object,
    default: null
  },
  triggerRef: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'edit-properties', 'delete-polygon'])

// 格式化面积显示
const formatArea = (area) => {
  if (!area) return '0 平方米'
  if (area < 1000000) {
    return `${area.toFixed(2)} 平方米`
  } else {
    return `${(area / 1000000).toFixed(2)} 平方公里`
  }
}

// 格式化距离显示
const formatDistance = (distance) => {
  if (!distance) return '0 米'
  if (distance < 1000) {
    return `${distance.toFixed(2)} 米`
  } else {
    return `${(distance / 1000).toFixed(2)} 公里`
  }
}

// 格式化日期显示
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.polygon-info-popup {
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
        min-width: 80px;
        font-weight: 500;
        color: var(--el-text-color-regular);
      }
      
      .value {
        color: var(--el-text-color-primary);
        word-break: break-all;
      }
      
      .style-preview {
        display: flex;
        align-items: center;
        
        .color-dot {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          margin-right: 8px;
        }
        
        .style-text {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
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
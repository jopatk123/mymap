<!-- 工具按钮组件 -->
<template>
  <div class="tool-buttons">
    <!-- 展开时内嵌的切换按钮（位于工具列顶部） -->
    <div class="toolbar-toggle-inline" @click="$emit('toggle-collapse')" role="button" tabindex="0">
      <el-icon>
        <component :is="isCollapsed ? 'ArrowLeft' : 'ArrowRight'" />
      </el-icon>
    </div>

    <!-- 测距工具 -->
    <el-tooltip content="测距工具" placement="left">
      <el-button
        :type="activeTool === 'measure' ? 'primary' : 'default'"
        :class="[{ active: activeTool === 'measure' }, 'btn-measure']"
        @click="$emit('toggle-tool', 'measure')"
        circle
      >
        <el-icon><Compass /></el-icon>
      </el-button>
    </el-tooltip>

    <!-- 添加点工具 -->
    <el-tooltip content="添加点" placement="left">
      <el-button
        :type="activeTool === 'point' ? 'primary' : 'default'"
        :class="{ active: activeTool === 'point' }"
        @click="$emit('toggle-tool', 'point')"
        circle
      >
        <el-icon><Location /></el-icon>
      </el-button>
    </el-tooltip>

    <!-- 添加线工具 -->
    <el-tooltip content="添加线" placement="left">
      <el-button
        :type="activeTool === 'line' ? 'primary' : 'default'"
        :class="{ active: activeTool === 'line' }"
        @click="$emit('toggle-tool', 'line')"
        circle
      >
        <el-icon><Minus /></el-icon>
      </el-button>
    </el-tooltip>

    <!-- 添加面工具 -->
    <el-tooltip content="添加面" placement="left">
      <el-button
        :type="activeTool === 'polygon' ? 'primary' : 'default'"
        :class="{ active: activeTool === 'polygon' }"
        @click="$emit('toggle-tool', 'polygon')"
        circle
      >
        <el-icon><Operation /></el-icon>
      </el-button>
    </el-tooltip>

    <!-- 画笔工具 -->
    <el-tooltip 
      :content="activeTool === 'draw' ? '画笔工具 (地图拖拽已禁用)' : '画笔工具'" 
      placement="left"
    >
      <el-button
        :type="activeTool === 'draw' ? 'primary' : 'default'"
        :class="{ 
          active: activeTool === 'draw',
          'draw-tool-active': activeTool === 'draw'
        }"
        @click="$emit('toggle-tool', 'draw')"
        circle
      >
        <el-icon><Edit /></el-icon>
      </el-button>
    </el-tooltip>

    <!-- 分割线 -->
    <div class="divider"></div>

    <!-- 清除工具 -->
    <el-tooltip content="清除所有" placement="left">
      <el-button
        type="danger"
        @click="$emit('clear-all')"
        :disabled="!hasDrawings"
        circle
        class="btn-clear"
      >
        <el-icon><Delete /></el-icon>
      </el-button>
    </el-tooltip>

    <!-- 保存工具 -->
    <el-tooltip content="导出保存" placement="left">
      <el-button
        type="success"
        @click="$emit('show-export')"
        :disabled="!hasDrawings"
        circle
      >
        <el-icon><Download /></el-icon>
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup>
import { 
  ArrowLeft, 
  ArrowRight, 
  Compass, 
  Location, 
  Minus, 
  Operation, 
  Edit,
  Download,
  Delete
} from '@element-plus/icons-vue'

defineProps({
  activeTool: {
    type: String,
    default: null
  },
  hasDrawings: {
    type: Boolean,
    default: false
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'toggle-collapse',
  'toggle-tool',
  'clear-all', 
  'show-export'
])
</script>

<style lang="scss" scoped>
.tool-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
}

/* 确保所有按钮完全居中对齐 */
.tool-buttons > * {
  margin-left: 0 !important;
  margin-right: 0 !important;
  align-self: center !important;
}

/* 特别处理内联切换按钮的对齐 */
.toolbar-toggle-inline {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 6px;
  box-shadow: 0 1px 4px rgba(64,158,255,0.15);
  align-self: center !important;

  .el-icon {
    font-size: 14px;
  }
}

.el-button {
  width: 36px;
  height: 36px;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  border-radius: 50% !important;
  margin: 0 !important; /* 确保没有额外margin */
  
  &.active {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.divider {
  width: 20px;
  height: 1px;
  background: #dcdfe6;
  margin: 2px 0;
}

/* 确保危险/成功按钮的圆形和其它按钮一致并垂直对齐 */
.el-button[type="danger"],
.el-button.is-danger,
.el-button[type="success"],
.el-button.is-success {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// 画笔工具特殊状态样式
.el-button.draw-tool-active {
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #f56c6c;
    border-radius: 50%;
    border: 1px solid white;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  }
}

// 移动端适配
@media (max-width: 768px) {
  .el-button {
    width: 32px;
    height: 32px;
    
    .el-icon {
      font-size: 12px;
    }
  }
  
  .toolbar-toggle-inline {
    width: 32px;
    height: 32px;
    
    .el-icon {
      font-size: 12px;
    }
  }
}
</style>
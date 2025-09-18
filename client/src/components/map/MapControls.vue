<template>
  <div class="map-controls">
    <!-- 工具栏（整排按钮） -->
    <div class="toolbar" @click.stop>
      <div class="controls-group">
        <!-- 按用户要求的顺序：搜索、圆形、自定义、清除、KML设置、点位图标、显示列表、隐藏KML图层 -->

        <!-- 搜索工具（赤红色） -->
        <div class="priority search-wrapper btn-search">
          <SearchTool @locate-kml-point="$emit('locate-kml-point', $event)" @locate-address="$emit('locate-address', $event)" />
        </div>

        <!-- 区域选择（按钮颜色在 AreaControls 中定义） -->
        <AreaControls class="area-controls-inline" :map-instance="mapInstance" />

        <!-- 导出控件（绿色） -->
        <ExportControls class="export-controls-inline" :visible-k-m-l-points="visibleKMLPoints" />

        <!-- KML设置（蓝色） -->
        <el-button class="btn-kml-settings priority" @click.stop="$emit('show-kml-settings')">
          <el-icon><Tools /></el-icon>
          KML设置
        </el-button>

        <!-- 点位图标（紫色） -->
        <el-button class="btn-point-icons priority" @click.stop="$emit('show-point-settings')">
          <el-icon><Location /></el-icon>
          点位图标
        </el-button>

        <!-- 显示/隐藏列表（粉色） -->
        <el-button
          class="btn-show-list"
          :title="panoramaListVisible ? '隐藏点位列表' : '显示点位列表'"
          @click.stop="$emit('toggle-panorama-list')"
        >
          {{ panoramaListVisible ? '隐藏列表' : '显示列表' }}
        </el-button>

        <!-- 隐藏/显示 KML 图层（白色） -->
        <el-button
          class="btn-toggle-kml"
          :title="kmlLayersVisible ? '隐藏KML图层' : '显示KML图层'"
          @click.stop="$emit('toggle-kml-layers')"
        >
          {{ kmlLayersVisible ? '隐藏KML图层' : '显示KML图层' }}
        </el-button>
      </div>
    </div>
  </div>

</template>

<script setup>
import { Tools, Location } from '@element-plus/icons-vue';
import SearchTool from './SearchTool.vue';
import AreaControls from './area-selector/AreaControls.vue';
import ExportControls from './ExportControls.vue';

defineProps({
  panoramaListVisible: {
    type: Boolean,
    default: true,
  },
  kmlLayersVisible: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  mapInstance: {
    type: Object,
    default: null,
  },
  visibleKMLPoints: {
    type: Array,
    default: () => []
  },
});

defineEmits([
  'toggle-panorama-list',
  'toggle-kml-layers',
  'show-kml-settings',
  'show-point-settings',
  'locate-kml-point',
  'locate-address',
]);
</script>

<style scoped lang="scss">
.map-controls {
  .toolbar {
    position: absolute;
    top: 16px;
    right: 170px; /* 与右侧绘图工具保持距离 */
    z-index: 1000;
    max-width: calc(100vw - 200px); /* 防止超出屏幕 */

    display: flex;
    gap: 0;
    padding: 0;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    overflow: hidden; /* 确保圆角效果 */

    .controls-group {
      display: flex;
      align-items: stretch; /* 让所有按钮高度一致 */
      gap: 0;
      flex-wrap: nowrap; /* 桌面端不换行 */
      height: 44px; /* 增加高度提升点击体验 */
      pointer-events: auto !important;
    }

    /* 统一按钮样式 */
    .controls-group > * {
      margin: 0 !important;
      border-radius: 0 !important;
      border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
      height: 44px !important;
      min-width: 88px; /* 增加最小宽度 */
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative;
      white-space: nowrap;
    }

    /* 移除最后一个按钮的右边框 */
    .controls-group > *:last-child {
      border-right: none !important;
    }

    /* 首尾按钮圆角 */
    .controls-group > *:first-child {
      border-top-left-radius: 12px !important;
      border-bottom-left-radius: 12px !important;
    }
    .controls-group > *:last-child {
      border-top-right-radius: 12px !important;
      border-bottom-right-radius: 12px !important;
    }

    /* 统一按钮内边距 */
    .el-button {
      padding: 0 14px !important;
      line-height: 44px !important;
      
      /* 优化悬停效果 */
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        filter: brightness(1.1);
      }

      &:active {
        transform: translateY(-1px);
        transition: all 0.1s ease;
      }

      &:focus {
        outline: none !important;
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2) !important;
      }

      /* 图标样式 */
      .el-icon {
        margin-right: 6px;
        font-size: 15px;
      }
    }

    /* 防止按钮组变暗 */
    .controls-group {
      opacity: 1 !important;
      
      &:focus-within {
        opacity: 1 !important;
      }
    }

    .controls-group > * {
      opacity: 1 !important;
      
      &:focus,
      &:active,
      &:hover {
        opacity: 1 !important;
      }
    }

    /* 覆盖Element Plus可能的变暗效果 */
    .el-button-group {
      opacity: 1 !important;
      
      .el-button {
        opacity: 1 !important;
        
        &:focus,
        &:active,
        &:hover {
          opacity: 1 !important;
        }
      }
    }

    /* 搜索工具包装器 */
    .search-wrapper {
      display: inline-flex;
      align-items: center;
      height: 44px;
    }

    /* 区域控制器内联样式 */
    .area-controls-inline {
      display: inline-flex !important;
      align-items: center !important;
      height: 44px !important;
      
      .buttons-wrapper {
        height: 44px;
        
        .el-button-group {
          display: inline-flex !important;
          height: 44px !important;
          
          .el-button {
            height: 44px !important;
            border-radius: 0 !important;
            border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
        }
      }
    }

    /* 导出控制器内联样式 */
    .export-controls-inline {
      display: inline-flex !important;
      align-items: center !important;
      height: 44px !important;
      
      .btn-export-data {
        height: 44px !important;
        border-radius: 0 !important;
        min-width: 88px !important;
        padding: 0 14px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
      }
    }

    /* 按钮颜色定义 - 使用更现代的配色方案 */
    /* 对于 SearchTool，我们只需让内部的 .el-button 使用渐变，而外层容器保持透明，
       因为 SearchTool 是子组件，当前样式文件是 scoped，需要使用深度选择符来穿透子组件 */
    .btn-search {
      /* 外层容器设为透明，避免在内层按钮尺寸不满位时露出底色 */
      background: transparent !important;
    }

    .search-wrapper ::v-deep .el-button {
      background: linear-gradient(135deg, #ff5722, #d32f2f) !important;
      border-color: #ff5722 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(255, 87, 34, 0.3);
    }

    .btn-kml-settings {
      background: linear-gradient(135deg, #2196f3, #1976d2) !important;
      border-color: #2196f3 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    }

    .btn-point-icons {
      background: linear-gradient(135deg, #9c27b0, #7b1fa2) !important;
      border-color: #9c27b0 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
    }

    .btn-show-list {
      background: linear-gradient(135deg, #e91e63, #c2185b) !important;
      border-color: #e91e63 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(233, 30, 99, 0.3);
    }

    .btn-toggle-kml {
      background: linear-gradient(135deg, #ffffff, #f5f5f5) !important;
      border-color: #e0e0e0 !important;
      color: #424242 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* 区域控制按钮颜色 */
    .area-controls-inline {
      .btn-circle {
        background: linear-gradient(135deg, #ff9800, #f57c00) !important;
        border-color: #ff9800 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
      }

      .btn-custom {
        background: linear-gradient(135deg, #ffeb3b, #fbc02d) !important;
        border-color: #ffeb3b !important;
        color: #424242 !important;
        box-shadow: 0 2px 8px rgba(255, 235, 59, 0.3);
      }

      .btn-clear {
        background: linear-gradient(135deg, #4caf50, #388e3c) !important;
        border-color: #4caf50 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      }
    }

    /* 导出控制按钮颜色 */
    .export-controls-inline {
      .btn-export-data {
        background: linear-gradient(135deg, #4caf50, #388e3c) !important;
        border-color: #4caf50 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      }
    }
  }

  /* 平板端适配 */
  @media (max-width: 1024px) {
    .toolbar {
      right: 120px;
      max-width: calc(100vw - 140px);
      
      .controls-group > * {
        min-width: 76px;
        font-size: 12px !important;
      }

      .el-button {
        padding: 0 10px !important;
        
        .el-icon {
          margin-right: 4px;
          font-size: 14px;
        }
      }
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .toolbar {
      top: 12px;
      left: 12px;
      right: 12px;
      width: calc(100% - 24px);
      max-width: none;

      .controls-group {
        flex-wrap: wrap;
        height: auto;
        gap: 6px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 12px;
        justify-content: center;
      }

      .controls-group > * {
        flex: 1 1 calc(33.333% - 8px);
        min-width: 80px;
        max-width: 120px;
        height: 40px !important;
        border-radius: 8px !important;
        border-right: none !important;
        margin: 0 !important;
        font-size: 12px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      }

      .el-button {
        padding: 0 10px !important;
        line-height: 40px !important;
        
        .el-icon {
          margin-right: 3px;
          font-size: 13px;
        }
      }

      /* 移动端搜索工具 */
      .search-wrapper {
        height: 40px;
      }

      /* 移动端区域控制 */
      .area-controls-inline {
        height: 40px !important;
        
        .buttons-wrapper .el-button-group .el-button {
          height: 40px !important;
          border-radius: 8px !important;
          margin: 0 2px !important;
        }
      }

      /* 移动端导出控制 */
      .export-controls-inline {
        height: 40px !important;
        
        .btn-export-data {
          height: 40px !important;
          border-radius: 8px !important;
        }
      }
    }
  }

  /* 超小屏幕适配 */
  @media (max-width: 480px) {
    .toolbar {
      left: 8px;
      right: 8px;
      width: calc(100% - 16px);

      .controls-group {
        gap: 4px;
        padding: 6px;
      }

      .controls-group > * {
        flex: 1 1 calc(50% - 6px);
        min-width: 70px;
        max-width: none;
        height: 36px !important;
        font-size: 11px !important;
      }

      .el-button {
        padding: 0 8px !important;
        line-height: 36px !important;
        
        .el-icon {
          margin-right: 2px;
          font-size: 12px;
        }
      }

      /* 超小屏幕搜索工具 */
      .search-wrapper {
        height: 36px;
      }

      /* 超小屏幕区域控制 */
      .area-controls-inline {
        height: 36px !important;
        
        .buttons-wrapper .el-button-group .el-button {
          height: 36px !important;
        }
      }

      /* 超小屏幕导出控制 */
      .export-controls-inline {
        height: 36px !important;
        
        .btn-export-data {
          height: 36px !important;
        }
      }
    }
  }

  /* 超宽屏幕优化 */
  @media (min-width: 1440px) {
    .toolbar {
      .controls-group > * {
        min-width: 96px;
        font-size: 14px !important;
      }

      .el-button {
        padding: 0 16px !important;
        
        .el-icon {
          margin-right: 8px;
          font-size: 16px;
        }
      }
    }
  }
}
</style>

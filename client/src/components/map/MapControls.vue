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
    top: 20px;
    right: 170px; /* 与右侧绘图工具保持距离 */
    z-index: 1000;

    display: flex;
    gap: 0;
    padding: 0;
    background: transparent;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
    overflow: hidden; /* 确保圆角效果 */

    .controls-group {
      display: flex;
      align-items: stretch; /* 让所有按钮高度一致 */
      gap: 0;
      flex-wrap: nowrap; /* 桌面端不换行 */
      height: 40px; /* 统一高度 */
      pointer-events: auto !important;
    }

    /* 统一按钮样式 */
    .controls-group > * {
      margin: 0 !important;
      border-radius: 0 !important;
      border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
      height: 40px !important;
      min-width: 80px; /* 最小宽度确保一致性 */
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      transition: all 0.2s ease !important;
      position: relative;
    }

    /* 移除最后一个按钮的右边框 */
    .controls-group > *:last-child {
      border-right: none !important;
    }

    /* 首尾按钮圆角 */
    .controls-group > *:first-child {
      border-top-left-radius: 8px !important;
      border-bottom-left-radius: 8px !important;
    }
    .controls-group > *:last-child {
      border-top-right-radius: 8px !important;
      border-bottom-right-radius: 8px !important;
    }

    /* 统一按钮内边距 */
    .el-button {
      padding: 0 12px !important;
      line-height: 40px !important;
      
      /* 悬停效果 */
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1001;
      }

      &:active {
        transform: translateY(0);
      }

      &:focus {
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
      }

      /* 图标样式 */
      .el-icon {
        margin-right: 4px;
        font-size: 14px;
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
      height: 40px;
    }

    /* 区域控制器内联样式 */
    .area-controls-inline {
      display: inline-flex !important;
      align-items: center !important;
      height: 40px !important;
      
      .buttons-wrapper {
        height: 40px;
        
        .el-button-group {
          display: inline-flex !important;
          height: 40px !important;
          
          .el-button {
            height: 40px !important;
            border-radius: 0 !important;
            border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
          }
        }
      }
    }

    /* 按钮颜色定义 - 保持原有背景色不变 */
    .btn-search,
    .search-wrapper .el-button {
      background: #d32f2f !important; /* 赤红色 */
      border-color: #d32f2f !important;
      color: #fff !important;
    }

    .btn-kml-settings {
      background: #1976d2 !important; /* 蓝色 */
      border-color: #1976d2 !important;
      color: #fff !important;
    }

    .btn-point-icons {
      background: #7b1fa2 !important; /* 紫色 */
      border-color: #7b1fa2 !important;
      color: #fff !important;
    }

    .btn-show-list {
      background: #f06292 !important; /* 粉色 */
      border-color: #f06292 !important;
      color: #fff !important;
    }

    .btn-toggle-kml {
      background: #ffffff !important; /* 白色 */
      border-color: #e0e0e0 !important;
      color: #333 !important;
    }

    /* 区域控制按钮颜色 */
    .area-controls-inline {
      .btn-circle {
        background: #fb8c00 !important; /* 橙色 */
        border-color: #fb8c00 !important;
        color: #fff !important;
      }

      .btn-custom {
        background: #fdd835 !important; /* 黄色 */
        border-color: #fdd835 !important;
        color: #333 !important;
      }

      .btn-clear {
        background: #43a047 !important; /* 绿色 */
        border-color: #43a047 !important;
        color: #fff !important;
      }
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .toolbar {
      top: 10px;
      right: 10px;
      left: 10px;
      right: auto;
      width: calc(100% - 20px);
      max-width: 100%;

      .controls-group {
        flex-wrap: wrap;
        height: auto;
        gap: 2px;
        padding: 4px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
      }

      .controls-group > * {
        flex: 1 1 calc(33.333% - 4px);
        min-width: 70px;
        height: 36px !important;
        border-radius: 6px !important;
        border-right: none !important;
        margin: 1px !important;
        font-size: 12px !important;
      }

      .el-button {
        padding: 0 8px !important;
        line-height: 36px !important;
        
        .el-icon {
          margin-right: 2px;
          font-size: 12px;
        }
      }

      /* 移动端搜索工具 */
      .search-wrapper {
        height: 36px;
      }

      /* 移动端区域控制 */
      .area-controls-inline {
        height: 36px !important;
        
        .buttons-wrapper .el-button-group .el-button {
          height: 36px !important;
        }
      }
    }
  }

  /* 超小屏幕适配 */
  @media (max-width: 480px) {
    .toolbar {
      .controls-group > * {
        flex: 1 1 calc(50% - 4px);
        min-width: 60px;
        font-size: 11px !important;
      }

      .el-button {
        padding: 0 6px !important;
        
        .el-icon {
          margin-right: 1px;
        }
      }
    }
  }
}
</style>

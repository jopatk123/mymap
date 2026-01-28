<template>
  <div class="map-controls">
    <!-- 工具栏（整排按钮） -->
    <div class="toolbar" @click.stop>
      <div class="controls-group">
        <!-- 按用户要求的顺序：搜索、圆形、自定义、清除、KML设置、点位图标、显示列表、隐藏KML图层 -->

        <!-- 搜索工具（赤红色） -->
        <div class="priority search-wrapper btn-search">
          <SearchTool
            @locate-kml-point="$emit('locate-kml-point', $event)"
            @locate-address="$emit('locate-address', $event)"
          />
        </div>

        <!-- 区域选择（按钮颜色在 AreaControls 中定义） -->
        <AreaControls class="area-controls-inline" :map-instance="mapInstance" />

        <!-- 导出控件（绿色） -->
        <ExportControls class="export-controls-inline" :visible-k-m-l-points="visibleKMLPoints" />

        <!-- 点位设置（下拉：包含 KML设置 与 点位图标设置） -->
        <el-dropdown
          class="btn-point-settings-dropdown priority"
          trigger="click"
          @command="handlePointSettingsCommand"
        >
          <template #default>
            <el-button class="btn-point-settings">
              点位设置
              <el-icon style="margin-left:6px"><ArrowDown /></el-icon>
            </el-button>
          </template>

          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="kml">KML设置</el-dropdown-item>
              <el-dropdown-item command="point">点位图标设置</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        
        </el-dropdown>

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
          :title="kmlLayersVisible ? '隐藏图层' : '显示KML图层'"
          @click.stop="$emit('toggle-kml-layers')"
        >
          {{ kmlLayersVisible ? '隐藏图层' : '显示KML图层' }}
        </el-button>

        <!-- 隐藏/显示点位（视频、全景图、图片集） -->
        <el-button
          class="btn-toggle-markers"
          :title="markersVisible ? '隐藏点位' : '显示点位'"
          @click.stop="$emit('toggle-markers')"
        >
          {{ markersVisible ? '隐藏点位' : '显示点位' }}
        </el-button>

        <!-- 文件管理按钮 -->
        <el-button
          class="btn-file-manage"
          title="打开文件管理页面"
          @click.stop="openFileManage"
        >
          文件管理
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import SearchTool from './SearchTool.vue';
import AreaControls from './area-selector/AreaControls.vue';
import ExportControls from './ExportControls.vue';
import { ArrowDown } from '@element-plus/icons-vue';
import { useMapControls } from './use-map-controls';

// handler for dropdown commands
const emit = defineEmits([
  'toggle-panorama-list',
  'toggle-kml-layers',
  'toggle-markers',
  'show-kml-settings',
  'show-point-settings',
  'locate-kml-point',
  'locate-address',
]);

const { handlePointSettingsCommand, openFileManage } = useMapControls(emit);

defineProps({
  panoramaListVisible: {
    type: Boolean,
    default: true,
  },
  kmlLayersVisible: {
    type: Boolean,
    default: true,
  },
  markersVisible: {
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
    default: () => [],
  },
});

// defineEmits handled above where needed
</script>

<style scoped lang="scss">
.map-controls {
  .toolbar {
    position: absolute;
    top: 12px; /* 减小顶部间距 */
    right: 170px; /* 与右侧绘图工具保持距离 */
    z-index: 1000;
    max-width: calc(100vw - 200px); /* 防止超出屏幕 */

    display: flex;
    gap: 0;
    padding: 0;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px; /* 减小圆角 */
    box-shadow: 0 3px 15px rgba(0, 0, 0, 0.12); /* 减小阴影 */
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    overflow: hidden; /* 确保圆角效果 */
    
    /* 防止移动端缩放和移动 */
    touch-action: manipulation;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    will-change: transform;
    user-select: none;
    -webkit-user-select: none;

    .controls-group {
      display: flex;
      align-items: stretch; /* 让所有按钮高度一致 */
      gap: 0;
      flex-wrap: nowrap; /* 桌面端不换行 */
      height: 36px; /* 减小高度，更紧凑 */
      pointer-events: auto !important;
      
      /* 防止移动端缩放 */
      touch-action: manipulation;
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
    }

    /* 移动设备修复：避免 toolbar 因右侧固定偏移或 max-width 被裁剪 */
    @media (max-width: 768px) {
      /* 在窄屏上把 toolbar 靠右的偏移缩小，利用屏幕更大比例的宽度 */
      right: 12px !important;
      left: 12px !important;
      max-width: calc(100vw - 24px) !important;
      overflow: visible !important; /* 允许内部横向滚动或换行显示 */
      
      /* 强制固定定位，防止随地图缩放移动 */
      position: fixed !important;
      transform: translate3d(0, 0, 0) !important;
      -webkit-transform: translate3d(0, 0, 0) !important;

      .controls-group {
        /* 保持高度但允许横向滚动以避免内容被裁剪
           - 如果希望按钮可以换行显示，可以改为 flex-wrap: wrap; */
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 4px; /* 给滚动条或触摸留白 */
        gap: 6px;
      }

      /* 保证子按钮在横向滚动时仍然是紧凑的 */
      .controls-group ::v-deep .el-button {
        white-space: nowrap;
        touch-action: manipulation;
      }
    }

    /* 统一按钮样式 - 固定字体、固定高度、宽度自适应且尽量紧凑 */
    .controls-group > * {
      margin: 0 !important;
      border-radius: 0 !important;
      border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
      height: 36px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 12px !important; /* 与“显示列表”一致的字体大小 */
      font-weight: 500 !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative;
      white-space: nowrap;
      flex: 0 0 auto; /* 宽度自适应内容 */
      min-width: 0 !important;
    }

    /* 移除最后一个按钮的右边框 */
    .controls-group > *:last-child {
      border-right: none !important;
    }

    /* 首尾按钮圆角 */
    .controls-group > *:first-child {
      border-top-left-radius: 10px !important;
      border-bottom-left-radius: 10px !important;
    }
    .controls-group > *:last-child {
      border-top-right-radius: 10px !important;
      border-bottom-right-radius: 10px !important;
    }

    /* 统一按钮内边距 */
    .el-button {
      padding: 0 8px !important; /* 更紧凑的内边距 */
      line-height: 36px !important;
      min-width: 0 !important; /* 允许按钮宽度收缩到文本宽度 */
      width: auto !important;

      /* 优化悬停效果 */
      &:hover {
        transform: translateY(-1px); /* 减小悬停位移 */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        filter: brightness(1.1);
      }

      &:active {
        transform: translateY(0px);
        transition: all 0.1s ease;
      }

      &:focus {
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
      }
    }

    /* 确保嵌套子组件中的 el-button 也使用相同的紧凑样式 */
    .controls-group ::v-deep .el-button {
      font-size: 12px !important;
      padding: 0 8px !important;
      height: 36px !important;
      line-height: 36px !important;
      min-width: 0 !important;
      width: auto !important;
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
      height: 36px;
    }

    /* 区域控制器内联样式 */
    .area-controls-inline {
      display: inline-flex !important;
      align-items: center !important;
      height: 36px !important;

      .buttons-wrapper {
        height: 36px;

        .el-button-group {
          display: inline-flex !important;
          height: 36px !important;

          .el-button {
            height: 36px !important;
            border-radius: 0 !important;
            border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
            padding: 0 8px !important;
            flex: 0 0 auto; /* 宽度自适应内容 */
          }
        }
      }
    }

    /* 导出控制器内联样式 */
    .export-controls-inline {
      display: inline-flex !important;
      align-items: center !important;
      height: 36px !important;

      .btn-export-data {
        height: 36px !important;
        border-radius: 0 !important;
        padding: 0 8px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        flex: 0 0 auto; /* 宽度自适应内容 */
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

    /* 点位设置（蓝底白字） */
    .btn-point-settings {
      background: linear-gradient(135deg, #1976d2, #1565c0) !important; /* 深蓝渐变 */
      border-color: #1565c0 !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(21, 101, 192, 0.18);
      border-radius: 0 !important;
      border-top-left-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    /* 确保下拉包装器内的按钮没有圆角 */
    .btn-point-settings-dropdown ::v-deep .el-button {
      border-radius: 0 !important;
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

    /* 隐藏/显示点位按钮（青色） */
    .btn-toggle-markers {
      background: linear-gradient(135deg, #00bcd4, #0097a7) !important;
      border-color: #00bcd4 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(0, 188, 212, 0.3);
    }

    /* 文件管理按钮（紫色） */
    .btn-file-manage {
      background: linear-gradient(135deg, #9c27b0, #7b1fa2) !important;
      border-color: #9c27b0 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
    }

    .btn-toggle-contours {
      background: linear-gradient(135deg, #ff9800, #fb8c00) !important;
      border-color: #fb8c00 !important;
      color: #fff !important;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
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
}
</style>

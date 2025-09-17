<template>
  <div class="map-controls">
    <!-- 工具栏（整排按钮） -->
    <div class="toolbar">
      <el-button-group class="controls-group">
        <!-- 按用户要求的顺序：搜索、圆形、自定义、清除、导出、KML设置、点位图标、显示列表、隐藏KML图层 -->

        <!-- 搜索工具（赤红色） -->
        <div class="priority search-wrapper btn-search">
          <SearchTool @locate-kml-point="$emit('locate-kml-point', $event)" @locate-address="$emit('locate-address', $event)" />
        </div>

        <!-- 区域选择与导出（按钮颜色在 AreaControls 中定义） -->
        <AreaControls class="area-controls-inline" :map-instance="mapInstance" />

        <!-- KML设置（蓝色） -->
        <el-button class="btn-kml-settings priority" @click="$emit('show-kml-settings')">
          <el-icon><Tools /></el-icon>
          KML设置
        </el-button>

        <!-- 点位图标（紫色） -->
        <el-button class="btn-point-icons priority" @click="$emit('show-point-settings')">
          <el-icon><Location /></el-icon>
          点位图标
        </el-button>

        <!-- 显示/隐藏列表（粉色） -->
        <el-button
          class="btn-show-list"
          :title="panoramaListVisible ? '隐藏点位列表' : '显示点位列表'"
          @click="$emit('toggle-panorama-list')"
        >
          {{ panoramaListVisible ? '隐藏列表' : '显示列表' }}
        </el-button>

        <!-- 隐藏/显示 KML 图层（白色） -->
        <el-button
          class="btn-toggle-kml"
          :title="kmlLayersVisible ? '隐藏KML图层' : '显示KML图层'"
          @click="$emit('toggle-kml-layers')"
        >
          {{ kmlLayersVisible ? '隐藏KML图层' : '显示KML图层' }}
        </el-button>
        </el-button-group>
    </div>
    <!-- KML数据导出对话框（全局渲染，useKMLExport 管理可见性） -->
    <KMLDataExporter />
  </div>

</template>

<script setup>
import { Tools, Location } from '@element-plus/icons-vue';
import SearchTool from './SearchTool.vue';
import AreaControls from './area-selector/AreaControls.vue';
import KMLDataExporter from './kml-basemap/KMLDataExporter.vue';

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
    gap: 0; /* 去掉父容器间距，按钮间距由 .controls-group 控制 */
    padding: 4px 4px;
    background: transparent; 
    border-radius: 4px;
    box-shadow: none; 
    backdrop-filter: none; 

    .controls-group {
      display: flex;
      align-items: center;
      gap: 0; /* 所有按钮紧贴 */
      flex-wrap: wrap; /* 当空间不足时换行 */
    }

    /* 确保 Element Plus 的按钮没有外边距导致空隙，但保留内部 padding */
    .controls-group > * {
      margin: 0 !important;
      /* don't reset padding here so button text has normal spacing */
      align-self: center !important;
    }

    /* 按钮背景要相互贴合：中间按钮取消圆角，首尾按钮保留圆角 */
    .controls-group > * {
      border-radius: 0 !important;
    }
    .controls-group > *:first-child {
      border-top-left-radius: 8px !important;
      border-bottom-left-radius: 8px !important;
    }
    .controls-group > *:last-child {
      border-top-right-radius: 8px !important;
      border-bottom-right-radius: 8px !important;
    }

    .el-button {
      /* restore comfortable internal padding */
      padding: 6px 12px !important;
      transition: all 0.3s ease; 

      &:hover {
        transform: translateY(-1px); 
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); 
      }

      &:active {
        transform: translateY(0); 
      }
    }

    /* 优先显示的按钮：不随宽度压缩，保持在首行（除非空间实在不够） */
    .priority {
      flex: 0 0 auto !important;
      white-space: nowrap;
    }

    .search-wrapper {
      display: inline-flex;
      align-items: center;
    }

    /* 处理嵌套的 AreaControls 中的 el-button-group，使其按钮也紧贴 */
    .controls-group .area-controls,
    .controls-group .area-controls .el-button-group {
      margin: 0 !important;
      gap: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
    }

    .el-button.btn-circle-area .el-icon {
      color: #fff !important;
    }

    /* Custom button color classes (use background + border overrides) */
    .btn-search {
      /* 赤红色 */
      --btn-bg: #d32f2f;
    }

    .btn-kml-settings {
      --btn-bg: #1976d2; /* 蓝色 */
      background: var(--btn-bg) !important;
      border-color: var(--btn-bg) !important;
      color: #fff !important;
    }

    .btn-point-icons {
      --btn-bg: #7b1fa2; /* 紫色 */
      background: var(--btn-bg) !important;
      border-color: var(--btn-bg) !important;
      color: #fff !important;
    }

    .btn-show-list {
      --btn-bg: #f06292; /* 粉色 */
      background: var(--btn-bg) !important;
      border-color: var(--btn-bg) !important;
      color: #fff !important;
    }

    .btn-toggle-kml {
      --btn-bg: #ffffff; /* 白色 */
      background: var(--btn-bg) !important;
      border-color: #dcdcdc !important;
      color: #333 !important;
    }

    /* Search wrapper contains the SearchTool which may include buttons; ensure background shows */
    .btn-search ::v-deep .el-input__inner,
    .btn-search ::v-deep .el-button {
      background: var(--btn-bg) !important;
      border-color: var(--btn-bg) !important;
      color: #fff !important;
    }
  }

  @media (max-width: 768px) {
    .toolbar {
      top: 10px;
      right: 40px;

      .el-button-group {
        flex-direction: column;

        .el-button {
          margin: 0 0 4px 0;
        }
      }
    }
  }
}
</style>

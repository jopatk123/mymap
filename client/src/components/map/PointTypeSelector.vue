<template>
  <div class="point-type-list">
    <div class="list-header">
      <h3>点位类型</h3>
    </div>

    <div class="point-type-items">
      <div
        v-for="type in pointTypes"
        :key="type.value"
        class="point-type-item"
        :class="{ active: selectedType === type.value }"
        @click="selectType(type.value)"
      >
        <div :class="['type-icon', type.iconClass]">
          <el-icon>
            <component :is="type.icon" />
          </el-icon>
        </div>
        <div class="type-info">
          <span class="type-name">{{ type.name }}</span>
          <span class="type-desc">{{ type.description }}</span>
        </div>
        <div class="type-preview">
          <StylePreview :style-config="type.previewStyles" :show-full-preview="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { VideoPlay, Camera } from '@element-plus/icons-vue';
import StylePreview from './styles/StylePreview.vue';

const props = defineProps({
  selectedType: {
    type: String,
    default: '',
  },
  videoStyles: {
    type: Object,
    default: () => ({}),
  },
  panoramaStyles: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:selectedType']);

const pointTypes = [
  {
    value: 'video',
    name: '视频点位',
    description: '设置视频点位的图标和标签样式',
    icon: VideoPlay,
    iconClass: 'video-icon',
    previewStyles: props.videoStyles,
  },
  {
    value: 'panorama',
    name: '全景图点位',
    description: '设置全景图点位的图标和标签样式',
    icon: Camera,
    iconClass: 'panorama-icon',
    previewStyles: props.panoramaStyles,
  },
];

const selectType = (type) => {
  emit('update:selectedType', type);
};
</script>

<style lang="scss" scoped>
.point-type-list {
  width: 320px;
  border-right: 1px solid #e4e7ed;
  padding-right: 20px;

  .list-header {
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .point-type-items {
    .point-type-item {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s;
      gap: 12px;

      &:hover {
        border-color: #409eff;
        background-color: #f0f9ff;
      }

      &.active {
        border-color: #409eff;
        background-color: #e6f7ff;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
      }

      .type-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;

        &.video-icon {
          background-color: #ff4757;
          color: white;
        }

        &.panorama-icon {
          background-color: #2ed573;
          color: white;
        }
      }

      .type-info {
        flex: 1;

        .type-name {
          display: block;
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 4px;
          color: #303133;
        }

        .type-desc {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
      }

      .type-preview {
        width: 60px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}
</style>

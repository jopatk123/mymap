<template>
  <div class="map-type-switch">
    <el-button-group>
      <el-button :type="mapType === 'normal' ? 'primary' : ''" @click="$emit('change', 'normal')">
        普通
      </el-button>
      <el-button :type="mapType === 'satellite' ? 'primary' : ''" @click="$emit('change', 'satellite')">
        卫星
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup>
// 地图右上角的基础类型切换控件（普通/卫星）
defineProps({
  mapType: {
    type: String,
    default: 'normal',
  },
});

defineEmits(['change']);
</script>

<style scoped lang="scss">
.map-type-switch {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .el-button-group {
    display: flex;
  }
}
</style>

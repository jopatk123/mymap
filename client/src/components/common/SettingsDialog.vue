<template>
  <el-dialog
    v-model="visible"
    title="系统设置"
    width="500px"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 地图设置 -->
      <el-tab-pane label="地图设置" name="map">
        <el-form label-width="120px">
          <el-form-item label="地图底图">
              <el-radio-group v-model="mapSettings.mapType">
              <el-radio value="normal">普通地图</el-radio>
              <el-radio value="satellite">卫星地图</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      
      <!-- 系统信息 -->
      <el-tab-pane label="系统信息" name="system">
        <div class="system-info">
          <div class="info-item">
            <span class="label">版本号：</span>
            <span class="value">v1.0.0</span>
          </div>
          <div class="info-item">
            <span class="label">浏览器：</span>
            <span class="value">{{ browserInfo }}</span>
          </div>
          <div class="info-item">
            <span class="label">屏幕分辨率：</span>
            <span class="value">{{ screenResolution }}</span>
          </div>
          <div class="info-item">
            <span class="label">网络状态：</span>
            <span class="value" :class="{ online: isOnline, offline: !isOnline }">
              {{ isOnline ? '在线' : '离线' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">设备类型：</span>
            <span class="value">{{ isMobile ? '移动设备' : '桌面设备' }}</span>
          </div>
          
          <div class="system-actions">
            <el-button @click="clearCache" type="warning">
              <el-icon><Delete /></el-icon>
              清除缓存
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleSave" type="primary">保存设置</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/app.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Store
const appStore = useAppStore()
const { 
  mapSettings: originalMapSettings,
  isOnline,
  isMobile,
  screenWidth,
  screenHeight
} = storeToRefs(appStore)

// 当前选中的标签页
const activeTab = ref('map')

// 本地设置副本（避免直接修改store）
const mapSettings = reactive({ ...originalMapSettings.value })

// 计算属性
const browserInfo = computed(() => {
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return '未知浏览器'
})

const screenResolution = computed(() => {
  return `${screenWidth.value} × ${screenHeight.value}`
})

// 保存设置
const handleSave = () => {
  try {
    // 更新store中的设置
    appStore.updateMapSettings(mapSettings)
    
    ElMessage.success('设置已保存')
    handleClose()
  } catch (error) {
    ElMessage.error('保存设置失败')
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  // 重置本地设置为原始值
  Object.assign(mapSettings, originalMapSettings.value)
}

// 清除缓存
const clearCache = async () => {
  try {
    await ElMessageBox.confirm(
      '清除缓存将删除所有本地存储的数据，确定要继续吗？',
      '确认清除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 清除localStorage
    localStorage.clear()
    
    // 清除sessionStorage
    sessionStorage.clear()
    
    // 清除缓存（如果支持）
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }
    
    ElMessage.success('缓存已清除')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清除缓存失败')
    }
  }
}


</script>

<style lang="scss" scoped>
.system-info {
  .info-item {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    
    .label {
      font-weight: 500;
      color: #606266;
      min-width: 100px;
    }
    
    .value {
      color: #303133;
      
      &.online {
        color: #67c23a;
      }
      
      &.offline {
        color: #f56c6c;
      }
    }
  }
  
  .system-actions {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 12px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .system-actions {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
}
</style>
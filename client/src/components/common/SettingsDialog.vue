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
          <el-form-item label="默认中心点">
            <div class="coordinate-input">
              <el-input
                v-model="mapSettings.defaultCenter[0]"
                placeholder="纬度"
                type="number"
                step="0.000001"
              />
              <span class="separator">,</span>
              <el-input
                v-model="mapSettings.defaultCenter[1]"
                placeholder="经度"
                type="number"
                step="0.000001"
              />
            </div>
          </el-form-item>
          
          <el-form-item label="默认缩放级别">
            <el-slider
              v-model="mapSettings.defaultZoom"
              :min="1"
              :max="18"
              :step="1"
              show-input
            />
          </el-form-item>
          
          <el-form-item label="默认地图类型">
            <el-radio-group v-model="mapSettings.mapType">
              <el-radio label="normal">普通地图</el-radio>
              <el-radio label="satellite">卫星地图</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="显示控件">
            <el-checkbox v-model="mapSettings.showControls">
              显示地图控制按钮
            </el-checkbox>
          </el-form-item>
          
          <el-form-item label="启用定位">
            <el-checkbox v-model="mapSettings.enableGeolocation">
              启用地理定位功能
            </el-checkbox>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      
      <!-- 全景图设置 -->
      <el-tab-pane label="全景图设置" name="panorama">
        <el-form label-width="120px">
          <el-form-item label="自动旋转">
            <el-checkbox v-model="panoramaSettings.autoRotate">
              启用自动旋转
            </el-checkbox>
          </el-form-item>
          
          <el-form-item label="旋转速度" v-if="panoramaSettings.autoRotate">
            <el-slider
              v-model="panoramaSettings.autoRotateSpeed"
              :min="-10"
              :max="10"
              :step="0.5"
              show-input
            />
            <div class="setting-tip">负值为逆时针，正值为顺时针</div>
          </el-form-item>
          
          <el-form-item label="显示指南针">
            <el-checkbox v-model="panoramaSettings.showCompass">
              显示指南针控件
            </el-checkbox>
          </el-form-item>
          
          <el-form-item label="显示缩放控件">
            <el-checkbox v-model="panoramaSettings.showZoomControls">
              显示缩放控制按钮
            </el-checkbox>
          </el-form-item>
          
          <el-form-item label="显示全屏控件">
            <el-checkbox v-model="panoramaSettings.showFullscreenControl">
              显示全屏控制按钮
            </el-checkbox>
          </el-form-item>
          
          <el-form-item label="默认视野角度">
            <el-slider
              v-model="panoramaSettings.defaultHfov"
              :min="30"
              :max="120"
              :step="5"
              show-input
            />
            <div class="setting-tip">角度越小，视野越窄</div>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      
      <!-- 用户偏好 -->
      <el-tab-pane label="用户偏好" name="preferences">
        <el-form label-width="120px">
          <el-form-item label="语言">
            <el-select v-model="userPreferences.language" style="width: 100%">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en-US" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="坐标格式">
            <el-radio-group v-model="userPreferences.coordinateFormat">
              <el-radio label="decimal">十进制 (39.9042, 116.4074)</el-radio>
              <el-radio label="dms">度分秒 (39°54'15"N, 116°24'27"E)</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="距离单位">
            <el-radio-group v-model="userPreferences.distanceUnit">
              <el-radio label="metric">公制 (米/千米)</el-radio>
              <el-radio label="imperial">英制 (英尺/英里)</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="主题">
            <el-radio-group v-model="theme">
              <el-radio label="light">浅色主题</el-radio>
              <el-radio label="dark">深色主题</el-radio>
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
            <el-button @click="resetSettings" type="danger">
              <el-icon><RefreshLeft /></el-icon>
              重置设置
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
import { Delete, RefreshLeft } from '@element-plus/icons-vue'
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
  theme,
  mapSettings: originalMapSettings,
  panoramaSettings: originalPanoramaSettings,
  userPreferences: originalUserPreferences,
  isOnline,
  isMobile,
  screenWidth,
  screenHeight
} = storeToRefs(appStore)

// 当前选中的标签页
const activeTab = ref('map')

// 本地设置副本（避免直接修改store）
const mapSettings = reactive({ ...originalMapSettings.value })
const panoramaSettings = reactive({ ...originalPanoramaSettings.value })
const userPreferences = reactive({ ...originalUserPreferences.value })

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
    appStore.updatePanoramaSettings(panoramaSettings)
    appStore.updateUserPreferences(userPreferences)
    
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
  Object.assign(panoramaSettings, originalPanoramaSettings.value)
  Object.assign(userPreferences, originalUserPreferences.value)
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

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm(
      '重置设置将恢复所有默认配置，确定要继续吗？',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    appStore.resetSettings()
    
    // 更新本地设置副本
    Object.assign(mapSettings, appStore.mapSettings)
    Object.assign(panoramaSettings, appStore.panoramaSettings)
    Object.assign(userPreferences, appStore.userPreferences)
    
    ElMessage.success('设置已重置')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置设置失败')
    }
  }
}
</script>

<style lang="scss" scoped>
.coordinate-input {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .el-input {
    flex: 1;
  }
  
  .separator {
    color: #909399;
    font-weight: 500;
  }
}

.setting-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

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
        color: $success-color;
      }
      
      &.offline {
        color: $danger-color;
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
  .coordinate-input {
    flex-direction: column;
    align-items: stretch;
    
    .separator {
      display: none;
    }
  }
  
  .system-actions {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
}
</style>
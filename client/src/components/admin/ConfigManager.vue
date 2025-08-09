<template>
  <div class="config-manager">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>系统配置管理</span>
          <el-button 
            type="primary" 
            @click="saveAllConfigs"
            :loading="saving"
          >
            保存所有配置
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 点位样式配置 -->
        <el-tab-pane label="点位样式" name="pointStyles">
          <div class="config-section">
            <h3>全景图点位样式</h3>
            <point-style-editor 
              v-model="config.pointStyles.panorama"
              @change="markConfigChanged('pointStyles')"
            />
            
            <h3>视频点位样式</h3>
            <point-style-editor 
              v-model="config.pointStyles.video"
              @change="markConfigChanged('pointStyles')"
            />
          </div>
        </el-tab-pane>

        <!-- KML样式配置 -->
        <el-tab-pane label="KML样式" name="kmlStyles">
          <div class="config-section">
            <h3>默认KML样式</h3>
            <kml-style-editor 
              v-model="config.kmlStyles.default"
              @change="markConfigChanged('kmlStyles')"
            />
          </div>
        </el-tab-pane>

        <!-- 地图设置 -->
        <el-tab-pane label="地图设置" name="mapSettings">
          <div class="config-section">
            <el-form :model="config.mapSettings" label-width="120px">
              <el-form-item label="默认中心点">
                <base-coordinate-input 
                  v-model="config.mapSettings.defaultCenter"
                  @change="markConfigChanged('mapSettings')"
                />
              </el-form-item>
              
              <el-form-item label="默认缩放级别">
                <el-slider
                  v-model="config.mapSettings.defaultZoom"
                  :min="3"
                  :max="18"
                  show-input
                  @change="markConfigChanged('mapSettings')"
                />
              </el-form-item>
              
              <el-form-item label="最小缩放级别">
                <el-slider
                  v-model="config.mapSettings.minZoom"
                  :min="1"
                  :max="10"
                  show-input
                  @change="markConfigChanged('mapSettings')"
                />
              </el-form-item>
              
              <el-form-item label="最大缩放级别">
                <el-slider
                  v-model="config.mapSettings.maxZoom"
                  :min="15"
                  :max="20"
                  show-input
                  @change="markConfigChanged('mapSettings')"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 上传设置 -->
        <el-tab-pane label="上传设置" name="uploadSettings">
          <div class="config-section">
            <el-form :model="config.uploadSettings" label-width="120px">
              <el-form-item label="最大文件大小">
                <el-input-number
                  v-model="config.uploadSettings.maxFileSize"
                  :min="1048576"
                  :max="1073741824"
                  :step="1048576"
                  @change="markConfigChanged('uploadSettings')"
                />
                <span class="unit">字节</span>
              </el-form-item>
              
              <el-form-item label="缩略图尺寸">
                <div class="size-inputs">
                  <el-input-number
                    v-model="config.uploadSettings.thumbnailSize.width"
                    :min="100"
                    :max="800"
                    @change="markConfigChanged('uploadSettings')"
                  />
                  <span>×</span>
                  <el-input-number
                    v-model="config.uploadSettings.thumbnailSize.height"
                    :min="100"
                    :max="600"
                    @change="markConfigChanged('uploadSettings')"
                  />
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { configApi } from '@/api/config.js'
import PointStyleEditor from './styles/PointStyleEditor.vue'
import KmlStyleEditor from './styles/KmlStyleEditor.vue'
import BaseCoordinateInput from '@/components/common/BaseCoordinateInput.vue'

const activeTab = ref('pointStyles')
const saving = ref(false)
const changedSections = ref(new Set())

const config = reactive({
  pointStyles: {
    panorama: {},
    video: {}
  },
  kmlStyles: {
    default: {}
  },
  mapSettings: {},
  uploadSettings: {}
})

const loadConfig = async () => {
  try {
    const response = await configApi.getConfig()
    Object.assign(config, response.data)
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

const markConfigChanged = (section) => {
  changedSections.value.add(section)
}

const saveAllConfigs = async () => {
  if (changedSections.value.size === 0) {
    ElMessage.info('没有配置需要保存')
    return
  }

  try {
    await ElMessageBox.confirm('确定要保存配置更改吗？', '确认保存', {
      type: 'warning'
    })

    saving.value = true
    // 保存需要通知的章节
    const changedSectionsList = Array.from(changedSections.value)
    await configApi.updateConfig(config)
    changedSections.value.clear()
    ElMessage.success('配置保存成功')
    
    // 使用localStorage标记配置已更新，供地图页面检测
    localStorage.setItem('configUpdated', Date.now().toString())
  } catch (error) {
    if (error !== 'cancel') {
      console.error('保存配置失败:', error)
      ElMessage.error('保存配置失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.config-manager {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-section {
  padding: 20px;
}

.config-section h3 {
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
}

.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-inputs span {
  color: var(--el-text-color-secondary);
}
</style>
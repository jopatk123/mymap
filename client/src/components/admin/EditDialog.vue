<template>
  <el-dialog
    v-model="visible"
    title="编辑全景图"
    width="600px"
    @close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入全景图标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入全景图描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="坐标" prop="coordinate">
        <div class="coordinate-input">
          <el-input
            v-model="form.lat"
            placeholder="纬度"
            type="number"
            step="0.000001"
          />
          <span class="separator">,</span>
          <el-input
            v-model="form.lng"
            placeholder="经度"
            type="number"
            step="0.000001"
          />
          <el-button @click="getCurrentLocation" :loading="locating" type="info">
            <el-icon><Location /></el-icon>
            定位
          </el-button>
        </div>
      </el-form-item>
      
      <el-form-item label="图片URL" prop="imageUrl">
        <el-input
          v-model="form.imageUrl"
          placeholder="全景图URL"
          readonly
        />
      </el-form-item>
      
      <!-- 预览 -->
      <el-form-item v-if="form.imageUrl" label="预览">
        <div class="preview-container">
          <img :src="form.imageUrl" alt="预览" class="preview-image" />
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          @click="handleSubmit"
          type="primary"
          :loading="submitting"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Location } from '@element-plus/icons-vue'
import { usePanoramaStore } from '@/store/panorama.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  panorama: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单引用
const formRef = ref(null)

// Store
const panoramaStore = usePanoramaStore()

// 表单数据
const form = reactive({
  title: '',
  description: '',
  lat: '',
  lng: '',
  imageUrl: '',
  thumbnailUrl: ''
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  lat: [
    { required: true, message: '请输入纬度', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        const lat = parseFloat(value)
        if (isNaN(lat) || lat < -90 || lat > 90) {
          callback(new Error('纬度必须在 -90 到 90 之间'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  lng: [
    { required: true, message: '请输入经度', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        const lng = parseFloat(value)
        if (isNaN(lng) || lng < -180 || lng > 180) {
          callback(new Error('经度必须在 -180 到 180 之间'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

// 状态
const submitting = ref(false)
const locating = ref(false)

// 监听全景图数据变化
watch(() => props.panorama, (newPanorama) => {
  if (newPanorama) {
    form.title = newPanorama.title || ''
    form.description = newPanorama.description || ''
    form.lat = newPanorama.lat?.toString() || ''
    form.lng = newPanorama.lng?.toString() || ''
    form.imageUrl = newPanorama.imageUrl || ''
    form.thumbnailUrl = newPanorama.thumbnailUrl || ''
  }
}, { immediate: true })

// 获取当前位置
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('浏览器不支持地理定位')
    return
  }
  
  locating.value = true
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.lat = position.coords.latitude.toFixed(6)
      form.lng = position.coords.longitude.toFixed(6)
      locating.value = false
      ElMessage.success('定位成功')
    },
    (error) => {
      console.error('定位失败:', error)
      locating.value = false
      ElMessage.error('定位失败，请手动输入坐标')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  )
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    // 表单验证
    await formRef.value.validate()
    
    submitting.value = true
    
    // 更新全景图
    await panoramaStore.updatePanorama(props.panorama.id, {
      title: form.title,
      description: form.description,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      imageUrl: form.imageUrl,
      thumbnailUrl: form.thumbnailUrl
    })
    
    ElMessage.success('更新成功')
    emit('success')
    handleClose()
    
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  form.title = ''
  form.description = ''
  form.lat = ''
  form.lng = ''
  form.imageUrl = ''
  form.thumbnailUrl = ''
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

.preview-container {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  
  .preview-image {
    width: 100%;
    height: auto;
    display: block;
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
}
</style>
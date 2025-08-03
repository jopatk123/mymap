<template>
  <el-dialog
    v-model="visible"
    title="移动到文件夹"
    width="400px"
    @close="handleClose"
  >
    <el-form label-width="80px">
      <el-form-item label="目标文件夹">
        <el-select
          v-model="moveToFolderId"
          placeholder="选择文件夹（留空表示移动到根目录）"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="folder in validFolders"
            :key="folder.id"
            :label="folder.name || '未命名文件夹'"
            :value="folder.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleConfirm" type="primary" :loading="moving">
          移动
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useFolderStore } from '@/store/folder.js'
import { usePanoramaStore } from '@/store/panorama.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  panoramas: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const folderStore = useFolderStore()
const panoramaStore = usePanoramaStore()
const { flatFolders } = storeToRefs(folderStore)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const moveToFolderId = ref(null)
const moving = ref(false)

const validFolders = computed(() => {
  return flatFolders.value.filter(folder => 
    folder && 
    folder.id !== null && 
    folder.id !== undefined &&
    (typeof folder.id === 'number' || typeof folder.id === 'string')
  )
})

const handleClose = () => {
  visible.value = false
  moveToFolderId.value = null
}

const handleConfirm = async () => {
  try {
    moving.value = true
    
    const ids = props.panoramas.map(p => p.id)
    const targetFolderId = moveToFolderId.value || null
    await panoramaStore.batchMovePanoramasToFolder(ids, targetFolderId)
    
    ElMessage.success('移动成功')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('移动失败: ' + error.message)
  } finally {
    moving.value = false
  }
}

// 监听对话框打开，加载文件夹数据
watch(visible, async (newVal) => {
  if (newVal) {
    try {
      await folderStore.fetchFolders()
    } catch (error) {
      ElMessage.error('加载文件夹失败: ' + error.message)
    }
  }
})
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
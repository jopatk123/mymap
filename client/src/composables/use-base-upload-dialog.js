import { ref, computed, reactive, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';

export function useBaseUploadDialog(props, emit) {
  // 响应式数据
  const formRef = ref(null);
  const uploadRef = ref(null);
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const processing = ref(false);
  const processingText = ref('');

  // 使用全局 store
  let folderStore = null;
  const folders = ref([]);

  // 计算属性
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

  // 基础表单数据
  const form = reactive({
    title: '',
    description: '',
    lat: null,
    lng: null,
    file: null,
    folderId: null, // 初始为null，加载文件夹后设置为默认文件夹ID
  });

  // 基础验证规则
  const baseRules = {
    title: [
      { required: true, message: '请输入标题', trigger: 'blur' },
      { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' },
    ],
    file: [
      {
        required: true,
        message: '请选择文件',
        trigger: 'change',
        validator: (rule, value, callback) => {
          if (!value) {
            callback(new Error('请选择文件'));
          } else {
            callback();
          }
        },
      },
    ],
  };

  // 坐标计算属性
  const coordinates = computed({
    get: () => [form.lng, form.lat],
    set: (value) => {
      if (Array.isArray(value) && value.length >= 2) {
        // 确保值是数字类型或null
        const lng = value[0];
        const lat = value[1];
        form.lng = lng !== null && lng !== undefined ? parseFloat(lng) : null;
        form.lat = lat !== null && lat !== undefined ? parseFloat(lat) : null;
      } else {
        form.lng = null;
        form.lat = null;
      }
    },
  });

  // 合并验证规则
  const computedRules = computed(() => ({
    ...baseRules,
    ...props.additionalRules,
  }));

  // 提交按钮状态
  const canSubmit = computed(() => {
    const hasFile = form.file && form.file instanceof File;
    const notUploading = !uploading.value && !processing.value;
    return hasFile && notUploading;
  });

  const submitButtonText = computed(() => {
    return uploading.value ? '上传中...' : '确定上传';
  });

  // 加载文件夹
  const loadFolders = async () => {
    try {
      const { useFolderStore } = await import('@/store/folder.js');
      folderStore = useFolderStore();

      // 使用全局 store 获取文件夹数据
      await folderStore.fetchFolders();

      // 创建对 store 数据的响应式引用
      watch(
        () => folderStore.flatFolders,
        (newFolders) => {
          folders.value = newFolders || [];
          // 如果用户还没有选择文件夹，自动设置默认文件夹
          if (newFolders && newFolders.length > 0 && form.folderId === null) {
            const defaultFolder = newFolders.find((folder) => folder.name === '默认文件夹');
            if (defaultFolder) {
              form.folderId = defaultFolder.id;
            } else {
              form.folderId = newFolders[0].id;
            }
          }
        },
        { immediate: true }
      );
    } catch (error) {
      console.error('加载文件夹失败:', error);
      folders.value = [];
    }
  };

  // 提交处理
  const handleSubmit = async () => {
    if (!formRef.value) return;

    try {
      await formRef.value.validate();

      uploading.value = true;
      uploadProgress.value = 0;

      await props.submitHandler(form, {
        setProgress: (progress) => {
          uploadProgress.value = progress;
        },
        setProcessing: (isProcessing, text = '') => {
          processing.value = isProcessing;
          processingText.value = text;
        },
      });

      ElMessage.success('上传成功');
      emit('success');
      handleClose();
    } catch (error) {
      console.error('上传失败:', error);
      ElMessage.error('上传失败: ' + error.message);
    } finally {
      uploading.value = false;
      uploadProgress.value = 0;
      processing.value = false;
    }
  };

  // 关闭对话框
  const handleClose = () => {
    visible.value = false;
    resetForm(); // 异步调用，但不等待
  };

  // 重置表单
  const resetForm = () => {
    if (formRef.value) {
      formRef.value.resetFields();
    }

    // 获取默认文件夹ID
    let defaultFolderId = null;
    if (folders.value.length > 0) {
      const defaultFolder = folders.value.find((folder) => folder.name === '默认文件夹');
      if (defaultFolder) {
        defaultFolderId = defaultFolder.id;
      } else {
        defaultFolderId = folders.value[0].id;
      }
    }

    Object.assign(form, {
      title: '',
      description: '',
      lat: null,
      lng: null,
      file: null,
      folderId: defaultFolderId,
    });

    uploadProgress.value = 0;
    processing.value = false;
    processingText.value = '';

    if (uploadRef.value) {
      uploadRef.value.clearFiles();
    }
  };

  // 初始化
  onMounted(() => {
    loadFolders();
  });

  return {
    visible,
    form,
    formRef,
    uploadRef,
    folders,
    processing,
    processingText,
    uploading,
    uploadProgress,
    computedRules,
    coordinates,
    canSubmit,
    submitButtonText,
    handleClose,
    handleSubmit,
    resetForm,
    loadFolders,
  };
}

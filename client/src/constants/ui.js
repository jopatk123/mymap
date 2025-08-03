// UI相关常量
export const UI_CONFIG = {
  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
  },
  
  // 侧边栏配置
  SIDEBAR: {
    DEFAULT_WIDTH: 350,
    COLLAPSED_WIDTH: 40
  },
  
  // 加载状态
  LOADING_MESSAGES: {
    FETCHING: '正在加载数据...',
    UPLOADING: '正在上传...',
    DELETING: '正在删除...',
    UPDATING: '正在更新...'
  },
  
  // 排序选项
  SORT_OPTIONS: [
    { label: '创建时间', value: 'createdAt' },
    { label: '标题', value: 'title' },
    { label: '纬度', value: 'latitude' },
    { label: '经度', value: 'longitude' }
  ],
  
  // 文件上传限制
  UPLOAD: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png']
  }
}
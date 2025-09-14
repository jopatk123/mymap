// API相关常量
export const API_CONFIG = {
  // 基础URL
  // 默认使用相对路径 /api（由 nginx 或后台代理），避免硬编码容器内网地址到前端构建。
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',

  // 请求超时时间
  TIMEOUT: 30000,

  // API端点
  ENDPOINTS: {
    PANORAMAS: '/api/panoramas',
    FOLDERS: '/api/folders',
    UPLOAD: '/api/upload',
    COORDINATE: '/api/panoramas/convert-coordinate',
  },

  // HTTP状态码
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  },

  // 错误消息
  ERROR_MESSAGES: {
    NETWORK_ERROR: '网络连接失败，请检查网络设置',
    TIMEOUT_ERROR: '请求超时，请稍后重试',
    SERVER_ERROR: '服务器错误，请稍后重试',
    NOT_FOUND: '请求的资源不存在',
    UNAUTHORIZED: '未授权访问',
  },
};

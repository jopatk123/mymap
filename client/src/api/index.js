import axios from 'axios';
import { ElMessage } from 'element-plus';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    void console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response;

    // 统一处理响应格式
    if (data.code !== undefined) {
      if (data.code === 200) {
        return data.data;
      } else {
        ElMessage.error(data.message || '请求失败');
        return Promise.reject(new Error(data.message || '请求失败'));
      }
    }

    // 处理新的响应格式 {success, data, ...}
    if (data.success !== undefined) {
      if (data.success) {
        return data;
      } else {
        ElMessage.error(data.message || '请求失败');
        return Promise.reject(new Error(data.message || '请求失败'));
      }
    }

    return data;
  },
  (error) => {
    void console.error('响应错误:', error);

    if (error.response) {
      const { status, data } = error.response;
      const requestUrl = error.config?.url || '';

      if (requestUrl.includes('/auth/login')) {
        const defaultLoginMessage = (() => {
          switch (status) {
            case 404:
              return '用户名不存在';
            case 401:
              return '密码错误，请重新输入';
            default:
              return '登录失败，请稍后重试';
          }
        })();
        const loginMessage = data?.message || defaultLoginMessage;
        return Promise.reject(new Error(loginMessage));
      }

      // 处理不同的错误状态
      switch (status) {
        case 401: {
          ElMessage.error('未授权，请重新登录');
          const isSuperAdminRequest = requestUrl.includes('/super-admin');
          const isSuperAdminPage =
            typeof window !== 'undefined' && window.location.pathname.startsWith('/super-admin');
          if (!isSuperAdminRequest && !isSuperAdminPage && typeof window !== 'undefined') {
            const current = window.location.pathname + window.location.search;
            const redirect = encodeURIComponent(current);
            if (!window.location.pathname.startsWith('/login')) {
              window.location.href = `/login?redirect=${redirect}`;
            }
          }
          break;
        }
        case 403:
          ElMessage.error('权限不足');
          break;
        case 404:
          // 对于删除操作，404是正常的（记录已被删除）
          if (error.config?.method?.toLowerCase() === 'delete') {
            // 删除操作的404不显示错误消息
          } else {
            ElMessage.error('请求的资源不存在');
          }
          break;
        case 500:
          ElMessage.error('服务器内部错误');
          break;
        default:
          ElMessage.error(data?.message || '请求失败');
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接');
    } else {
      ElMessage.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

export default api;

import api from './index';

// 超级管理员登录
export const superAdminLogin = (password) => api.post('/super-admin/login', { password });

// 超级管理员登出
export const superAdminLogout = () => api.post('/super-admin/logout');

// 检查超级管理员登录状态
export const checkSuperAdminAuth = () => api.get('/super-admin/check');

// 获取所有用户列表
export const getAllUsers = () => api.get('/super-admin/users');

// 创建新用户
export const createUser = (payload) => api.post('/super-admin/users', payload);

// 强制修改用户密码
export const forceChangePassword = (userId, newPassword) => 
  api.put(`/super-admin/users/${userId}/password`, { newPassword });

// 切换用户激活状态
export const toggleUserActive = (userId) => 
  api.put(`/super-admin/users/${userId}/toggle-active`);

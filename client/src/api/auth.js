import api from './index';

export const login = (payload) => api.post('/auth/login', payload);
export const logout = () => api.post('/auth/logout');
export const register = (payload) => api.post('/auth/register', payload);
export const fetchCurrentUser = () => api.get('/auth/me');

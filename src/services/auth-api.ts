import api from './api'

export const authAPI = {
  // 用户登录
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),

  // 用户注册
  register: (userData: { 
    username: string; 
    email: string; 
    password: string; 
    role?: string 
  }) => 
    api.post('/auth/register', userData),

  // 获取用户资料
  getProfile: () => 
    api.get('/auth/me'),

  // 更新用户资料
  updateProfile: (userData: Partial<{ username: string; email: string; avatar: string }>) => 
    api.put('/auth/profile', userData),

  // 修改密码
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/auth/change-password', data),

  // 忘记密码
  forgotPassword: (email: string) => 
    api.post('/auth/forgot-password', { email }),

  // 重置密码
  resetPassword: (data: { token: string; newPassword: string }) => 
    api.post('/auth/reset-password', data),

  // 获取可指派的用户列表（用于需求指派）
  getAssignableUsers: (search?: string) => 
    api.get(`/users/assignable${search ? `?search=${encodeURIComponent(search)}` : ''}`),
}

export default authAPI
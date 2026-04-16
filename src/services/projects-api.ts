import api from './api'

export interface Project {
  _id: string
  name: string
  description: string
  status: '规划中' | '进行中' | '测试中' | '已完成' | '已归档'
  startDate: string
  endDate?: string
  owner: {
    _id: string
    username: string
    email: string
  }
  members: Array<{
    user: {
      _id: string
      username: string
      email?: string
    }
    role: string
    joinedAt: string
  }>
  priority: '低' | '中' | '高' | '紧急'
  progress: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description: string
  status?: '规划中' | '进行中' | '测试中' | '已完成' | '已归档'
  startDate: string
  endDate?: string
  priority?: '低' | '中' | '高' | '紧急'
  team?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: '规划中' | '进行中' | '测试中' | '已完成' | '已归档'
  startDate?: string
  endDate?: string
  priority?: '低' | '中' | '高' | '紧急'
  team?: string[]
  progress?: number
}

export interface Task {
  _id: string
  projectId: string
  title: string
  description: string
  status: '待办' | '进行中' | '已完成' | '已阻塞'
  priority: '低' | '中' | '高' | '紧急'
  assignee: {
    _id: string
    username: string
  }
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  projectId: string
  title: string
  description?: string
  status?: '待办' | '进行中' | '已完成' | '已阻塞'
  priority?: '低' | '中' | '高' | '紧急'
  assignee?: string
  dueDate?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: '待办' | '进行中' | '已完成' | '已阻塞'
  priority?: '低' | '中' | '高' | '紧急'
  assignee?: string
  dueDate?: string
}

export const projectsAPI = {
  // 获取项目列表
  getProjects: (params?: { page?: number; limit?: number; status?: string; search?: string }) => 
    api.get('/projects', { params }),

  // 获取单个项目
  getProject: (id: string) => api.get(`/projects/${id}`),

  // 创建项目
  createProject: (data: CreateProjectRequest) => api.post('/projects', data),

  // 更新项目
  updateProject: (id: string, data: UpdateProjectRequest) => api.put(`/projects/${id}`, data),

  // 删除项目
  deleteProject: (id: string) => api.delete(`/projects/${id}`),

  // 添加项目成员
  addMember: (projectId: string, userId: string, role?: string) => 
    api.post(`/projects/${projectId}/members`, { userId, role }),

  // 移除项目成员
  removeMember: (projectId: string, memberId: string) => 
    api.delete(`/projects/${projectId}/members/${memberId}`),

  // 更新项目进度
  updateProgress: (id: string, progress: number) => api.put(`/projects/${id}/progress`, { progress }),

  // ========== 任务 API ==========
  // 获取项目任务列表
  getTasks: (projectId: string, params?: { status?: string; priority?: string; page?: number; limit?: number }) => 
    api.get(`/tasks?projectId=${projectId}`, { params }),

  // 创建任务
  createTask: (data: CreateTaskRequest) => api.post('/tasks', data),

  // 更新任务
  updateTask: (id: string, data: UpdateTaskRequest) => api.put(`/tasks/${id}`, data),

  // 删除任务
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),

  // ========== 需求 API ==========
  // 获取项目需求列表
  getProjectRequirements: (projectId: string, params?: { status?: string; priority?: string; page?: number; limit?: number }) =>
    api.get(`/requirements?projectId=${projectId}`, { params }),

  // 创建需求
  createRequirement: (data: any) => api.post('/requirements', data),

  // 更新需求
  updateRequirement: (id: string, data: any) => api.put(`/requirements/${id}`, data),

  // 删除需求
  deleteRequirement: (id: string) => api.delete(`/requirements/${id}`),

  // ========== 用户 API ==========
  // 获取可指派的用户列表
  getAssignableUsers: (search?: string) => api.get('/users/assignable', { params: { search } }),
}

export default projectsAPI
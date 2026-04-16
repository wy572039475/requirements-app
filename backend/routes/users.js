import express from 'express'
import User from '../models/User.js'
import { authenticateToken, authorize } from '../middleware/auth.js'

const router = express.Router()

// 获取可指派的用户列表（普通用户也可访问）
router.get('/assignable', authenticateToken, async (req, res) => {
  try {
    const { search = '' } = req.query
    
    const filter = { isActive: true }
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const users = await User.find(filter)
      .select('_id username email avatar role')
      .sort({ username: 1 })
      .limit(100)

    res.json({
      success: true,
      data: { users }
    })
  } catch (error) {
    console.error('[获取可指派用户] 错误:', error)
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    })
  }
})

// 获取所有用户（仅管理员）
router.get('/', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role } = req.query
    
    const filter = {}
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.fullName': { $regex: search, $options: 'i' } }
      ]
    }
    if (role) filter.role = role

    const users = await User.find(filter)
      .select('-password') // 排除密码字段
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(filter)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    })
  }
})

// 获取用户详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户详情失败',
      error: error.message
    })
  }
})

// 更新用户信息（管理员或用户自己）
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { role, isActive, profile, settings } = req.body
    
    // 检查权限：管理员可以修改任何用户，普通用户只能修改自己
    const isAdmin = req.user.role === 'admin'
    const isSelf = req.user.userId === req.params.id
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: '只能修改自己的信息'
      })
    }

    // 普通用户不能修改角色和激活状态
    const updateData = {}
    if (isAdmin) {
      if (role) updateData.role = role
      if (isActive !== undefined) updateData.isActive = isActive
    }
    
    if (profile) updateData.profile = profile
    if (settings) updateData.settings = settings

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: { user }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
    })
  }
})

// 删除用户（仅管理员）
router.delete('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      message: '用户删除成功'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    })
  }
})

// 获取用户统计信息
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    // 这里可以统计用户创建的项目、PRD、需求等数量
    // 暂时返回基础统计信息
    res.json({
      success: true,
      data: {
        stats: {
          projects: 0,
          prds: 0,
          requirements: 0,
          prototypes: 0
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户统计失败',
      error: error.message
    })
  }
})

export default router
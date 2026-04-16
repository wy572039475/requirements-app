import express from 'express'
import mongoose from 'mongoose'
import Project from '../models/Project.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 获取项目列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query
    const userId = req.user.userId

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    console.log('[Projects] 获取项目列表, userId:', userId, 'userObjectId:', userObjectId)

    // 构建查询条件
    const query = {
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    }

    // 状态筛选
    if (status && status !== 'all') {
      query.status = status
    }

    // 搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    // 分页查询
    const projects = await Project.find(query)
      .populate('owner', 'username avatar')
      .populate('members.user', 'username avatar role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    // 总数
    const total = await Project.countDocuments(query)

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取项目列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 辅助函数：将日期转换为只保留日期部分（时间为 00:00:00）
const formatDateOnly = (dateStr) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date
}

// 创建项目
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, status, priority, startDate, endDate } = req.body
    const userId = req.user.userId

    console.log('[Projects] 创建项目请求:', { name, userId, userIdType: typeof userId })

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '项目名称是必填项'
      })
    }

    // 校验描述长度
    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        message: '项目描述不能超过500个字符'
      })
    }

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 创建项目
    const project = new Project({
      name,
      description,
      status: status || '规划中',
      priority: priority || '中',
      owner: userObjectId,
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate)
    })

    // 添加创建者为成员
    project.addMember(userObjectId, 'owner')

    await project.save()

    console.log('[Projects] 项目创建成功:', { id: project._id, owner: project.owner })

    // 填充关联数据
    await project.populate('owner', 'username avatar')

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: {
        project
      }
    })
  } catch (error) {
    console.error('[Projects] 创建项目错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取项目详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    const project = await Project.findOne({
      _id: id,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    })
    .populate('owner', 'username avatar')
    .populate('members.user', 'username avatar role')

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权访问'
      })
    }

    res.json({
      success: true,
      data: {
        project
      }
    })
  } catch (error) {
    console.error('获取项目详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 更新项目
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const updates = req.body

    // 校验描述长度
    if (updates.description && updates.description.length > 500) {
      return res.status(400).json({
        success: false,
        message: '项目描述不能超过500个字符'
      })
    }

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查权限 - 只有项目成员可以更新
    const project = await Project.findOne({
      _id: id,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权访问'
      })
    }

    // 处理更新数据：格式化日期
    const processedUpdates = { ...updates }
    if (updates.startDate !== undefined) {
      processedUpdates.startDate = formatDateOnly(updates.startDate)
    }
    if (updates.endDate !== undefined) {
      processedUpdates.endDate = formatDateOnly(updates.endDate)
    }

    // 更新项目
    Object.assign(project, processedUpdates)
    await project.save()

    res.json({
      success: true,
      message: '项目更新成功',
      data: {
        project
      }
    })
  } catch (error) {
    console.error('更新项目错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除项目
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    console.log('[Projects] 删除项目请求:', { id, userId, userIdType: typeof userId })

    // 将 userId 字符串转换为 ObjectId 进行比较
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查权限 - 只有项目所有者可以删除
    const project = await Project.findOne({
      _id: id,
      owner: userObjectId
    })

    console.log('[Projects] 查找到的项目:', project ? { id: project._id, owner: project.owner, name: project.name } : null)

    if (!project) {
      console.log('[Projects] 项目不存在或无权删除')
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权删除'
      })
    }

    await Project.findByIdAndDelete(id)
    console.log('[Projects] 项目删除成功:', id)

    res.json({
      success: true,
      message: '项目删除成功'
    })
  } catch (error) {
    console.error('[Projects] 删除项目错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 添加项目成员
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { userId: memberId, role } = req.body
    const userId = req.user.userId

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: '用户ID是必填项'
      })
    }

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查权限 - 只有项目成员可以添加成员
    const project = await Project.findOne({
      _id: id,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId, 'members.role': { $in: ['owner', 'pm'] } }
      ]
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权管理成员'
      })
    }

    // 添加成员
    project.addMember(memberId, role || 'pm')
    await project.save()

    // 填充新成员信息
    await project.populate('members.user', 'username avatar role')

    res.json({
      success: true,
      message: '成员添加成功',
      data: {
        project
      }
    })
  } catch (error) {
    console.error('添加成员错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 移除项目成员
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const userId = req.user.userId

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查权限 - 只有项目所有者或PM可以移除成员
    const project = await Project.findOne({
      _id: id,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId, 'members.role': { $in: ['owner', 'pm'] } }
      ]
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权管理成员'
      })
    }

    // 不能移除自己（如果是所有者）
    if (memberId === userId.toString() && project.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: '不能移除项目所有者'
      })
    }

    // 移除成员
    project.removeMember(memberId)
    await project.save()

    res.json({
      success: true,
      message: '成员移除成功',
      data: {
        project
      }
    })
  } catch (error) {
    console.error('移除成员错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取项目统计
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查权限
    const project = await Project.findOne({
      _id: id,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    })

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权访问'
      })
    }

    // 这里可以添加更详细的统计逻辑
    const stats = {
      totalMembers: project.members.length,
      progress: project.progress,
      status: project.status,
      priority: project.priority
    }

    res.json({
      success: true,
      data: {
        stats
      }
    })
  } catch (error) {
    console.error('获取项目统计错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 导出路由
export default router
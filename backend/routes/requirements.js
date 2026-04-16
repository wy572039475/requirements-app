import express from 'express'
import mongoose from 'mongoose'
import Requirement from '../models/Requirement.js'
import Project from '../models/Project.js'
import User from '../models/User.js'
import Counter from '../models/Counter.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 检查用户是否有项目访问权限的中间件
const checkProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.body
    const userId = req.user.userId

    // 如果没有指定项目ID，跳过检查（允许无项目的需求）
    if (!projectId) {
      return next()
    }

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查用户是否是项目成员
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    })

    if (!project) {
      return res.status(403).json({
        success: false,
        message: '您没有访问该项目的权限'
      })
    }

    req.project = project
    next()
  } catch (error) {
    console.error('[项目权限检查] 错误:', error)
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 检查用户是否有权限操作需求（基于需求所属项目）
const checkRequirementAccess = async (req, res, next) => {
  try {
    const requirementId = req.params.id || req.body.requirementId
    const userId = req.user.userId

    if (!requirementId) {
      return res.status(400).json({
        success: false,
        message: '需求ID缺失'
      })
    }

    // 获取需求及其项目信息
    const requirement = await Requirement.findById(requirementId).populate('project')

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: '需求不存在'
      })
    }

    // 如果需求没有关联项目，允许访问（向后兼容）
    if (!requirement.project) {
      req.requirement = requirement
      return next()
    }

    // 将 userId 字符串转换为 ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 检查用户是否是项目成员
    const project = await Project.findOne({
      _id: requirement.project._id,
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    })

    if (!project) {
      return res.status(403).json({
        success: false,
        message: '您没有访问该需求的权限'
      })
    }

    req.requirement = requirement
    req.project = project
    next()
  } catch (error) {
    console.error('[需求权限检查] 错误:', error)
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 生成业务ID
const generateBusinessId = async (prefix = 'REQ') => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: 'requirement' },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    )
    return `${prefix}-${String(counter.value).padStart(4, '0')}`
  } catch (error) {
    console.error('生成业务ID失败:', error)
    // 如果计数器失败，使用时间戳作为后备方案
    return `${prefix}-${Date.now().toString().slice(-8)}`
  }
}

// 获取所有需求
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      projectId, 
      status, 
      priority,
      type,
      assigneeId,
      search,
      sortBy = 'priority',
      sortOrder = 'asc'
    } = req.query

    console.log('[获取需求列表] 查询参数:', { 
      page, limit, projectId, status, priority, type, assigneeId, search, sortBy, sortOrder 
    })

    const userId = req.user.userId
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // 获取用户有权限访问的所有项目ID
    const accessibleProjects = await Project.find({
      $or: [
        { owner: userObjectId },
        { 'members.user': userObjectId }
      ]
    }).select('_id')

    const accessibleProjectIds = accessibleProjects.map(p => p._id)

    const filter = {}
    
    // 项目筛选 - 只允许筛选用户有权限的项目
    if (projectId && projectId !== 'undefined' && projectId !== 'all') {
      // 检查用户是否有该项目的权限
      const hasAccess = accessibleProjectIds.some(id => id.toString() === projectId)
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: '您没有访问该项目的权限'
        })
      }
      filter.project = projectId
    } else {
      // 如果没有指定项目，只显示用户有权限的项目中的需求，或者无项目的需求
      filter.$or = [
        { project: { $in: accessibleProjectIds } },
        { project: null }
      ]
    }
    
    // 状态筛选
    if (status && status !== 'all') {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') }
      } else {
        filter.status = status
      }
    }
    
    // 优先级筛选
    if (priority && priority !== 'all') {
      if (priority.includes(',')) {
        filter.priority = { $in: priority.split(',') }
      } else {
        filter.priority = priority
      }
    }
    
    // 类型筛选
    if (type && type !== 'all') {
      if (type.includes(',')) {
        filter.type = { $in: type.split(',') }
      } else {
        filter.type = type
      }
    }
    
    // 指派人筛选
    if (assigneeId && assigneeId !== 'all') {
      filter.assignee = assigneeId
    }
    
    // 搜索功能
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      filter.$and = filter.$and || []
      filter.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } },
          { businessId: searchRegex }
        ]
      })
    }

    // 排序配置
    const sortConfig = {}
    const validSortFields = ['priority', 'createdAt', 'updatedAt', 'dueDate', 'status']
    const validSortOrders = ['asc', 'desc']
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1
    } else {
      // 默认排序：优先级升序，创建时间降序
      sortConfig.priority = 1
      sortConfig.createdAt = -1
    }

    const requirements = await Requirement.find(filter)
      .populate('author', 'username avatar')
      .populate('assignee', 'username avatar')
      .populate('project', 'name description')
      .populate('attachments.uploadedBy', 'username')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Requirement.countDocuments(filter)

    // 计算统计信息
    const stats = await Requirement.aggregate([
      { $match: filter.project ? { project: new mongoose.Types.ObjectId(filter.project) } : { $or: [{ project: { $in: accessibleProjectIds } }, { project: null }] } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const statusStats = {
      todo: 0,
      'in-progress': 0,
      done: 0,
      blocked: 0
    }
    stats.forEach(stat => {
      if (stat._id && statusStats.hasOwnProperty(stat._id)) {
        statusStats[stat._id] = stat.count
      }
    })

    console.log(`[获取需求列表] 成功获取 ${requirements.length}/${total} 个需求`)

    res.json({
      success: true,
      data: requirements,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      },
      stats: statusStats
    })
  } catch (error) {
    console.error('[获取需求列表] 错误:', error)
    res.status(500).json({
      success: false,
      message: '获取需求列表失败',
      error: error.message
    })
  }
})

// 批量更新需求状态 - 必须在 /:id 路由之前定义
router.put('/batch/status', authenticateToken, async (req, res) => {
  try {
    const { requirementIds, status } = req.body

    // 参数验证
    if (!requirementIds || !Array.isArray(requirementIds) || requirementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '需求ID列表不能为空且必须是数组'
      })
    }

    if (!status || !['todo', 'in-progress', 'done', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值，必须是 todo、in-progress、done 或 blocked'
      })
    }

    // 验证所有ID格式
    const invalidIds = requirementIds.filter(id => !id || typeof id !== 'string')
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在无效的需求ID格式'
      })
    }

    const result = await Requirement.updateMany(
      { _id: { $in: requirementIds } },
      { $set: { status, updatedAt: new Date() } }
    )

    console.log(`[批量更新状态] 成功更新 ${result.modifiedCount}/${requirementIds.length} 个需求`)

    res.json({
      success: true,
      message: `成功更新 ${result.modifiedCount} 个需求状态`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        totalRequested: requirementIds.length
      }
    })
  } catch (error) {
    console.error('[批量更新状态] 错误:', error)
    res.status(500).json({
      success: false,
      message: '批量更新状态失败',
      error: error.message
    })
  }
})

// 批量删除需求 - 必须在 /:id 路由之前定义
router.delete('/batch', authenticateToken, async (req, res) => {
  try {
    const { requirementIds } = req.body

    console.log('[批量删除需求] 用户:', req.user.userId, '删除数量:', requirementIds?.length)

    // 参数验证
    if (!requirementIds || !Array.isArray(requirementIds) || requirementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '需求ID列表不能为空且必须是数组'
      })
    }

    // 验证所有ID格式
    const invalidIds = requirementIds.filter(id => !id || typeof id !== 'string')
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在无效的需求ID格式'
      })
    }

    const result = await Requirement.deleteMany({
      _id: { $in: requirementIds }
    })

    console.log(`[批量删除需求] 成功删除 ${result.deletedCount}/${requirementIds.length} 个需求`)

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 个需求`,
      data: {
        deletedCount: result.deletedCount,
        totalRequested: requirementIds.length
      }
    })
  } catch (error) {
    console.error('[批量删除需求] 错误:', error)
    res.status(500).json({
      success: false,
      message: '批量删除需求失败',
      error: error.message
    })
  }
})

// 批量更新需求优先级
router.put('/batch/priority', authenticateToken, async (req, res) => {
  try {
    const { requirementIds, priority } = req.body

    // 参数验证
    if (!requirementIds || !Array.isArray(requirementIds) || requirementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '需求ID列表不能为空且必须是数组'
      })
    }

    if (!priority || !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: '无效的优先级值，必须是 low、medium、high 或 critical'
      })
    }

    const result = await Requirement.updateMany(
      { _id: { $in: requirementIds } },
      { $set: { priority, updatedAt: new Date() } }
    )

    console.log(`[批量更新优先级] 成功更新 ${result.modifiedCount}/${requirementIds.length} 个需求`)

    res.json({
      success: true,
      message: `成功更新 ${result.modifiedCount} 个需求优先级`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        totalRequested: requirementIds.length
      }
    })
  } catch (error) {
    console.error('[批量更新优先级] 错误:', error)
    res.status(500).json({
      success: false,
      message: '批量更新优先级失败',
      error: error.message
    })
  }
})

// 批量指派需求
router.put('/batch/assign', authenticateToken, async (req, res) => {
  try {
    const { requirementIds, assigneeId } = req.body

    // 参数验证
    if (!requirementIds || !Array.isArray(requirementIds) || requirementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '需求ID列表不能为空且必须是数组'
      })
    }

    const result = await Requirement.updateMany(
      { _id: { $in: requirementIds } },
      { $set: { assignee: assigneeId || null, updatedAt: new Date() } }
    )

    console.log(`[批量指派] 成功指派 ${result.modifiedCount}/${requirementIds.length} 个需求`)

    res.json({
      success: true,
      message: `成功指派 ${result.modifiedCount} 个需求`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        totalRequested: requirementIds.length
      }
    })
  } catch (error) {
    console.error('[批量指派] 错误:', error)
    res.status(500).json({
      success: false,
      message: '批量指派失败',
      error: error.message
    })
  }
})

// 获取单个需求
router.get('/:id', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const requirement = req.requirement

    await requirement.populate('author', 'username avatar')
    await requirement.populate('assignee', 'username avatar')
    await requirement.populate('project', 'name')
    await requirement.populate('attachments.uploadedBy', 'username')

    res.json({
      success: true,
      data: requirement
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取需求详情失败',
      error: error.message
    })
  }
})

// 创建需求
router.post('/', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const {
      title,
      description,
      acceptanceCriteria,
      priority,
      type,
      status,
      storyPoints,
      assigneeId,
      projectId,
      tags,
      dueDate,
      estimatedHours,
      actualHours,
      attachments,
      businessId,
      sourceRequirementId
    } = req.body

    const attachmentsRaw = req.body.attachments
    const attachmentsArray = Array.isArray(attachmentsRaw) ? attachmentsRaw : (attachmentsRaw ? [attachmentsRaw] : [])
    console.log('[创建需求] 用户:', req.user.userId, '标题:', title, '附件数量:', attachmentsArray.length)

    // 参数验证
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: '需求标题不能为空'
      })
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: '需求描述不能为空'
      })
    }

    // 如果没有提供 businessId，则自动生成
    const finalBusinessId = businessId || await generateBusinessId('REQ')

    // 处理附件，确保为数组且包含 uploadedBy 和 uploadedAt 字段
    const processedAttachments = attachmentsArray.map(att => ({
      filename: att.filename,
      url: att.url,
      uploadedBy: att.uploadedBy || req.user.userId,
      uploadedAt: att.uploadedAt || new Date()
    }))

    const requirement = new Requirement({
      title,
      description,
      acceptanceCriteria: acceptanceCriteria || [],
      priority: priority || 'medium',
      type: type || 'feature',
      status: status || 'todo',
      storyPoints: storyPoints || undefined,
      assignee: assigneeId,
      project: projectId || null, // 设为可选，如果没有提供项目ID
      tags: tags || [],
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: estimatedHours || undefined,
      actualHours: actualHours || undefined,
      attachments: processedAttachments,
      businessId: finalBusinessId,
      sourceRequirementId: sourceRequirementId || undefined,
      author: req.user.userId // 使用用户ID而不是userId
    })

    await requirement.save()

    // 填充用户信息
    await requirement.populate('author', 'username avatar')
    await requirement.populate('attachments.uploadedBy', 'username')
    if (assigneeId) {
      await requirement.populate('assignee', 'username avatar')
    }

    console.log('[创建需求] 成功创建需求:', requirement._id, '业务ID:', finalBusinessId)

    res.status(201).json({
      success: true,
      message: '需求创建成功',
      data: requirement
    })
  } catch (error) {
    console.error('[创建需求] 错误:', error)
    res.status(500).json({
      success: false,
      message: '创建需求失败',
      error: error.message
    })
  }
})

// 更新需求
router.put('/:id', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const {
      title,
      description,
      acceptanceCriteria,
      priority,
      type,
      status,
      storyPoints,
      assigneeId,
      projectId,
      tags,
      dueDate,
      estimatedHours,
      actualHours,
      attachments
    } = req.body

    console.log('[更新需求] 需求ID:', req.params.id, '更新字段:', Object.keys(req.body).join(', '))

    const requirement = req.requirement

    const updateData = {
      updatedAt: new Date()
    }

    // 只更新提供的字段
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria
    if (priority !== undefined) updateData.priority = priority
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (storyPoints !== undefined) updateData.storyPoints = storyPoints
    if (assigneeId !== undefined) updateData.assignee = assigneeId
    if (projectId !== undefined) updateData.project = projectId
    if (tags !== undefined) updateData.tags = tags
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours
    if (actualHours !== undefined) updateData.actualHours = actualHours
    // 处理附件更新，确保包含 uploadedBy 和 uploadedAt 字段
    if (attachments !== undefined) {
      updateData.attachments = attachments.map(att => ({
        filename: att.filename,
        url: att.url,
        uploadedBy: att.uploadedBy || req.user.userId,
        uploadedAt: att.uploadedAt || new Date()
      }))
    }

    const updatedRequirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    )

    // 填充关联数据
    await updatedRequirement.populate('author', 'username avatar')
    await updatedRequirement.populate('assignee', 'username avatar')
    await updatedRequirement.populate('attachments.uploadedBy', 'username')
    if (projectId) {
      await updatedRequirement.populate('project', 'name')
    }

    console.log('[更新需求] 更新成功:', updatedRequirement._id)

    res.json({
      success: true,
      message: '需求更新成功',
      data: updatedRequirement
    })
  } catch (error) {
    console.error('[更新需求] 错误:', error)
    res.status(500).json({
      success: false,
      message: '更新需求失败',
      error: error.message
    })
  }
})

// 删除需求
router.delete('/:id', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    console.log('[删除需求] 需求ID:', req.params.id, '用户:', req.user.userId)
    
    const requirement = req.requirement
    await Requirement.findByIdAndDelete(req.params.id)

    console.log('[删除需求] 删除成功:', req.params.id)

    res.json({
      success: true,
      message: '需求删除成功'
    })
  } catch (error) {
    console.error('[删除需求] 错误:', error)
    res.status(500).json({
      success: false,
      message: '删除需求失败',
      error: error.message
    })
  }
})

// 更新需求状态
router.put('/:id/status', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { status } = req.body
    
    console.log('[更新需求状态] 需求ID:', req.params.id, '新状态:', status, '用户:', req.user.userId)

    if (!status || !['todo', 'in-progress', 'done', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值，必须是 todo、in-progress、done 或 blocked'
      })
    }

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).populate('author', 'username')
      .populate('assignee', 'username')
      .populate('attachments.uploadedBy', 'username')

    console.log('[更新需求状态] 更新成功:', requirement._id, '新状态:', status)

    res.json({
      success: true,
      message: '需求状态更新成功',
      data: requirement
    })
  } catch (error) {
    console.error('[更新需求状态] 错误:', error)
    res.status(500).json({
      success: false,
      message: '更新需求状态失败',
      error: error.message
    })
  }
})

// 添加评论
router.post('/:id/comments', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { content } = req.body

    console.log('[添加评论] 需求ID:', req.params.id, '用户:', req.user.userId)

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空'
      })
    }

    const requirement = req.requirement

    requirement.comments.push({
      user: req.user.userId,
      content: content.trim()
    })

    await requirement.save()

    await requirement.populate('comments.user', 'username avatar')

    console.log('[添加评论] 评论添加成功，需求:', req.params.id)

    res.json({
      success: true,
      message: '评论添加成功',
      data: requirement
    })
  } catch (error) {
    console.error('[添加评论] 错误:', error)
    res.status(500).json({
      success: false,
      message: '添加评论失败',
      error: error.message
    })
  }
})

// 更新评论
router.put('/:id/comments/:commentIndex', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { id, commentIndex } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空'
      })
    }

    const requirement = req.requirement
    const index = parseInt(commentIndex)
    if (isNaN(index) || index < 0 || index >= requirement.comments.length) {
      return res.status(400).json({
        success: false,
        message: '无效的评论索引'
      })
    }

    requirement.comments[index].content = content.trim()
    await requirement.save()
    await requirement.populate('comments.user', 'username avatar')

    res.json({
      success: true,
      message: '评论更新成功',
      data: requirement
    })
  } catch (error) {
    console.error('[更新评论] 错误:', error)
    res.status(500).json({
      success: false,
      message: '更新评论失败',
      error: error.message
    })
  }
})

// 删除评论
router.delete('/:id/comments/:commentIndex', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { id, commentIndex } = req.params

    console.log('[删除评论] 需求ID:', id, '评论索引:', commentIndex, '用户:', req.user.userId)

    const requirement = req.requirement

    const index = parseInt(commentIndex)
    if (isNaN(index) || index < 0 || index >= requirement.comments.length) {
      return res.status(400).json({
        success: false,
        message: '无效的评论索引'
      })
    }

    requirement.comments.splice(index, 1)
    await requirement.save()

    console.log('[删除评论] 评论删除成功，需求:', id)

    res.json({
      success: true,
      message: '评论删除成功',
      data: requirement
    })
  } catch (error) {
    console.error('[删除评论] 错误:', error)
    res.status(500).json({
      success: false,
      message: '删除评论失败',
      error: error.message
    })
  }
})

// 上传附件
router.post('/:id/attachments', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { filename, url } = req.body

    console.log('[上传附件] 需求ID:', req.params.id, '文件名:', filename, '用户:', req.user.userId)

    if (!filename || !url) {
      return res.status(400).json({
        success: false,
        message: '附件信息不完整'
      })
    }

    const requirement = req.requirement

    requirement.addAttachment(filename, url, req.user.userId)
    await requirement.save()
    
    await requirement.populate('attachments.uploadedBy', 'username')

    console.log('[上传附件] 附件上传成功，需求:', req.params.id)

    res.json({
      success: true,
      message: '附件上传成功',
      data: requirement
    })
  } catch (error) {
    console.error('[上传附件] 错误:', error)
    res.status(500).json({
      success: false,
      message: '上传附件失败',
      error: error.message
    })
  }
})

// 删除附件
router.delete('/:id/attachments/:attachmentIndex', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { id, attachmentIndex } = req.params

    console.log('[删除附件] 需求ID:', id, '附件索引:', attachmentIndex, '用户:', req.user.userId)

    const requirement = req.requirement

    const index = parseInt(attachmentIndex)
    if (isNaN(index) || index < 0 || index >= requirement.attachments.length) {
      return res.status(400).json({
        success: false,
        message: '无效的附件索引'
      })
    }

    requirement.attachments.splice(index, 1)
    await requirement.save()

    console.log('[删除附件] 附件删除成功，需求:', id)

    res.json({
      success: true,
      message: '附件删除成功',
      data: requirement
    })
  } catch (error) {
    console.error('[删除附件] 错误:', error)
    res.status(500).json({
      success: false,
      message: '删除附件失败',
      error: error.message
    })
  }
})

// 更新验收标准
router.put('/:id/acceptance-criteria', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { criteria } = req.body

    if (!Array.isArray(criteria)) {
      return res.status(400).json({
        success: false,
        message: '验收标准必须是数组'
      })
    }

    // 标准化验收标准格式，确保所有项都有 description 和 isCompleted
    const normalizedCriteria = criteria.map(c => {
      if (typeof c === 'string') {
        return { description: c, isCompleted: false }
      }
      return {
        description: c.description || '',
        isCompleted: c.isCompleted || false
      }
    })

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      { $set: { acceptanceCriteria: normalizedCriteria, updatedAt: new Date() } },
      { new: true }
    ).populate('author', 'username')
      .populate('assignee', 'username')
      .populate('attachments.uploadedBy', 'username')

    console.log(`[更新验收标准] 需求 ${req.params.id} 的验收标准已更新，共 ${normalizedCriteria.length} 项`)

    res.json({
      success: true,
      message: '验收标准更新成功',
      data: requirement
    })
  } catch (error) {
    console.error('[更新验收标准] 错误:', error)
    res.status(500).json({
      success: false,
      message: '更新验收标准失败',
      error: error.message
    })
  }
})

// 切换验收标准状态
router.put('/:id/acceptance-criteria/:criteriaIndex/toggle', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { id, criteriaIndex } = req.params

    console.log('[切换验收标准状态] 需求ID:', id, '索引:', criteriaIndex, '用户:', req.user.userId)

    const requirement = req.requirement

    const index = parseInt(criteriaIndex)
    if (isNaN(index) || index < 0 || index >= requirement.acceptanceCriteria.length) {
      return res.status(400).json({
        success: false,
        message: '无效的验收标准索引'
      })
    }

    // 切换验收标准的完成状态
    if (typeof requirement.acceptanceCriteria[index] === 'object') {
      requirement.acceptanceCriteria[index].isCompleted = !requirement.acceptanceCriteria[index].isCompleted
    } else {
      // 如果验收标准是字符串，转换为对象
      requirement.acceptanceCriteria[index] = {
        description: requirement.acceptanceCriteria[index],
        isCompleted: true
      }
    }

    await requirement.save()

    console.log('[切换验收标准状态] 成功，需求:', id, '索引:', index)

    res.json({
      success: true,
      message: '验收标准状态切换成功',
      data: requirement
    })
  } catch (error) {
    console.error('[切换验收标准状态] 错误:', error)
    res.status(500).json({
      success: false,
      message: '切换验收标准状态失败',
      error: error.message
    })
  }
})

// 添加依赖
router.post('/:id/dependencies', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { dependencyId } = req.body

    console.log('[添加依赖] 需求ID:', req.params.id, '依赖ID:', dependencyId, '用户:', req.user.userId)

    if (!dependencyId) {
      return res.status(400).json({
        success: false,
        message: '依赖需求ID不能为空'
      })
    }

    // 检查依赖需求是否存在
    const dependencyRequirement = await Requirement.findById(dependencyId)
    if (!dependencyRequirement) {
      console.warn('[添加依赖] 依赖的需求不存在:', dependencyId)
      return res.status(404).json({
        success: false,
        message: '依赖的需求不存在'
      })
    }

    const requirement = req.requirement

    // 检查是否已经存在该依赖
    if (requirement.dependencies && requirement.dependencies.includes(dependencyId)) {
      return res.status(400).json({
        success: false,
        message: '该依赖关系已存在'
      })
    }

    if (!requirement.dependencies) {
      requirement.dependencies = []
    }

    requirement.dependencies.push(dependencyId)
    await requirement.save()

    await requirement.populate('dependencies')

    console.log('[添加依赖] 成功，需求:', req.params.id)

    res.json({
      success: true,
      message: '依赖添加成功',
      data: requirement
    })
  } catch (error) {
    console.error('[添加依赖] 错误:', error)
    res.status(500).json({
      success: false,
      message: '添加依赖失败',
      error: error.message
    })
  }
})

// 删除依赖
router.delete('/:id/dependencies/:dependencyId', authenticateToken, checkRequirementAccess, async (req, res) => {
  try {
    const { id, dependencyId } = req.params

    console.log('[删除依赖] 需求ID:', id, '依赖ID:', dependencyId, '用户:', req.user.userId)

    const requirement = req.requirement

    if (!requirement.dependencies) {
      return res.status(400).json({
        success: false,
        message: '该需求没有任何依赖'
      })
    }

    requirement.dependencies = requirement.dependencies.filter(dep => dep.toString() !== dependencyId)
    await requirement.save()

    console.log('[删除依赖] 成功，需求:', id)

    res.json({
      success: true,
      message: '依赖删除成功',
      data: requirement
    })
  } catch (error) {
    console.error('[删除依赖] 错误:', error)
    res.status(500).json({
      success: false,
      message: '删除依赖失败',
      error: error.message
    })
  }
})

export default router
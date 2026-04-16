import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import InterfaceArchive from '../models/InterfaceArchive.js'

const router = express.Router()

/**
 * 获取接口归档列表
 * GET /api/interface-archives
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const query = {
      user: req.user._id,
      status: 'archived'
    }

    if (keyword) {
      query.title = { $regex: keyword, $options: 'i' }
    }

    const [list, total] = await Promise.all([
      InterfaceArchive.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InterfaceArchive.countDocuments(query)
    ])

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: limit }
    })
  } catch (error) {
    console.error('[InterfaceArchive] 获取归档列表错误:', error)
    res.status(500).json({
      success: false,
      message: '获取归档列表失败',
      error: error.message
    })
  }
})

/**
 * 获取统计信息
 * GET /api/interface-archives/stats/summary
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default
    const stats = await InterfaceArchive.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user._id), status: 'archived' } },
      {
        $group: {
          _id: null,
          totalArchives: { $sum: 1 },
          totalInterfaces: { $sum: '$interfaceCount' }
        }
      }
    ])

    res.json({
      success: true,
      data: stats[0] || { totalArchives: 0, totalInterfaces: 0 }
    })
  } catch (error) {
    console.error('[InterfaceArchive] 获取统计错误:', error)
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error.message
    })
  }
})

/**
 * 获取归档详情
 * GET /api/interface-archives/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await InterfaceArchive.findOne({
      _id: req.params.id,
      user: req.user._id
    })

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '归档记录不存在'
      })
    }

    res.json({ success: true, data: record })
  } catch (error) {
    console.error('[InterfaceArchive] 获取归档详情错误:', error)
    res.status(500).json({
      success: false,
      message: '获取归档详情失败',
      error: error.message
    })
  }
})

/**
 * 保存接口归档
 * POST /api/interface-archives
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      sourceType,
      sourceContent,
      sourceFileName,
      sourceFileType,
      sourceRequirementId,
      sourceRequirementTitle,
      interfaces,
      projectId
    } = req.body

    if (!title || !sourceType) {
      return res.status(400).json({
        success: false,
        message: '标题和来源类型为必填项'
      })
    }

    if (!interfaces || !Array.isArray(interfaces) || interfaces.length === 0) {
      return res.status(400).json({
        success: false,
        message: '接口列表不能为空'
      })
    }

    const record = new InterfaceArchive({
      user: req.user._id,
      project: projectId || null,
      title,
      sourceType,
      sourceContent: sourceContent ? sourceContent.substring(0, 5000) : '',
      sourceFileName,
      sourceFileType,
      sourceRequirementId,
      sourceRequirementTitle,
      interfaces,
      interfaceCount: interfaces.length,
      status: 'archived'
    })

    await record.save()

    res.json({
      success: true,
      message: '归档保存成功',
      data: record
    })
  } catch (error) {
    console.error('[InterfaceArchive] 保存归档错误:', error)
    res.status(500).json({
      success: false,
      message: '保存归档失败',
      error: error.message
    })
  }
})

/**
 * 更新归档标题
 * PUT /api/interface-archives/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body
    const record = await InterfaceArchive.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title },
      { new: true }
    )

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '归档记录不存在'
      })
    }

    res.json({ success: true, message: '更新成功', data: record })
  } catch (error) {
    console.error('[InterfaceArchive] 更新归档错误:', error)
    res.status(500).json({
      success: false,
      message: '更新归档失败',
      error: error.message
    })
  }
})

/**
 * 删除归档
 * DELETE /api/interface-archives/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await InterfaceArchive.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    })

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '归档记录不存在'
      })
    }

    res.json({ success: true, message: '归档记录已删除' })
  } catch (error) {
    console.error('[InterfaceArchive] 删除归档错误:', error)
    res.status(500).json({
      success: false,
      message: '删除归档失败',
      error: error.message
    })
  }
})

export default router

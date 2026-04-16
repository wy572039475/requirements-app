import express from 'express'
import mongoose from 'mongoose'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

let AIReview = null
async function getModel() {
  if (!AIReview && process.env.USE_MOCK_DB !== 'true') {
    const mod = await import('../models/AIReview.js')
    AIReview = mod.default
  }
  return AIReview
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const model = await getModel()
    if (!model) {
      return res.json({ success: true, data: { reviews: [], total: 0 } })
    }

    const { page = 1, pageSize = 20, status, projectId } = req.query
    const skip = (parseInt(page) - 1) * parseInt(pageSize)

    const query = { user: req.user.userId }
    if (status && status !== 'all') query.status = status
    if (projectId) query.project = projectId

    const [reviews, total] = await Promise.all([
      model.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(pageSize))
        .select('-requirement -review.issues.evidence')
        .lean(),
      model.countDocuments(query)
    ])

    res.json({
      success: true,
      data: { reviews, total, page: parseInt(page), pageSize: parseInt(pageSize) }
    })
  } catch (error) {
    console.error('[AIReview] 获取评审历史失败:', error)
    res.status(500).json({ success: false, message: '获取评审历史失败' })
  }
})

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const model = await getModel()
    if (!model) {
      return res.status(404).json({ success: false, message: '评审记录不存在' })
    }

    const review = await model.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).lean()

    if (!review) {
      return res.status(404).json({ success: false, message: '评审记录不存在' })
    }

    res.json({ success: true, data: review })
  } catch (error) {
    console.error('[AIReview] 获取评审详情失败:', error)
    res.status(500).json({ success: false, message: '获取评审详情失败' })
  }
})

router.post('/', authenticateToken, async (req, res) => {
  try {
    const model = await getModel()
    if (!model) {
      return res.status(503).json({ success: false, message: '数据库不可用' })
    }

    const { title, requirement, inputMethod, fileName, fileType, review, projectId } = req.body

    if (!title || !requirement || !review) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    const doc = new model({
      user: req.user.userId,
      project: projectId || undefined,
      title,
      requirement,
      inputMethod: inputMethod || 'text',
      fileName,
      fileType,
      creator: req.user.username,
      status: 'completed',
      review,
      completedAt: new Date()
    })

    await doc.save()

    res.json({ success: true, data: doc, message: '评审结果已保存' })
  } catch (error) {
    console.error('[AIReview] 保存评审结果失败:', error)
    res.status(500).json({ success: false, message: '保存评审结果失败' })
  }
})

router.patch('/:id/issues/:issueId', authenticateToken, async (req, res) => {
  try {
    const model = await getModel()
    if (!model) {
      return res.status(503).json({ success: false, message: '数据库不可用' })
    }

    const { status, note } = req.body
    const validStatuses = ['待处理', '已处理', '已忽略']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的问题状态' })
    }

    const review = await model.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId, 'review.issues.id': req.params.issueId },
      {
        $set: {
          'review.issues.$.status': status,
          ...(note !== undefined ? { 'review.issues.$.note': note } : {})
        }
      },
      { new: true }
    )

    if (!review) {
      return res.status(404).json({ success: false, message: '评审记录或问题不存在' })
    }

    res.json({ success: true, data: review, message: '问题状态已更新' })
  } catch (error) {
    console.error('[AIReview] 更新问题状态失败:', error)
    res.status(500).json({ success: false, message: '更新问题状态失败' })
  }
})

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const model = await getModel()
    if (!model) {
      return res.status(503).json({ success: false, message: '数据库不可用' })
    }

    const result = await model.deleteOne({
      _id: req.params.id,
      user: req.user.userId
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '评审记录不存在' })
    }

    res.json({ success: true, message: '评审记录已删除' })
  } catch (error) {
    console.error('[AIReview] 删除评审记录失败:', error)
    res.status(500).json({ success: false, message: '删除评审记录失败' })
  }
})

router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const model = await getModel()
    if (!model) {
      return res.json({ success: true, data: { totalReviews: 0, avgScore: 0, totalIssues: 0 } })
    }

    const stats = await model.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.userId), status: 'completed' } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgScore: { $avg: '$review.overallScore' },
          totalIssues: { $sum: { $size: '$review.issues' } }
        }
      }
    ])

    res.json({
      success: true,
      data: stats[0] || { totalReviews: 0, avgScore: 0, totalIssues: 0 }
    })
  } catch (error) {
    console.error('[AIReview] 获取评审统计失败:', error)
    res.status(500).json({ success: false, message: '获取评审统计失败' })
  }
})

export default router

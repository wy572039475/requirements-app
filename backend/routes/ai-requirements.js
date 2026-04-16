import express from 'express'
import { AIService } from '../config/ai.js'
import { authenticateToken } from '../middleware/auth.js'
import AIReview from '../models/AIReview.js'

const router = express.Router()

/**
 * AI需求分析接口
 * POST /api/ai-requirements/analyze
 *
 * 请求体：
 * {
 *   requirement: string,     // 需求文本内容
 *   title?: string,          // 需求标题（可选）
 *   creator?: string,        // 创建人（可选）
 *   inputMethod?: 'text' | 'document',  // 输入方式（可选）
 *   fileName?: string,       // 文件名（可选）
 *   fileType?: string,       // 文件类型（可选）
 *   fileSize?: number,       // 文件大小（可选）
 *   fileData?: string,       // base64文件数据（可选）
 *   htmlContent?: string,    // HTML内容（可选）
 *   projectId?: string       // 项目ID（可选）
 * }
 *
 * 返回：
 * {
 *   success: true,
 *   data: {
 *     id: string,            // 评审记录ID
 *     overallScore: number,  // 总体评分（0-100）
 *     issues: Array<{...}>
 *   }
 * }
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const {
      requirement,
      title,
      creator,
      inputMethod = 'text',
      fileName,
      fileType,
      fileSize,
      fileData,
      htmlContent,
      projectId
    } = req.body

    console.log('\n[AI] ========== 开始新的需求分析 ==========')
    console.log('[AI] 需求长度:', requirement?.length || 0)
    console.log('[AI] 需求内容预览:', requirement?.substring(0, 100) + '...')

    // 验证输入
    if (!requirement || typeof requirement !== 'string') {
      console.error('[AI] 需求内容无效')
      return res.status(400).json({
        success: false,
        message: '需求内容不能为空'
      })
    }

    if (requirement.trim().length < 10) {
      console.error('[AI] 需求内容过短')
      return res.status(400).json({
        success: false,
        message: '需求内容至少需要10个字符'
      })
    }

    // 创建初始评审记录（状态为 analyzing）
    const reviewRecord = new AIReview({
      user: req.user._id,
      project: projectId || null,
      title: title || requirement.substring(0, 50) + '...',
      requirement,
      htmlContent,
      inputMethod,
      fileName,
      fileType,
      fileSize,
      fileData,
      creator: creator || req.user.name || req.user.username || 'Unknown',
      status: 'analyzing'
    })

    await reviewRecord.save()
    console.log('[AI] 创建评审记录:', reviewRecord._id)

    console.log(`[AI] 开始分析需求，长度: ${requirement.length} 字符`)

    // 检查AI服务是否可用
    if (!AIService.isAvailable()) {
      console.error('[AI] AI服务不可用')
      
      // 更新记录状态为错误
      reviewRecord.status = 'error'
      reviewRecord.error = 'AI服务不可用，请检查API密钥配置'
      await reviewRecord.save()
      
      return res.status(503).json({
        success: false,
        message: 'AI服务不可用，请检查API密钥配置'
      })
    }

    // 使用真实AI分析
    console.log('[AI] 调用AI分析...')
    const analysisResult = await AIService.analyzeRequirement(requirement)
    console.log('[AI] AI分析完成')

    // 验证分析结果
    console.log('[AI] 验证分析结果结构...')

    if (!analysisResult || !analysisResult.issues || !Array.isArray(analysisResult.issues)) {
      console.error('[AI] 分析结果格式异常!')
      
      // 更新记录状态为错误
      reviewRecord.status = 'error'
      reviewRecord.error = '分析结果格式错误'
      await reviewRecord.save()
      
      return res.status(500).json({
        success: false,
        message: '分析结果格式错误',
        error: 'analysisResult或analysisResult.issues格式不正确'
      })
    }

    // 为每个问题生成唯一ID
    const issuesWithId = analysisResult.issues.map((issue, index) => ({
      ...issue,
      id: issue.id || `issue-${Date.now()}-${index}`,
      status: issue.status || '待处理'
    }))

    // 更新评审记录
    reviewRecord.status = 'completed'
    reviewRecord.review = {
      overallScore: analysisResult.overallScore,
      issues: issuesWithId
    }
    reviewRecord.completedAt = new Date()

    await reviewRecord.save()
    console.log('[AI] 评审记录已更新并保存到数据库')

    console.log('[AI] ========== 分析完成 ==========\n')

    res.json({
      success: true,
      message: '需求分析完成',
      data: {
        id: reviewRecord._id,
        ...analysisResult,
        issues: issuesWithId,
        createdAt: reviewRecord.createdAt,
        completedAt: reviewRecord.completedAt
      }
    })
  } catch (error) {
    console.error('[AI] 需求分析错误:', error)
    console.error('[AI] 错误堆栈:', error.stack)

    // 根据错误类型返回更明确的状态码和消息
    let statusCode = 500
    let message = '需求分析失败'
    
    if (error.name === 'ValidationError') {
      statusCode = 400
      message = `数据验证失败: ${Object.values(error.errors).map(e => e.message).join(', ')}`
    } else if (error.name === 'MongooseError') {
      message = `数据库错误: ${error.message}`
    } else if (error.message?.includes('AI服务不可用')) {
      statusCode = 503
      message = error.message
    } else if (error.message?.includes('频率超限') || error.message?.includes('rate') || error.message?.includes('quota')) {
      statusCode = 429
      message = error.message
    } else if (error.message?.includes('JSON') || error.message?.includes('格式解析失败')) {
      message = error.message
    } else if (error.message?.includes('API请求失败')) {
      message = error.message
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 获取评审历史记录
 * GET /api/ai-requirements/history
 *
 * 查询参数：
 * - limit: 每页数量（默认20）
 * - skip: 跳过数量（默认0）
 * - status: 状态过滤（可选：analyzing, completed, error）
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, skip = 0, status } = req.query

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip)
    }

    if (status) {
      options.status = status
    }

    const reviews = await AIReview.getUserReviews(req.user._id, options)
    const total = await AIReview.countDocuments({ user: req.user._id })

    res.json({
      success: true,
      data: {
        reviews,
        total,
        limit: options.limit,
        skip: options.skip
      }
    })
  } catch (error) {
    console.error('[AI] 获取历史记录错误:', error)
    res.status(500).json({
      success: false,
      message: '获取历史记录失败',
      error: error.message
    })
  }
})

/**
 * AI服务健康检查（必须在 /:id 之前定义，否则 /health 会被 /:id 匹配）
 * GET /api/ai-requirements/health
 */
router.get('/health', async (req, res) => {
  const isAvailable = AIService.isAvailable()
  const hasApiKey = !!(process.env.ZHIPUAI_API_KEY || process.env.ZHIPU_API_KEY)
  const model = process.env.ZHIPUAI_MODEL || 'glm-4-flash'

  res.json({
    success: true,
    data: {
      available: isAvailable,
      apiKey: hasApiKey,
      model,
      message: isAvailable ? 'AI服务正常' : 'AI服务不可用，请检查API密钥配置'
    }
  })
})

/**
 * 获取单个评审详情
 * GET /api/ai-requirements/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const review = await AIReview.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('project', 'name')

    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评审记录不存在'
      })
    }

    res.json({
      success: true,
      data: review
    })
  } catch (error) {
    console.error('[AI] 获取评审详情错误:', error)
    res.status(500).json({
      success: false,
      message: '获取评审详情失败',
      error: error.message
    })
  }
})

/**
 * 删除评审记录
 * DELETE /api/ai-requirements/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const review = await AIReview.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    })

    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评审记录不存在'
      })
    }

    res.json({
      success: true,
      message: '评审记录已删除'
    })
  } catch (error) {
    console.error('[AI] 删除评审记录错误:', error)
    res.status(500).json({
      success: false,
      message: '删除评审记录失败',
      error: error.message
    })
  }
})

/**
 * 批量删除评审记录
 * POST /api/ai-requirements/batch-delete
 *
 * 请求体：
 * {
 *   ids: string[]  // 要删除的评审记录ID数组
 * }
 */
router.post('/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的评审记录ID'
      })
    }

    // 批量删除，只能删除自己的记录
    const result = await AIReview.deleteMany({
      _id: { $in: ids },
      user: req.user._id
    })

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条评审记录`,
      data: {
        deletedCount: result.deletedCount
      }
    })
  } catch (error) {
    console.error('[AI] 批量删除评审记录错误:', error)
    res.status(500).json({
      success: false,
      message: '批量删除评审记录失败',
      error: error.message
    })
  }
})

/**
 * 更新问题状态
 * PATCH /api/ai-requirements/:reviewId/issues/:issueId
 *
 * 请求体：
 * {
 *   status: '待处理' | '已处理' | '已忽略',
 *   note?: string  // 备注（可选）
 * }
 */
router.patch('/:reviewId/issues/:issueId', authenticateToken, async (req, res) => {
  try {
    const { reviewId, issueId } = req.params
    const { status, note } = req.body

    const review = await AIReview.findOne({
      _id: reviewId,
      user: req.user._id
    })

    if (!review) {
      return res.status(404).json({
        success: false,
        message: '评审记录不存在'
      })
    }

    await review.updateIssueStatus(issueId, status, note)

    res.json({
      success: true,
      message: '问题状态已更新',
      data: review
    })
  } catch (error) {
    console.error('[AI] 更新问题状态错误:', error)
    res.status(500).json({
      success: false,
      message: error.message || '更新问题状态失败',
      error: error.message
    })
  }
})

/**
 * 获取用户评审统计
 * GET /api/ai-requirements/stats
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await AIReview.getUserStats(req.user._id)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('[AI] 获取统计错误:', error)
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error.message
    })
  }
})

export default router

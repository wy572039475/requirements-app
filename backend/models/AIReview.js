import mongoose from 'mongoose'

/**
 * AI评审问题Schema
 */
const issueSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['完整性', '一致性', '清晰性', '可测试性', '安全性', '性能/体验'],
    required: true
  },
  issue_desc: {
    type: String,
    required: true
  },
  suggestion: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    enum: [1, 2, 3, 4], // 1-严重, 2-重要, 3-一般, 4-建议
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  evidence: String,
  page_reference: String,
  reasoning: String,
  status: {
    type: String,
    enum: ['待处理', '已处理', '已忽略'],
    default: '待处理'
  },
  note: String
}, { _id: false })

/**
 * AI评审结果Schema
 */
const aiReviewSchema = new mongoose.Schema({
  // 用户关联
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 项目关联（可选）
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },

  // 需求基本信息
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  requirement: {
    type: String,
    required: true
  },
  htmlContent: String,

  // 输入方式
  inputMethod: {
    type: String,
    enum: ['text', 'document', 'requirement'],
    required: true
  },

  // 文件信息（如果是文档输入）
  fileName: String,
  fileType: String,
  fileSize: Number,
  fileData: String, // base64编码的文件数据

  // 创建人信息
  creator: {
    type: String,
    required: true
  },

  // 评审状态
  status: {
    type: String,
    enum: ['analyzing', 'completed', 'error'],
    default: 'analyzing',
    index: true
  },
  error: String,

  // 评审结果
  review: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    issues: [issueSchema]
  },

  // 时间戳
  completedAt: Date
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
})

// 索引优化
aiReviewSchema.index({ user: 1, createdAt: -1 })
aiReviewSchema.index({ project: 1 })
aiReviewSchema.index({ status: 1 })

// 虚拟字段：问题统计
aiReviewSchema.virtual('issueStats').get(function() {
  if (!this.review || !this.review.issues) {
    return {
      total: 0,
      pending: 0,
      processed: 0,
      ignored: 0,
      byPriority: {},
      byCategory: {}
    }
  }

  const issues = this.review.issues
  const stats = {
    total: issues.length,
    pending: 0,
    processed: 0,
    ignored: 0,
    byPriority: {},
    byCategory: {}
  }

  issues.forEach(issue => {
    // 状态统计
    stats[issue.status]++

    // 优先级统计
    stats.byPriority[issue.priority] = (stats.byPriority[issue.priority] || 0) + 1

    // 分类统计
    stats.byCategory[issue.category] = (stats.byCategory[issue.category] || 0) + 1
  })

  return stats
})

// 实例方法：更新问题状态
aiReviewSchema.methods.updateIssueStatus = function(issueId, status, note) {
  const issue = this.review.issues.find(i => i.id === issueId)
  if (issue) {
    issue.status = status
    if (note !== undefined) {
      issue.note = note
    }
    return this.save()
  }
  return Promise.reject(new Error('Issue not found'))
}

// 静态方法：获取用户的评审历史
aiReviewSchema.statics.getUserReviews = function(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options

  const query = { user: userId }
  if (status) {
    query.status = status
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('project', 'name')
}

// 静态方法：获取评审统计
aiReviewSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        completedReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        avgScore: {
          $avg: '$review.overallScore'
        },
        totalIssues: {
          $sum: { $size: '$review.issues' }
        }
      }
    }
  ])

  return stats[0] || {
    totalReviews: 0,
    completedReviews: 0,
    avgScore: 0,
    totalIssues: 0
  }
}

export default mongoose.model('AIReview', aiReviewSchema)

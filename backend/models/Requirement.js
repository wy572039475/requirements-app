import mongoose from 'mongoose'

const requirementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done', 'blocked'],
    default: 'todo'
  },
  type: {
    type: String,
    enum: ['feature', 'bug', 'improvement', 'task'],
    default: 'feature'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessId: {
    type: String,
    unique: true,
    index: true,
    maxlength: 50
  },
  sourceRequirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    index: true
  },
  storyPoints: {
    type: Number,
    min: 0,
    max: 100
  },
  acceptanceCriteria: [{
    description: String,
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  dueDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement'
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
})

// 索引优化
requirementSchema.index({ project: 1, status: 1 })
requirementSchema.index({ assignee: 1 })
requirementSchema.index({ priority: 1 })
requirementSchema.index({ dueDate: 1 })

// 虚拟字段：评论数量
requirementSchema.virtual('commentCount').get(function() {
  return this.comments.length
})

// 添加评论方法
requirementSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content
  })
}

// 添加附件方法
requirementSchema.methods.addAttachment = function(filename, url, userId) {
  this.attachments.push({
    filename: filename,
    url: url,
    uploadedBy: userId
  })
}

export default mongoose.model('Requirement', requirementSchema)
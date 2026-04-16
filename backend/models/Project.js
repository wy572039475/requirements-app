import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['规划中', '进行中', '测试中', '已完成', '已归档'],
    default: '规划中'
  },
  priority: {
    type: String,
    enum: ['低', '中', '高', '紧急'],
    default: '中'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'pm', 'developer', 'designer', 'tester'],
      default: 'pm'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// 索引优化
projectSchema.index({ owner: 1, createdAt: -1 })
projectSchema.index({ status: 1 })

// 虚拟字段：成员数量
projectSchema.virtual('memberCount').get(function() {
  return this.members.length
})

// 添加成员方法
projectSchema.methods.addMember = function(userId, role = 'pm') {
  if (!this.members.some(member => member.user.toString() === userId.toString())) {
    this.members.push({
      user: userId,
      role: role
    })
  }
}

// 移除成员方法
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  )
}

export default mongoose.model('Project', projectSchema)
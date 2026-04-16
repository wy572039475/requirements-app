import mongoose from 'mongoose'

const interfaceItemSchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'] },
  path: { type: String, required: true },
  description: String,
  requestParams: String,
  responseParams: String,
  responseFormat: String,
  priority: { type: String, enum: ['高', '中', '低'] },
  category: String,
  _raw: {
    systemName: String,
    interfaceType: String,
    confidenceScore: Number,
    aiSuggestion: String
  }
}, { _id: false })

const interfaceArchiveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },

  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },

  sourceType: {
    type: String,
    enum: ['text', 'document', 'requirement'],
    required: true
  },
  sourceContent: String,
  sourceFileName: String,
  sourceFileType: String,
  sourceRequirementId: String,
  sourceRequirementTitle: String,

  interfaces: [interfaceItemSchema],
  interfaceCount: { type: Number, default: 0 },

  // 统计信息快照
  stats: {
    methodDistribution: {
      GET: { type: Number, default: 0 },
      POST: { type: Number, default: 0 },
      PUT: { type: Number, default: 0 },
      DELETE: { type: Number, default: 0 }
    },
    priorityDistribution: {
      '高': { type: Number, default: 0 },
      '中': { type: Number, default: 0 },
      '低': { type: Number, default: 0 }
    },
    categories: [{ type: String }]
  },

  status: {
    type: String,
    enum: ['archived', 'deleted'],
    default: 'archived',
    index: true
  }
}, {
  timestamps: true
})

interfaceArchiveSchema.index({ user: 1, createdAt: -1 })
interfaceArchiveSchema.index({ project: 1 })

interfaceArchiveSchema.pre('save', function(next) {
  if (this.interfaces) {
    this.interfaceCount = this.interfaces.length

    // 自动统计方法分布
    const methodDist = { GET: 0, POST: 0, PUT: 0, DELETE: 0 }
    const priorityDist = { '高': 0, '中': 0, '低': 0 }
    const categories = new Set()

    this.interfaces.forEach(iface => {
      if (iface.method && methodDist.hasOwnProperty(iface.method)) {
        methodDist[iface.method]++
      }
      if (iface.priority && priorityDist.hasOwnProperty(iface.priority)) {
        priorityDist[iface.priority]++
      }
      if (iface.category) {
        categories.add(iface.category)
      }
    })

    this.stats = {
      methodDistribution: methodDist,
      priorityDistribution: priorityDist,
      categories: Array.from(categories)
    }
  }
  next()
})

export default mongoose.model('InterfaceArchive', interfaceArchiveSchema)

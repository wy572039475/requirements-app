import mongoose from 'mongoose'

const featureItemSchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  description: String,
  kanoModel: String,
  priority: String,
  businessRules: String
}, { _id: false })

const featureBreakdownSchema = new mongoose.Schema({
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
  sourceFilePath: String,
  sourceRequirementId: String,
  sourceRequirementTitle: String,

  features: [featureItemSchema],
  featureCount: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['archived', 'deleted'],
    default: 'archived',
    index: true
  }
}, {
  timestamps: true
})

featureBreakdownSchema.index({ user: 1, createdAt: -1 })
featureBreakdownSchema.index({ project: 1 })

featureBreakdownSchema.pre('save', function(next) {
  if (this.features) {
    this.featureCount = this.features.length
  }
  next()
})

export default mongoose.model('FeatureBreakdown', featureBreakdownSchema)

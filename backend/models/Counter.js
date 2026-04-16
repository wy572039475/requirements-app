import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// 索引
counterSchema.index({ name: 1 })

export default mongoose.model('Counter', counterSchema)

import mongoose from 'mongoose'

let isConnected = false

export const initializeDatabase = async () => {
  if (isConnected) {
    return mongoose.connection
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/requirements-app'
    
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    await mongoose.connect(mongoUri, options)
    isConnected = true
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB连接错误:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB连接断开')
      isConnected = false
    })
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB重新连接')
      isConnected = true
    })

    return mongoose.connection
  } catch (error) {
    console.error('MongoDB初始化失败:', error)
    throw error
  }
}

export const closeDatabase = async () => {
  if (isConnected) {
    await mongoose.connection.close()
    isConnected = false
    console.log('MongoDB连接已关闭')
  }
}


import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initializeDatabase } from './config/database.js'
import { initializeDefaultData } from './config/init-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 3003

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}))
app.use(cors({
  origin: [
    'http://localhost:5177',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

app.use('/uploads', express.static(join(__dirname, 'uploads')))

const isMockMode = process.env.USE_MOCK_DB === 'true'

app.use('/api/auth', isMockMode
  ? (await import('./routes/auth-mock.js')).default
  : (await import('./routes/auth.js')).default)
app.use('/api/users', (await import('./routes/users.js')).default)
app.use('/api/projects', isMockMode
  ? (await import('./routes/projects-mock.js')).default
  : (await import('./routes/projects.js')).default)
app.use('/api/requirements', isMockMode
  ? (await import('./routes/requirements-mock.js')).default
  : (await import('./routes/requirements.js')).default)
app.use('/api/analysis', isMockMode
  ? (await import('./routes/analysis-mock.js')).default
  : (await import('./routes/analysis.js')).default)
app.use('/api/ai-requirements', (await import('./routes/ai-requirements.js')).default)
app.use('/api/feature-breakdowns', (await import('./routes/feature-breakdowns.js')).default)
app.use('/api/interface-archives', (await import('./routes/interface-archives.js')).default)
app.use('/api/ai-reviews', (await import('./routes/ai-reviews.js')).default)
app.use('/api/tasks', (await import('./routes/projects.js')).default)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'requirements-app',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

app.use((req, res) => {
  res.status(404).json({ success: false, message: '请求的资源不存在' })
})

app.use((err, req, res, next) => {
  console.error('服务器错误:', err)

  // JSON 解析错误返回 400 而非 500
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      success: false,
      message: '请求格式错误：请求数据不是有效的JSON格式'
    })
  }

  // 请求体过大
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: '请求数据过大，请减少输入内容'
    })
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

const startServer = async () => {
  try {
    console.log('[需求管理后端] 加载配置:')
    console.log('[需求管理后端]   - 端口:', PORT)
    console.log('[需求管理后端]   - MongoDB:', process.env.MONGODB_URI || '未配置')
    console.log('[需求管理后端]   - 模式:', isMockMode ? 'MOCK' : 'REAL')

    if (!isMockMode) {
      try {
        await initializeDatabase()
        console.log('[需求管理后端] MongoDB连接成功')
        await initializeDefaultData()
      } catch (error) {
        console.log('[需求管理后端] MongoDB连接失败，使用模拟数据库')
      }
    } else {
      console.log('[需求管理后端] 使用模拟数据库')
    }

    const server = app.listen(PORT, () => {
      console.log(`\n[需求管理后端] 运行在端口 ${PORT}`)
      console.log(`   访问地址: http://localhost:${PORT}`)
      console.log(`   健康检查: http://localhost:${PORT}/api/health\n`)
    })

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用`)
        process.exit(1)
      } else {
        console.error('服务器错误:', error)
        process.exit(1)
      }
    })
  } catch (error) {
    console.error('启动服务器失败:', error)
    process.exit(1)
  }
}

startServer()

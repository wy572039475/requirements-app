import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// 认证中间件
export const authenticateToken = async (req, res, next) => {
  // 模拟数据库模式下跳过认证
  const isMockMode = process.env.USE_MOCK_DB === 'true'

  if (isMockMode) {
    req.user = {
      _id: 'test-user-id',
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      role: 'pm'
    }
    return next()
  }

  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: '用户已被禁用'
      })
    }

    req.user = {
      _id: user._id,
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌'
      })
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期'
      })
    } else {
      console.error('认证中间件错误:', error)
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}

// 角色授权中间件
export const authorize = (roles = []) => {
  return (req, res, next) => {
    // 模拟数据库模式下跳过认证
    if (process.env.USE_MOCK_DB === 'true') {
      req.user = {
        _id: 'test-user-id',
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'pm'
      }
      return next()
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      })
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    next()
  }
}

// 可选认证中间件（不强制要求token，但如果有token会验证）
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) {
      req.user = null
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (process.env.USE_MOCK_DB === 'true') {
      req.user = {
        _id: 'test-user-id',
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'pm'
      }
    } else {
      const user = await User.findById(decoded.userId)
      if (user && user.isActive) {
        req.user = {
          _id: user._id,
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      } else {
        req.user = null
      }
    }
    
    next()
  } catch (error) {
    // 可选认证失败不阻止请求继续
    req.user = null
    next()
  }
}
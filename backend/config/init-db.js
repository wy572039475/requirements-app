import User from '../models/User.js'

// 默认用户数据
const defaultUsers = [
  {
    username: 'admin',
    email: 'admin@pmhub.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'pm_user',
    email: 'pm@pmhub.com',
    password: 'pm123456',
    role: 'pm'
  },
  {
    username: 'developer',
    email: 'dev@pmhub.com',
    password: 'dev123456',
    role: 'developer'
  },
  {
    username: 'designer',
    email: 'design@pmhub.com',
    password: 'design123',
    role: 'designer'
  }
]

export const initializeDefaultData = async () => {
  try {
    console.log('[初始化] 检查默认用户数据...')

    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ email: userData.email })
      
      if (!existingUser) {
        const user = new User(userData)
        await user.save()
        console.log(`[初始化] 创建用户: ${userData.username} (${userData.role})`)
      } else {
        console.log(`[初始化] 用户已存在: ${userData.username}`)
      }
    }

    console.log('[初始化] 默认用户数据初始化完成')
    console.log('\n默认账户信息:')
    console.log('==========================================')
    console.log('管理员: admin@pmhub.com / admin123')
    console.log('产品经理: pm@pmhub.com / pm123456')
    console.log('开发人员: dev@pmhub.com / dev123456')
    console.log('设计师: design@pmhub.com / design123')
    console.log('==========================================\n')
  } catch (error) {
    console.error('[初始化] 默认数据初始化失败:', error)
    throw error
  }
}

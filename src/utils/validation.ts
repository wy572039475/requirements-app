/**
 * 输入验证工具函数
 */

// 产品名称验证
export const validateProductName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: '产品名称不能为空' }
  }
  
  if (name.length > 100) {
    return { isValid: false, error: '产品名称不能超过100个字符' }
  }
  
  // 检查是否包含危险字符
  const dangerousChars = /[<>"'&]/;
  if (dangerousChars.test(name)) {
    return { isValid: false, error: '产品名称包含非法字符' }
  }
  
  return { isValid: true }
}

// 邮箱验证
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: '邮箱不能为空' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '请输入有效的邮箱地址' }
  }
  
  if (email.length > 254) {
    return { isValid: false, error: '邮箱地址过长' }
  }
  
  return { isValid: true }
}

// 密码验证
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: '密码不能为空' }
  }
  
  if (password.length < 6) {
    return { isValid: false, error: '密码至少需要6个字符' }
  }
  
  if (password.length > 128) {
    return { isValid: false, error: '密码过长' }
  }
  
  return { isValid: true }
}

// 文本内容验证（防止XSS）
export const validateTextContent = (content: string, maxLength: number = 5000): { isValid: boolean; error?: string } => {
  if (!content) {
    return { isValid: true } // 可选字段可以为空
  }
  
  if (content.length > maxLength) {
    return { isValid: false, error: `内容不能超过${maxLength}个字符` }
  }
  
  // 检查是否包含危险的HTML标签和JavaScript
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi // onclick, onload等事件处理器
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, error: '内容包含非法代码' }
    }
  }
  
  return { isValid: true }
}

// URL验证
export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url) {
    return { isValid: true } // 可选字段
  }
  
  try {
    const urlObj = new URL(url)
    
    // 只允许http和https协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: '只允许HTTP和HTTPS链接' }
    }
    
    // 检查域名是否在黑名单中（这里可以扩展）
    const blockedDomains = ['evil.com', 'malicious.com']
    if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return { isValid: false, error: '该链接不安全' }
    }
    
    return { isValid: true }
  } catch {
    return { isValid: false, error: '无效的URL格式' }
  }
}

// 文件名验证
export const validateFileName = (fileName: string): { isValid: boolean; error?: string } => {
  if (!fileName) {
    return { isValid: false, error: '文件名不能为空' }
  }
  
  if (fileName.length > 255) {
    return { isValid: false, error: '文件名过长' }
  }
  
  // 检查非法字符
  const invalidChars = /[<>:"|?*\x00-\x1f]/
  if (invalidChars.test(fileName)) {
    return { isValid: false, error: '文件名包含非法字符' }
  }
  
  // 检查是否包含路径遍历
  if (fileName.includes('..') || fileName.includes('/')) {
    return { isValid: false, error: '文件名不安全' }
  }
  
  return { isValid: true }
}

// 清理HTML内容（防止XSS）
export const sanitizeHtml = (html: string): string => {
  if (!html) return ''
  
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除script标签
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // 移除iframe标签
    .replace(/<object[^>]*>.*?<\/object>/gi, '') // 移除object标签
    .replace(/<embed[^>]*>.*?<\/embed>/gi, '') // 移除embed标签
    .replace(/javascript:/gi, '') // 移除javascript协议
    .replace(/on\w+\s*=/gi, '') // 移除事件处理器
    .replace(/<[^>]*>/g, (match) => {
      // 只允许安全的HTML标签
      const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th']
      const tagMatch = match.match(/^<\/?(\w+)/)
      
      if (tagMatch && allowedTags.includes(tagMatch[1].toLowerCase())) {
        // 对于a标签，只允许安全的属性
        if (tagMatch[1].toLowerCase() === 'a') {
          const hrefMatch = match.match(/href="([^"]*)"/)
          if (hrefMatch) {
            const href = hrefMatch[1]
            if (href.startsWith('http://') || href.startsWith('https://')) {
              return match
            }
          }
          return '<a>'
        }
        
        // 对于img标签，只允许安全的属性
        if (tagMatch[1].toLowerCase() === 'img') {
          const srcMatch = match.match(/src="([^"]*)"/)
          const altMatch = match.match(/alt="([^"]*)"/)
          const titleMatch = match.match(/title="([^"]*)"/)
          
          let safeImg = '<img'
          if (srcMatch && (srcMatch[1].startsWith('http://') || srcMatch[1].startsWith('https://'))) {
            safeImg += ` src="${srcMatch[1]}"`
          }
          if (altMatch) {
            safeImg += ` alt="${altMatch[1]}"`
          }
          if (titleMatch) {
            safeImg += ` title="${titleMatch[1]}"`
          }
          safeImg += '>'
          
          return safeImg
        }
        
        return match
      }
      
      return ''
    })
}

// 输入清理（通用）
export const sanitizeInput = (input: string): string => {
  if (!input) return ''
  
  return input
    .trim()
    .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;')
}

// 验证文件类型
export const validateFileType = (fileName: string, allowedTypes: string[]): { isValid: boolean; error?: string } => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  if (!extension) {
    return { isValid: false, error: '无法识别的文件类型' }
  }
  
  if (!allowedTypes.includes(extension)) {
    return { isValid: false, error: `只允许以下文件类型: ${allowedTypes.join(', ')}` }
  }
  
  return { isValid: true }
}

// 验证文件大小
export const validateFileSize = (fileSize: number, maxSizeMB: number = 10): { isValid: boolean; error?: string } => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  
  if (fileSize > maxSizeBytes) {
    return { isValid: false, error: `文件大小不能超过${maxSizeMB}MB` }
  }
  
  return { isValid: true }
}
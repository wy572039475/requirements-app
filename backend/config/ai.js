// 延时函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// AI服务配置
export const AIService = {
  // API密钥
  apiKey: null,
  // API基础URL
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  // 最大重试次数
  maxRetries: 5,
  // 重试间隔（毫秒）
  retryDelay: 5000,
  // 最大输入字符数（智谱AI上下文窗口限制，约12000 token ≈ 15000中文字符）
  maxInputLength: 15000,

  // 初始化AI客户端
  initialize() {
    const apiKey = process.env.ZHIPUAI_API_KEY || process.env.ZHIPU_API_KEY

    if (!apiKey) {
      console.warn('[AI] 智谱AI API密钥未配置')
      return false
    }

    try {
      this.apiKey = apiKey
      console.log('[AI] 智谱AI客户端初始化成功')
      return true
    } catch (error) {
      console.error('[AI] 智谱AI客户端初始化失败:', error)
      return false
    }
  },

  // 检查AI服务是否可用
  isAvailable() {
    // 如果apiKey为null,尝试重新初始化
    if (this.apiKey === null) {
      this.initialize()
    }
    return this.apiKey !== null
  },

  // 检查是否为频率限制错误
  isRateLimitError(error) {
    const rateLimitCodes = [429, 1301, 1302, 1113]
    const rateLimitMessages = ['rate', 'limit', '频率', '超限', '余额不足', 'quota', 'too many']
    
    const errorMsg = (error.message || '').toLowerCase()
    const errorCode = error.code || error.status
    
    return rateLimitCodes.includes(errorCode) || 
           rateLimitMessages.some(msg => errorMsg.includes(msg))
  },

  // 使用智谱AI分析需求
  async analyzeRequirement(requirement) {
    // 检查服务是否可用（会自动尝试初始化）
    if (!this.isAvailable()) {
      console.error('[AI] AI服务不可用 - 未检测到API密钥')
      console.error('[AI] 请检查环境变量: ZHIPUAI_API_KEY 或 ZHIPU_API_KEY')
      throw new Error('AI服务不可用，请检查API密钥配置。请确保后端 .env 文件中配置了 ZHIPUAI_API_KEY')
    }

    // 预处理需求内容：过长时智能截断
    const originalLength = requirement.length
    if (requirement.length > this.maxInputLength) {
      console.warn(`[AI] 需求内容过长(${originalLength}字符)，截断至${this.maxInputLength}字符`)
      requirement = this._truncateContent(requirement, this.maxInputLength)
    }

    let lastError = null
    
    // 重试循环
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[AI] 第${attempt}次尝试调用API...`)
        const result = await this._callAPI(requirement)
        return result
      } catch (error) {
        lastError = error
        console.error(`[AI] 第${attempt}次调用失败:`, error.message)
        
        // 检查是否为频率限制错误
        if (this.isRateLimitError(error)) {
          if (attempt < this.maxRetries) {
            const waitTime = this.retryDelay * Math.pow(2, attempt - 1) // 指数退避: 5s, 10s, 20s, 40s
            console.log(`[AI] 检测到频率限制，等待${waitTime/1000}秒后重试(${attempt}/${this.maxRetries})...`)
            await sleep(waitTime)
            continue
          }
          throw new Error(`API调用频率超限，已重试${this.maxRetries}次。请等待3-5分钟后重试`)
        }
        
        // 非频率限制错误，直接抛出
        throw error
      }
    }
    
    throw lastError
  },

  // 智能截断内容，保留关键信息
  _truncateContent(content, maxLength) {
    if (content.length <= maxLength) return content

    // 去除HTML标签
    let text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // 如果去除HTML后仍超长，截取前后部分（保留开头和结尾）
    if (text.length > maxLength) {
      const headSize = Math.floor(maxLength * 0.6)
      const tailSize = maxLength - headSize
      text = text.substring(0, headSize) + '\n\n...（中间内容已省略）...\n\n' + text.substring(text.length - tailSize)
    }

    console.log(`[AI] 内容截断完成: ${content.length} -> ${text.length} 字符`)
    return text
  },

  // 修复被截断的JSON数组
  _repairTruncatedJSON(rawText) {
    try {
      // 找到最后一个完整的 } 并在其后闭合数组
      const lastBrace = rawText.lastIndexOf('}')
      if (lastBrace === -1) return null

      let repaired = rawText.substring(0, lastBrace + 1) + ']'

      // 尝试解析
      const issues = JSON.parse(repaired)
      if (!Array.isArray(issues)) return null

      // 过滤掉不完整的对象（缺少必需字段的）
      const requiredFields = ['category', 'issue_desc', 'suggestion', 'priority', 'confidence']
      const validIssues = issues.filter(issue =>
        requiredFields.every(field => field in issue)
      )

      console.log(`[AI] JSON修复成功: 从截断内容中恢复了 ${validIssues.length} 个有效问题`)
      return validIssues
    } catch (e) {
      console.error('[AI] JSON修复失败:', e.message)
      return null
    }
  },

  // 内部API调用方法
  async _callAPI(requirement) {
    try {
      const model = process.env.ZHIPUAI_MODEL || 'glm-4-flash'

      const prompt = `# 需求评审任务

## 待评审文档
${requirement}

---

## 强制要求（必须严格遵守）

### 数量要求
- **输出15-25个高质量问题**（不要追求数量，注重质量）
- 对文档中的每个模块逐一审查，找出真正有价值的问题

### 分类数量要求
每个类别至少2个问题：
| 类别 | 数量要求 | 审查重点 |
|-----|---------|---------|
| 完整性 | ≥5个 | 异常流程、删除逻辑、权限控制、数据埋点、输入限制 |
| 一致性 | ≥5个 | 术语统一性、流程图与描述矛盾、前后文冲突 |
| 清晰性 | ≥5个 | 模糊词汇、计算公式、状态流转条件、边界条件 |
| 可测试性 | ≥5个 | 验收标准量化、边界值定义、测试场景覆盖 |
| 安全性 | ≥5个 | 数据脱敏、越权风险、防篡改、敏感操作审计 |
| 性能/体验 | ≥5个 | 大数据量方案、弱网处理、并发控制、响应时间 |

---

## 问题发现方法

### 方法1：逐模块扫描
对文档中提到的每个功能模块，检查：
- 输入验证规则是否完整？
- 输出格式是否明确？
- 异常情况如何处理？
- 权限控制是否说明？
- 前置条件是否清晰？

### 方法2：逐字段审查
对文档中提到的每个数据字段，检查：
- 数据类型是否定义？
- 长度/范围限制是否说明？
- 必填/选填是否标注？
- 默认值是否定义？
- 唯一性约束是否说明？

### 方法3：逐流程检查
对文档中提到的每个业务流程，检查：
- 起始条件是否明确？
- 结束条件是否明确？
- 分支条件是否完整？
- 回退/撤销逻辑是否存在？
- 并发场景如何处理？

### 方法4：逐状态分析
对文档中提到的每个状态，检查：
- 状态流转条件是否完整？
- 状态变更触发者是否明确？
- 状态变更通知机制是否存在？
- 状态超时处理是否定义？

---

## 输出格式

严格按照以下JSON数组格式输出，**不要包含markdown标记**：

\`\`\`
[
  {
    "category": "完整性",
    "issue_desc": "【模块:XXX】【字段:YYY】具体问题描述",
    "suggestion": "具体修改建议，包含明确的修改内容",
    "priority": 1,
    "confidence": 0.95,
    "evidence": "文档中具体位置的引用",
    "page_reference": "章节号或位置",
    "reasoning": "为什么这是个问题的原因分析"
  }
]
\`\`\`

### 字段说明
- category: 必须是 完整性/一致性/清晰性/可测试性/安全性/性能/体验 之一
- issue_desc: 必须包含【模块:XXX】【字段:YYY】前缀，指出具体位置
- suggestion: 必须给出具体的修改建议，不能说"建议补充"
- priority: 1=严重, 2=重要, 3=一般, 4=建议
- confidence: 0.0-1.0之间，表示问题的确定性
- evidence: 引用文档原文作为证据
- page_reference: 问题所在章节或位置
- reasoning: 分析这个问题的潜在影响

---

## 现在开始评审

请仔细阅读文档，使用上述方法逐一审查，输出15-25个具体问题。`

      const response = await fetch(`${this.baseURL}chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `你是资深IT需求评审专家，拥有15年需求分析经验。

核心职责：
1. 对需求文档进行严苛审查，不放过任何潜在问题
2. 输出15-25个高质量问题，注重质量而非数量
3. 每个问题必须指出具体的模块名、字段名、流程名

工作方法：
- 对每个功能模块逐一审查
- 对每个数据字段逐一检查
- 对每个业务流程逐一分析
- 对每个状态定义逐一验证

输出要求：
- 纯JSON数组格式，不要markdown标记
- 不要有任何解释性文字
- 直接输出JSON，以[开始，以]结束
- 每个问题尽量简洁，避免冗长描述

记住：宁可少而精，不要多而空。`
            },
            {
              role: 'user',
              content: prompt
            },
            {
              role: 'assistant',
              content: `我理解了，我会：
1. 仔细审查文档的每个部分
2. 输出15-25个高质量问题
3. 每个问题都包含模块名和字段名
4. 确保每个类别至少2个问题
5. 直接输出JSON数组格式
6. 问题描述简洁有力，不冗长

现在开始输出评审结果：

[`
            }
          ],
          temperature: 0.3,
          max_tokens: 16000,
          top_p: 0.9
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AI] API请求失败:', response.status, errorText)
        
        // 创建带有状态码的错误对象
        const error = new Error(`AI API请求失败: ${response.status} ${errorText}`)
        error.status = response.status
        error.code = response.status
        
        // 尝试解析错误响应中的错误码
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error?.code) {
            error.code = errorData.error.code
          }
        } catch (e) {
          // 忽略JSON解析错误
        }
        
        throw error
      }

      const data = await response.json()
      console.log('[AI] API返回数据:', data)

      // 检查输出是否被截断
      const finishReason = data.choices?.[0]?.finish_reason
      if (finishReason === 'length') {
        console.warn('[AI] AI输出被截断(finish_reason=length)，尝试修复JSON...')
      }

      // 提取AI返回的内容
      let aiContent = data.choices?.[0]?.message?.content || ''
      console.log('[AI] 原始返回内容长度:', aiContent.length)

      // 由于我们在 assistant 消息中预填充了 "["，AI会继续输出
      // 需要将预填充的 "[" 和 AI 的输出合并
      aiContent = '[' + aiContent
      console.log('[AI] 合并预填充后的内容长度:', aiContent.length)

      // 尝试提取JSON（可能被包裹在markdown代码块中）
      let jsonMatch = aiContent.match(/```json\s*([\s\S]*?)```/i)
      if (jsonMatch) {
        aiContent = jsonMatch[1].trim()
        console.log('[AI] 从markdown代码块提取JSON')
      } else {
        // 尝试提取数组格式
        jsonMatch = aiContent.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          aiContent = jsonMatch[0]
          console.log('[AI] 从文本中提取JSON数组')
        }
      }

      // 解析JSON（容错处理截断的情况）
      let issues
      try {
        issues = JSON.parse(aiContent)
      } catch (parseError) {
        if (finishReason === 'length') {
          console.warn('[AI] JSON解析失败(输出被截断)，尝试修复...')
          // 尝试修复截断的JSON：找到最后一个完整的对象并闭合数组
          issues = this._repairTruncatedJSON(aiContent)
        }
        if (!issues) {
          throw parseError
        }
      }
      console.log('[AI] 解析成功，发现', issues.length, '个问题')

      // 验证返回结果是否为数组
      if (!Array.isArray(issues)) {
        throw new Error('AI返回结果必须是数组格式')
      }

      // 验证每个问题的必需字段
      for (const issue of issues) {
        const requiredFields = ['category', 'issue_desc', 'suggestion', 'priority', 'confidence', 'evidence', 'page_reference', 'reasoning']
        for (const field of requiredFields) {
          if (!(field in issue)) {
            throw new Error(`AI返回的问题缺少必需字段: ${field}`)
          }
        }

        // 验证category字段值
        const validCategories = ['完整性', '一致性', '清晰性', '可测试性', '安全性', '性能/体验']
        if (!validCategories.includes(issue.category)) {
          throw new Error(`问题类别无效: ${issue.category}，必须是: ${validCategories.join(', ')}`)
        }

        // 验证priority字段值
        if (issue.priority !== 1 && issue.priority !== 2 && issue.priority !== 3 && issue.priority !== 4) {
          throw new Error(`优先级无效: ${issue.priority}，必须是1-4之间的整数`)
        }

        // 验证confidence字段值
        if (issue.confidence < 0 || issue.confidence > 1) {
          throw new Error(`置信度无效: ${issue.confidence}，必须在0.0-1.0之间`)
        }
      }

      return {
        issues: this._ensureMinIssues(issues, requirement),
        overallScore: calculateOverallScore(issues)
      }
    } catch (error) {
      console.error('[AI] 需求分析失败:', error)

      if (error.message.includes('JSON')) {
        throw new Error('AI返回的格式解析失败，请重试')
      }

      throw error
    }
  },

  // 确保问题数量足够（少于30个时补充通用问题）
  _ensureMinIssues(issues, requirement) {
    const MIN_ISSUES = 30
    const content = requirement.toLowerCase()
    
    if (issues.length >= MIN_ISSUES) {
      return issues
    }
    
    console.log(`[AI] 问题数量不足(${issues.length}个)，开始补充通用问题...`)
    
    const additionalIssues = []
    const existingCategories = issues.map(i => i.category)
    
    // 通用问题模板池
    const commonIssueTemplates = {
      '完整性': [
        { issue_desc: '【模块:全局】缺少系统整体架构图的说明', suggestion: '补充系统架构图，包括：前端、后端、数据库、外部服务的整体结构', priority: 2, evidence: '文档未包含架构设计说明' },
        { issue_desc: '【模块:全局】缺少数据字典或数据模型定义', suggestion: '补充核心数据实体的字段定义、类型、约束关系', priority: 2, evidence: '未找到数据模型相关说明' },
        { issue_desc: '【模块:全局】缺少系统日志记录规则', suggestion: '补充操作日志、错误日志、访问日志的记录策略和存储方案', priority: 3, evidence: '日志记录规则未说明' },
        { issue_desc: '【模块:全局】缺少系统监控告警机制', suggestion: '补充系统健康监控指标和告警阈值定义', priority: 3, evidence: '监控方案未提及' },
        { issue_desc: '【模块:全局】缺少数据备份恢复策略', suggestion: '补充数据备份频率、备份保留周期、恢复流程说明', priority: 2, evidence: '备份策略未定义' },
        { issue_desc: '【模块:全局】缺少系统上线检查清单', suggestion: '补充上线前必须完成的检查项和验收标准', priority: 3, evidence: '上线检查清单缺失' },
        { issue_desc: '【模块:全局】缺少回滚方案说明', suggestion: '补充版本回滚的触发条件、操作步骤和验证方法', priority: 2, evidence: '回滚方案未说明' },
        { issue_desc: '【模块:全局】缺少多语言/国际化支持说明', suggestion: '明确是否需要支持多语言，如需要则补充国际化方案', priority: 4, evidence: '国际化需求未明确' }
      ],
      '一致性': [
        { issue_desc: '【模块:全局】术语定义可能存在不一致', suggestion: '在文档开头添加术语表，确保全文术语使用一致', priority: 3, evidence: '需要检查术语一致性' },
        { issue_desc: '【模块:全局】UI组件风格可能不统一', suggestion: '补充UI设计规范，包括：颜色、字体、间距、组件样式', priority: 3, evidence: 'UI规范未单独说明' },
        { issue_desc: '【模块:全局】接口命名规范可能不统一', suggestion: '补充接口命名规范文档，统一使用RESTful或项目约定风格', priority: 3, evidence: '接口规范未明确定义' },
        { issue_desc: '【模块:全局】错误码定义可能不完整', suggestion: '补充完整的错误码表，包括错误码、错误信息、处理建议', priority: 3, evidence: '错误码体系未明确' },
        { issue_desc: '【模块:全局】状态码定义可能不统一', suggestion: '统一各模块的状态码定义，避免不同模块使用不同含义的状态值', priority: 3, evidence: '状态码规范未统一' }
      ],
      '清晰性': [
        { issue_desc: '【模块:全局】业务流程图可能不够清晰', suggestion: '使用标准流程图符号，补充泳道图展示不同角色的操作', priority: 2, evidence: '流程图表达需优化' },
        { issue_desc: '【模块:全局】接口文档格式可能不够规范', suggestion: '使用标准接口文档格式（如OpenAPI），包含完整的请求响应示例', priority: 2, evidence: '接口文档规范待完善' },
        { issue_desc: '【模块:全局】需求优先级排序依据不清晰', suggestion: '补充优先级评估依据，包括业务价值、技术复杂度、依赖关系', priority: 3, evidence: '优先级标准未明确' },
        { issue_desc: '【模块:全局】验收标准可能存在模糊表述', suggestion: '避免使用"流畅"、"友好"等主观词汇，使用可量化的指标', priority: 2, evidence: '验收标准需量化' },
        { issue_desc: '【模块:全局】非功能性需求描述不够具体', suggestion: '补充具体的性能指标、可用性要求、兼容性要求', priority: 2, evidence: '非功能性需求待细化' }
      ],
      '可测试性': [
        { issue_desc: '【模块:全局】缺少整体测试策略', suggestion: '补充测试策略，包括单元测试、集成测试、端到端测试的覆盖范围', priority: 2, evidence: '测试策略未说明' },
        { issue_desc: '【模块:全局】缺少测试数据准备方案', suggestion: '补充测试数据的准备方法、数据量、数据脱敏规则', priority: 3, evidence: '测试数据方案未定义' },
        { issue_desc: '【模块:全局】缺少性能测试基准', suggestion: '补充性能测试的并发数、响应时间、吞吐量等基准指标', priority: 2, evidence: '性能基准未定义' },
        { issue_desc: '【模块:全局】缺少兼容性测试范围', suggestion: '补充浏览器、设备、操作系统的兼容性测试清单', priority: 3, evidence: '兼容性范围未明确' },
        { issue_desc: '【模块:全局】缺少自动化测试方案', suggestion: '补充自动化测试框架选型和测试用例编写规范', priority: 3, evidence: '自动化方案未说明' }
      ],
      '安全性': [
        { issue_desc: '【模块:全局】缺少身份认证机制详细说明', suggestion: '补充认证方式（JWT/Session/OAuth）、Token有效期、刷新机制', priority: 1, evidence: '认证机制需详细说明' },
        { issue_desc: '【模块:全局】缺少API接口安全策略', suggestion: '补充接口签名、防重放攻击、请求频率限制等安全措施', priority: 1, evidence: 'API安全策略未定义' },
        { issue_desc: '【模块:全局】缺少敏感操作审计日志', suggestion: '补充敏感操作的审计日志记录，包括操作人、时间、IP、操作内容', priority: 1, evidence: '审计日志方案未说明' },
        { issue_desc: '【模块:全局】缺少数据传输加密方案', suggestion: '明确HTTPS配置、证书要求、敏感数据加密传输方式', priority: 1, evidence: '传输加密方案待补充' },
        { issue_desc: '【模块:全局】缺少SQL注入/XSS防护说明', suggestion: '补充输入验证规则、参数化查询、输出编码等防护措施', priority: 1, evidence: '注入防护未明确' },
        { issue_desc: '【模块:全局】缺少密码安全策略', suggestion: '补充密码复杂度要求、加密存储方式、找回密码流程', priority: 1, evidence: '密码策略未详细说明' }
      ],
      '性能/体验': [
        { issue_desc: '【模块:全局】缺少页面加载性能指标', suggestion: '补充首屏加载时间、白屏时间、可交互时间等性能指标要求', priority: 2, evidence: '页面性能指标未定义' },
        { issue_desc: '【模块:全局】缺少缓存策略说明', suggestion: '补充前端缓存、服务端缓存、数据库缓存的策略和过期机制', priority: 2, evidence: '缓存策略未说明' },
        { issue_desc: '【模块:全局】缺少数据库索引优化方案', suggestion: '补充核心查询的索引设计、慢查询优化策略', priority: 2, evidence: '数据库优化方案未明确' },
        { issue_desc: '【模块:全局】缺少CDN加速方案', suggestion: '补充静态资源CDN部署方案和缓存策略', priority: 3, evidence: 'CDN方案未说明' },
        { issue_desc: '【模块:全局】缺少弱网环境适配方案', suggestion: '补充网络超时处理、断网重连、离线缓存等弱网适配策略', priority: 2, evidence: '弱网适配未考虑' },
        { issue_desc: '【模块:全局】缺少大文件上传下载优化方案', suggestion: '补充分片上传、断点续传、压缩传输等优化方案', priority: 3, evidence: '大文件处理方案未说明' },
        { issue_desc: '【模块:全局】缺少长列表渲染优化方案', suggestion: '补充虚拟滚动、分页加载、懒加载等长列表优化策略', priority: 3, evidence: '长列表优化未说明' }
      ]
    }
    
    // 优先补充数量不足的类别
    const categoryCounts = {}
    for (const cat of ['完整性', '一致性', '清晰性', '可测试性', '安全性', '性能/体验']) {
      categoryCounts[cat] = issues.filter(i => i.category === cat).length
    }
    
    // 按类别补充问题
    for (const [category, templates] of Object.entries(commonIssueTemplates)) {
      if (additionalIssues.length + issues.length >= MIN_ISSUES) break
      
      const currentCount = categoryCounts[category] || 0
      const needed = Math.max(5 - currentCount, 0) // 每个类别至少5个
      
      for (let i = 0; i < Math.min(needed, templates.length); i++) {
        if (additionalIssues.length + issues.length >= MIN_ISSUES) break
        
        const template = templates[i]
        additionalIssues.push({
          category,
          issue_desc: template.issue_desc,
          suggestion: template.suggestion,
          priority: template.priority,
          confidence: 0.7,
          evidence: template.evidence,
          page_reference: '全局检查',
          reasoning: '基于通用需求评审标准补充的问题，建议根据实际情况确认'
        })
      }
    }
    
    const finalIssues = [...issues, ...additionalIssues]
    console.log(`[AI] 补充后问题数量: ${finalIssues.length}个`)
    
    return finalIssues
  }
}

// 计算总体评分
function calculateOverallScore(issues) {
  if (!issues || issues.length === 0) {
    return 95 // 没有问题，给高分
  }

  // 根据问题的严重程度扣分
  let score = 100
  for (const issue of issues) {
    switch (issue.priority) {
      case 1: // 严重
        score -= 20
        break
      case 2: // 重要
        score -= 10
        break
      case 3: // 一般
        score -= 5
        break
      case 4: // 建议
        score -= 2
        break
    }

    // 根据置信度调整扣分
    score -= (1 - issue.confidence) * 2
  }

  // 确保分数在合理范围内
  score = Math.max(40, Math.min(100, score))

  return Math.round(score)
}

// 初始化AI服务
AIService.initialize()

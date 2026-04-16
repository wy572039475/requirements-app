import express from 'express'

const router = express.Router()

// 配置常量
const BATCH_SIZE = 3000 // 每批次处理的文档字符数（减小批次大小，确保prompt+输出不超模型上下文窗口）
const BATCH_DELAY = 3000 // 批次之间的延迟时间（毫秒）- 3秒，避免频率限制
const MAX_FEATURES_PER_BATCH = 5 // 每批次最多提取的功能数（降低单批次输出量，确保JSON完整）
const MAX_OUTPUT_TOKENS = 8192 // 单批次AI输出的最大token数（确保能完整输出5个功能点的JSON）

// 组装Prompt模板（精简版，减少token消耗，为长文档留更多空间）
const assemblePrompt = (content, batchIndex = 0, totalBatches = 1) => {
  const batchHint = totalBatches > 1
    ? `\n【分批处理说明】当前处理第 ${batchIndex + 1}/${totalBatches} 批次。\n请专注分析本批次文档内容，提取该部分涉及的功能点。`
    : ''

  return `你是一位拥有10年经验的高级产品经理，精通PRD功能拆解。
${batchHint}

## 任务
分析以下PRD文档内容，拆解为结构化的功能清单。

## 待分析文档

${content}

---

## 输出格式（严格遵守JSON，不要markdown标记）

{"features": [{"id": "序号", "name": "功能名称(8-12字)", "description": "功能描述(50-150字，包含目标、价值、用户、场景)", "kanoModel": "基本型需求/期望型需求/魅力型需求/无差异需求", "priority": "高/中/低", "businessRules": "业务规则(包含前置条件、核心规则、异常处理、后置影响)"}]}

## 拆解要求
1. 提取 **${MAX_FEATURES_PER_BATCH}个左右** 核心功能点
2. 功能粒度适中：如"用户注册"✅、"用户管理"❌过粗、"输入手机号"❌过细
3. KANO分类：基本型(没有不行)/期望型(越好越满意)/魅力型(惊喜)/无差异(不在意)
4. 优先级：高(核心业务/被依赖/时间敏感)/中(提升体验)/低(锦上添花)
5. businessRules 必须包含：前置条件、核心规则、异常处理、后置影响
6. 优先提取：核心业务功能 > 辅助功能 > 优化功能

## 示例
{"features": [{"id": "1", "name": "用户手机号注册", "description": "允许新用户通过手机号+验证码完成注册，目标用户为首次访问的潜在用户", "kanoModel": "基本型需求", "priority": "高", "businessRules": "前置条件：手机号未注册、验证码通过、已同意协议。核心规则：密码8-20位含字母数字；同手机号24h最多5次。异常处理：已注册提示登录；验证码错超5次锁1小时。后置影响：创建用户记录、初始化配置、发送欢迎通知。"}]}

现在请开始分析，直接输出JSON。`
}

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 分割文档为多个批次（智能段落边界分割）
const splitContentIntoBatches = (content) => {
  if (content.length <= BATCH_SIZE) {
    return [content]
  }

  const batches = []
  let start = 0

  while (start < content.length) {
    let end = start + BATCH_SIZE

    // 尝试在句子或段落边界处分割
    if (end < content.length) {
      const searchStart = Math.max(start + BATCH_SIZE - 800, start)
      const searchEnd = Math.min(start + BATCH_SIZE + 800, content.length)
      const searchArea = content.substring(searchStart, searchEnd)

      // 优先在双换行（段落边界）处分割
      const doubleNewLineIndex = searchArea.lastIndexOf('\n\n')
      if (doubleNewLineIndex > 0) {
        end = searchStart + doubleNewLineIndex + 1
      } else {
        // 其次在单换行处分割
        const newLineIndex = searchArea.lastIndexOf('\n')
        if (newLineIndex > 0) {
          end = searchStart + newLineIndex + 1
        } else {
          // 最后在句号处分割
          const periodIndex = searchArea.lastIndexOf('。')
          if (periodIndex > 0) {
            end = searchStart + periodIndex + 1
          }
        }
      }
    }

    batches.push(content.substring(start, end))
    start = end
  }

  // 过滤掉空的批次
  return batches.filter(b => b.trim().length > 0)
}

// 解析AI返回的JSON结果（增加截断修复能力）
const parseAIResponse = (aiResponse, content) => {
  console.log('\n[解析] 开始解析AI响应...')
  console.log('[解析] AI响应长度:', aiResponse.length)
  console.log('[解析] AI响应前200字符:', aiResponse.substring(0, 200))

  let cleanedResponse = aiResponse.trim()
  let parsedResult = null

  // 方法1: 直接解析整个响应
  try {
    parsedResult = JSON.parse(cleanedResponse)
    console.log('[解析] ✓ 方法1成功：直接解析JSON')
    console.log('[解析] 解析结果包含features:', !!parsedResult.features)
    return parsedResult
  } catch (e) {
    console.log('[解析] ✗ 方法1失败:', e.message)
  }

  // 方法2: 查找JSON对象（增强版：处理截断的JSON）
  const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      parsedResult = JSON.parse(jsonMatch[0])
      console.log('[解析] ✓ 方法2成功：提取JSON对象')
      console.log('[解析] 解析结果包含features:', !!parsedResult.features)
      return parsedResult
    } catch (e) {
      // 方法2.1: 尝试修复截断的JSON - 补全缺失的括号和引号
      console.log('[解析] 尝试修复截断的JSON...')
      try {
        let fixedJson = jsonMatch[0]
        // 如果JSON以逗号结尾，移除末尾逗号
        fixedJson = fixedJson.replace(/,\s*$/, '')
        // 检查并尝试补全缺失的括号
        const openBraces = (fixedJson.match(/\{/g) || []).length
        const closeBraces = (fixedJson.match(/\}/g) || []).length
        const openBrackets = (fixedJson.match(/\[/g) || []).length
        const closeBrackets = (fixedJson.match(/\]/g) || []).length

        // 如果缺少闭合括号，尝试智能补全
        if (closeBraces < openBraces || closeBrackets < openBrackets) {
          // 尝试在最后一个完整的feature对象后截断并补全
          const lastCompleteObj = fixedJson.lastIndexOf('}')
          if (lastCompleteObj > 0) {
            fixedJson = fixedJson.substring(0, lastCompleteObj + 1)
            // 补全缺失的 ] }
            if (openBrackets > closeBrackets) fixedJson += ']'
            if (openBraces > closeBraces) fixedJson += '}'
            console.log('[解析] 修复后的JSON长度:', fixedJson.length)
            parsedResult = JSON.parse(fixedJson)
            if (parsedResult && parsedResult.features) {
              console.log('[解析] ✓ 修复成功，提取到', parsedResult.features.length, '个功能')
              return parsedResult
            }
          }
        }
      } catch (fixError) {
        console.log('[解析] ✗ JSON修复失败:', fixError.message)
      }
    }
  }

  // 方法3: 如果AI返回了markdown格式的JSON，提取代码块
  const codeBlockMatch = cleanedResponse.match(/```json\n([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      parsedResult = JSON.parse(codeBlockMatch[1])
      console.log('[解析] ✓ 方法3成功：提取markdown代码块')
      console.log('[解析] 解析结果包含features:', !!parsedResult.features)
      return parsedResult
    } catch (e) {
      console.log('[解析] ✗ 方法3失败:', e.message)
    }
  }

  // 方法4: 尝试提取所有可能的JSON数组
  const arrayMatch = cleanedResponse.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (arrayMatch) {
    try {
      const features = JSON.parse(arrayMatch[0])
      parsedResult = { features }
      console.log('[解析] ✓ 方法4成功：提取JSON数组并包装')
      console.log('[解析] 提取功能数量:', features.length)
      return parsedResult
    } catch (e) {
      console.log('[解析] ✗ 方法4失败:', e.message)
    }
  }

  // 如果所有方法都失败，记录完整内容
  console.log('\n[解析] ✗✗✗ 所有解析方法都失败 ✗✗✗')
  console.log('[解析] AI完整响应内容:')
  console.log(aiResponse)

  return null
}

// 调用单批次智谱AI（带重试机制）
const callZhipuAISingleBatch = async (content, batchIndex, totalBatches, maxRetries = 3) => {
  const apiKey = process.env.ZHIPUAI_API_KEY
  
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[批次${batchIndex + 1}/${totalBatches}] 调用智谱AI API... (尝试 ${attempt}/${maxRetries})`)
      console.log('API Key前缀:', apiKey.substring(0, 10) + '...')
      console.log('内容长度:', content.length)
      
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.ZHIPUAI_MODEL || 'glm-4-flash',
          messages: [
            {
              role: 'system',
              content: '你是资深产品经理，擅长PRD功能拆解。严格按照JSON格式输出，不要markdown标记。确保JSON格式正确可解析。'
            },
            {
              role: 'user',
              content: assemblePrompt(content, batchIndex, totalBatches)
            }
          ],
          temperature: 0.2,  // 降低温度以获得更稳定的输出
          max_tokens: MAX_OUTPUT_TOKENS,
          top_p: 0.8
        })
      })
      
      console.log('智谱AI响应状态:', response.status)
      
      // 处理429速率限制错误
      if (response.status === 429) {
        const errorText = await response.text()
        console.error(`智谱AI速率限制 (尝试 ${attempt}/${maxRetries}):`, errorText)
        
        if (attempt < maxRetries) {
          const waitTime = attempt * 20000 // 递增等待时间：20秒、40秒、60秒
          console.log(`等待 ${waitTime/1000} 秒后重试...`)
          await delay(waitTime)
          continue
        }
        
        throw new Error('API调用频率超限，请等待1-2分钟后重试')
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('智谱AI错误响应:', errorText)
        throw new Error(`HTTP请求失败: ${response.status}, ${errorText}`)
      }
      
      const data = await response.json()
      console.log('智谱AI原始数据:', JSON.stringify(data, null, 2))
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('AI返回了空的选择列表')
      }
      
      const aiResponse = data.choices[0].message.content
      console.log('AI原始返回长度:', aiResponse.length)
      console.log('AI原始返回内容:', aiResponse.substring(0, 200))
      
      const parsedResult = parseAIResponse(aiResponse, content)

      if (parsedResult && Array.isArray(parsedResult.features) && parsedResult.features.length > 0) {
        console.log(`[批次${batchIndex + 1}/${totalBatches}] 成功提取 ${parsedResult.features.length} 个功能`)
        return parsedResult
      }

      // 解析失败或 features 为空/非数组，返回空数组继续
      console.warn(`[批次${batchIndex + 1}/${totalBatches}] 解析结果无效，features类型: ${typeof parsedResult?.features}, 值: ${JSON.stringify(parsedResult?.features)?.substring(0, 100)}`)
      return { features: [] }
      
    } catch (error) {
      console.error(`[批次${batchIndex + 1}] 调用智谱AI失败 (尝试 ${attempt}/${maxRetries}):`, error.message)
      lastError = error
      
      if (error.message.includes('频率超限') && attempt < maxRetries) {
        continue
      }
      
      break
    }
  }
  
  // 本批次失败，返回空数组
  console.error(`[批次${batchIndex + 1}] 所有重试都失败`)
  return { features: [], error: lastError?.message }
}

// 去重功能列表（基于名称相似度）
const deduplicateFeatures = (features) => {
  const seen = new Map()
  const result = []
  
  for (const feature of features) {
    const name = feature.name?.trim().toLowerCase()
    if (!name) continue
    
    // 检查是否已存在相似的功能
    let isDuplicate = false
    for (const [existingName] of seen) {
      // 简单的相似度检查：名称包含关系
      if (name.includes(existingName) || existingName.includes(name)) {
        isDuplicate = true
        break
      }
    }
    
    if (!isDuplicate) {
      seen.set(name, true)
      result.push(feature)
    }
  }
  
  return result
}

// 主调用函数：分批处理需求拆解
const callZhipuAI = async (content, maxRetries = 3) => {
  const apiKey = process.env.ZHIPUAI_API_KEY
  
  console.log('\n=== 智谱AI调用检查 ===')
  console.log('ZHIPUAI_API_KEY存在:', !!apiKey)
  console.log('ZHIPUAI_API_KEY前缀:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A')
  console.log('ZHIPUAI_MODEL:', process.env.ZHIPUAI_MODEL || 'glm-4-flash (默认)')
  
  // 如果没有配置API密钥，抛出明确的错误
  if (!apiKey) {
    console.error('[错误] 未配置智谱AI API密钥')
    console.error('[提示] 请在后端目录下创建 .env 文件，并添加:')
    console.error('       ZHIPUAI_API_KEY=your-api-key-here')
    throw new Error('未配置智谱AI API密钥，请联系管理员配置环境变量 ZHIPUAI_API_KEY')
  }
  
  // 分割文档为批次
  const batches = splitContentIntoBatches(content)
  console.log(`=== 开始分批处理需求拆解 ===`)
  console.log(`文档总长度: ${content.length} 字符`)
  console.log(`分割为 ${batches.length} 个批次`)
  
  const allFeatures = []
  let lastError = null
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`\n--- 处理批次 ${i + 1}/${batches.length} ---`)
    console.log(`批次内容长度: ${batches[i].length} 字符`)
    
    const result = await callZhipuAISingleBatch(batches[i], i, batches.length, maxRetries)
    
    if (Array.isArray(result.features) && result.features.length > 0) {
      // 为功能添加批次标记
      const batchFeatures = result.features.map((f, idx) => ({
        ...(f && typeof f === 'object' ? f : {}),
        id: `${i + 1}-${idx + 1}`,
        _batch: i + 1
      }))
      allFeatures.push(...batchFeatures)
    }
    
    if (result.error) {
      lastError = result.error
    }
    
    // 如果不是最后一批，等待一段时间避免频率限制
    if (i < batches.length - 1) {
      console.log(`批次间等待 ${BATCH_DELAY/1000} 秒...`)
      await delay(BATCH_DELAY)
    }
  }
  
  console.log(`\n=== 分批处理完成 ===`)
  console.log(`总共提取 ${allFeatures.length} 个功能（去重前）`)
  
  // 去重
  const deduplicatedFeatures = deduplicateFeatures(allFeatures)
  console.log(`去重后剩余 ${deduplicatedFeatures.length} 个功能`)
  
  // 重新编号
  const finalFeatures = deduplicatedFeatures.map((f, idx) => ({
    ...f,
    id: String(idx + 1)
  }))
  
  // 如果没有提取到任何功能
  if (finalFeatures.length === 0) {
    return {
      features: [{
        id: '1',
        name: '文档分析',
        description: lastError?.includes('频率超限') 
          ? 'API调用频率超限，请等待1-2分钟后重试' 
          : '未能从文档中提取到功能点，请检查文档内容',
        kanoModel: '基本型需求',
        priority: '高',
        businessRules: lastError || '请检查网络连接或稍后重试'
      }]
    }
  }
  
  return { features: finalFeatures }
}

// 存储分析进度的全局Map
const analysisProgress = new Map()

// AI分析路由
router.post('/analyze', async (req, res) => {
  try {
    const { content, type } = req.body
    
    console.log('\n=== 收到AI分析请求 ===')
    console.log('内容长度:', content?.length || 0)
    console.log('内容类型:', type)
    console.log('内容预览:', content?.substring(0, 200))
    
    // 验证必填字段
    if (!content) {
      console.error('[错误] 内容为空')
      return res.status(400).json({
        success: false,
        message: '内容不能为空'
      })
    }

    // 验证内容长度
    if (content.trim().length < 50) {
      console.error('[错误] 内容过短')
      return res.status(400).json({
        success: false,
        message: '内容过短，至少需要50个字符'
      })
    }

    // 检查API密钥
    const apiKey = process.env.ZHIPUAI_API_KEY
    if (!apiKey) {
      console.error('[错误] 未配置智谱AI API密钥')
      return res.status(500).json({
        success: false,
        message: '服务配置错误：未配置AI API密钥，请联系管理员'
      })
    }
    
    console.log('[信息] 开始调用AI服务...')
    
    // 调用AI服务
    const result = await callZhipuAI(content)
    
    console.log('[成功] AI分析完成')
    console.log('[结果] 提取功能数量:', result?.features?.length || 0)
    
    // 验证返回结果
    if (!result || !result.features) {
      console.error('[错误] AI返回结果格式异常:', JSON.stringify(result))
      return res.status(500).json({
        success: false,
        message: 'AI分析结果格式异常，请重试'
      })
    }
    
    res.status(200).json({
      success: true,
      message: '分析完成',
      data: result
    })
  } catch (error) {
    console.error('\n=== AI分析错误 ===')
    console.error('错误类型:', error.constructor.name)
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = 'AI分析失败，请稍后重试'
    if (error.message.includes('频率超限') || error.message.includes('429')) {
      errorMessage = 'API调用频率超限，请等待1-2分钟后重试'
    } else if (error.message.includes('timeout') || error.message.includes('超时')) {
      errorMessage = 'AI分析超时，请简化文档内容后重试'
    } else if (error.message.includes('network') || error.message.includes('网络')) {
      errorMessage = '网络连接异常，请检查网络后重试'
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    })
  }
})

// 获取AI配置信息
router.get('/config', (req, res) => {
  try {
    const apiKey = process.env.ZHIPUAI_API_KEY
    console.log('=== AI配置检查 ===')
    console.log('ZHIPUAI_API_KEY存在:', !!apiKey)
    console.log('ZHIPUAI_API_KEY前缀:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A')
    
    res.status(200).json({
      success: true,
      message: '获取配置成功',
      data: {
        aiEnabled: !!apiKey,
        aiService: 'zhipuai',
        aiModel: process.env.ZHIPUAI_MODEL || 'glm-4-flash',
        features: ['PRD分析', '功能提取', '需求梳理', '接口分析'],
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'
      }
    })
  } catch (error) {
    console.error('获取AI配置错误:', error)
    res.status(500).json({
      success: false,
      message: '获取AI配置失败'
    })
  }
})

// 组装接口分析Prompt模板
const assembleInterfacePrompt = (content) => {
  return `# 角色定位
你是一位拥有10年经验的资深系统架构师，精通API设计、系统集成和技术方案设计。你擅长从需求文档中识别外部系统依赖，设计规范的接口规范，并评估技术可行性和风险。

# 任务目标
分析以下需求文档内容，识别该需求涉及的所有外部系统接口，输出结构化的接口规范文档。

---

## 📄 待分析文档内容

${content}

---

## 📋 输出格式要求

严格按照以下JSON数组格式返回，不要包含任何markdown标记或解释性文字：

\`\`\`json
[
  {
    "systemName": "系统名称",
    "interfaceName": "接口名称（动词+名词，如：查询用户信息）",
    "interfaceDesc": "接口功能描述（50-100字，说明接口的核心功能和用途）",
    "interfaceType": "HTTP/RPC/MQ/WebSocket",
    "requestMethod": "GET/POST/PUT/DELETE",
    "requestPath": "接口路径（如：/api/v1/users/{userId}）",
    "requestParams": "请求参数详细说明",
    "responseParams": "响应参数详细说明",
    "responseFormat": "响应格式说明",
    "confidenceScore": 0.95,
    "aiSuggestion": "优化建议（可选）"
  }
]
\`\`\`

---

## 🎯 接口识别方法论

### 1. 识别信号词
在需求文档中，以下词汇通常暗示需要外部接口：
- **数据来源类**："从XX系统获取"、"同步XX数据"、"调用XX接口"
- **动作触发类**："发送到"、"推送给"、"通知XX"
- **状态查询类**："查询XX状态"、"验证XX信息"
- **数据存储类**："保存到XX"、"写入XX系统"

### 2. 常见外部系统类型
| 系统类型 | 典型接口 | 识别关键词 |
|---------|---------|-----------|
| 用户中心 | 登录、注册、用户信息 | 用户、账号、登录、认证 |
| 支付系统 | 支付、退款、查询 | 支付、扣款、退款、账单 |
| 消息系统 | 短信、邮件、推送 | 通知、提醒、短信、邮件 |
| 存储系统 | 文件上传、下载 | 文件、图片、附件、存储 |
| 第三方服务 | 地图、天气、物流 | 定位、地址、物流查询 |

### 3. 接口信息推断原则
当文档未明确说明时：
- **接口类型**：数据查询优先HTTP GET，数据操作优先HTTP POST
- **请求路径**：遵循RESTful规范，资源名用复数（/users, /orders）
- **参数设计**：必填参数放路径或query，选填参数放body
- **响应结构**：统一包含code、message、data三个字段

---

## 📝 参数描述规范

### requestParams 格式要求
每行一个参数，格式：\`参数名(类型): 说明，是否必填\`

示例：
\`\`\`
userId(String): 用户ID，必填，路径参数
name(String): 用户姓名，选填，最大50字符
age(Integer): 用户年龄，选填，范围1-150
status(Integer): 用户状态，选填，1正常2禁用，默认1
\`\`\`

### responseParams 格式要求
采用层级缩进展示嵌套结构，每行一个字段

示例：
\`\`\`
code(Integer): 响应状态码，200成功，400参数错误，500服务器错误
message(String): 响应提示信息
data(Object): 响应数据对象
  - id(String): 用户唯一标识
  - name(String): 用户姓名
  - age(Integer): 用户年龄
  - status(Integer): 用户状态，1正常2禁用
  - createdAt(String): 创建时间，格式yyyy-MM-dd HH:mm:ss
\`\`\`

### responseFormat 格式要求
描述整体响应结构，包含：
1. 响应格式类型（JSON/XML）
2. 顶层字段说明
3. 状态码含义
4. 数据字段说明

示例：
\`\`\`
JSON格式响应，包含三个顶层字段：
- code: 状态码，200成功，400参数错误，401未授权，404资源不存在，500服务器错误
- message: 提示信息，成功时为"success"，失败时显示具体错误原因
- data: 业务数据对象，结构根据接口功能而定，失败时可能为null
\`\`\`

---

## 📊 置信度评分标准

| 分数范围 | 判断标准 | 说明 |
|---------|---------|------|
| 0.9-1.0 | 文档明确提及 | 需求中直接提到接口名称、系统名称 |
| 0.7-0.89 | 强烈暗示 | 有明确的业务场景和数据交互描述 |
| 0.5-0.69 | 合理推断 | 基于业务逻辑推断需要该接口 |
| 0.3-0.49 | 猜测 | 没有明确依据，仅基于经验猜测 |
| 0-0.29 | 不确定 | 完全不确定是否需要 |

---

## ✅ 输出质量检查清单

- [ ] 每个接口都有明确的系统名称
- [ ] 接口名称采用"动词+名词"格式
- [ ] 请求方法与接口功能匹配（查询用GET，创建用POST）
- [ ] 请求参数包含参数名、类型、说明、是否必填
- [ ] 响应参数包含完整的字段结构和说明
- [ ] responseFormat描述了整体响应结构
- [ ] confidenceScore基于实际证据合理评估
- [ ] JSON格式正确，可被解析

---

## 🎨 输出示例

\`\`\`json
[
  {
    "systemName": "用户中心系统",
    "interfaceName": "查询用户详细信息",
    "interfaceDesc": "根据用户ID查询用户的完整个人信息，包括基本资料、认证状态、会员等级等。用于用户信息展示、权限判断等场景。",
    "interfaceType": "HTTP",
    "requestMethod": "GET",
    "requestPath": "/api/v1/users/{userId}",
    "requestParams": "userId(String): 用户唯一标识，必填，路径参数，32位UUID格式",
    "responseParams": "code(Integer): 响应状态码，200成功\\nmessage(String): 响应提示信息\\ndata(Object): 用户信息对象\\n  - id(String): 用户唯一标识\\n  - name(String): 用户姓名\\n  - phone(String): 手机号，已脱敏（138****1234）\\n  - email(String): 邮箱地址\\n  - avatar(String): 头像URL\\n  - status(Integer): 账号状态，1正常2禁用3注销中\\n  - vipLevel(Integer): 会员等级，0普通1白银2黄金3钻石\\n  - createdAt(String): 注册时间",
    "responseFormat": "JSON格式响应。code为200表示查询成功，data中包含完整用户信息；code为404表示用户不存在；code为401表示无权限查询该用户信息。敏感信息（手机号）已脱敏处理。",
    "confidenceScore": 0.95,
    "aiSuggestion": "建议：1. 添加查询字段白名单参数，支持按需返回指定字段，减少数据传输；2. 考虑添加缓存机制，高频查询场景可降低数据库压力；3. 建议在响应中增加用户的最后登录时间和IP，用于安全审计。"
  },
  {
    "systemName": "消息推送系统",
    "interfaceName": "发送站内通知",
    "interfaceDesc": "向指定用户发送站内消息通知，支持消息模板和自定义内容。用于系统通知、业务提醒、营销推送等场景。",
    "interfaceType": "HTTP",
    "requestMethod": "POST",
    "requestPath": "/api/v1/messages/send",
    "requestParams": "userId(String): 接收用户ID，必填\\ntemplateCode(String): 消息模板编码，与content二选一\\ncontent(String): 自定义消息内容，与templateCode二选一，最大500字符\\nparams(Object): 模板参数，当使用templateCode时必填\\n  - 例如：{\"name\":\"张三\",\"orderNo\":\"123456\"}\\npriority(Integer): 优先级，选填，1高2中3低，默认2\\nexpireTime(String): 过期时间，选填，格式yyyy-MM-dd HH:mm:ss",
    "responseParams": "code(Integer): 响应状态码\\nmessage(String): 响应提示信息\\ndata(Object): 发送结果\\n  - messageId(String): 消息唯一标识\\n  - status(Integer): 发送状态，1成功2失败\\n  - sendTime(String): 发送时间",
    "responseFormat": "JSON格式响应。code为200表示消息已成功加入发送队列，data中返回messageId用于追踪；code为400表示参数错误；code为429表示发送频率超限。消息为异步发送，实际到达时间可能延迟1-5秒。",
    "confidenceScore": 0.85,
    "aiSuggestion": "建议：1. 添加批量发送接口，支持一次向多个用户发送相同消息；2. 增加消息分类字段，便于用户筛选和管理；3. 考虑添加消息已读回执功能，方便统计触达效果。"
  }
]
\`\`\`

---

## ⚠️ 重要提醒

1. **严格遵守JSON格式**：输出纯JSON数组，不要包含markdown标记
2. **基于文档分析**：只输出文档中明确提及或强烈暗示的接口，不要过度发散
3. **空数组情况**：如果确实没有识别到外部系统接口，返回空数组 \`[]\`
4. **推断要合理**：当文档信息不完整时，基于行业最佳实践进行合理推断
5. **置信度客观**：confidenceScore要基于实际证据客观评估

现在请分析上述文档内容，输出JSON格式的接口列表。`
}

// 带重试的API调用函数
const callZhipuAIWithRetry = async (content, apiKey, maxRetries = 3) => {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`=== 开始调用智谱AI API进行接口分析 (尝试 ${attempt}/${maxRetries}) ===`)
      console.log('API Key存在:', !!apiKey)
      console.log('API Key前缀:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A')
      console.log('使用模型:', process.env.ZHIPUAI_MODEL || 'glm-4-flash')
      console.log('内容长度:', content.length)
      console.log('内容预览:', content.substring(0, 200))
      
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.ZHIPUAI_MODEL || 'glm-4-flash',
          messages: [
            {
              role: 'system',
              content: `你是一位拥有10年经验的资深系统架构师，精通API设计、系统集成和技术方案设计。

核心能力：
1. 接口识别：能从需求文档中识别外部系统依赖和接口需求
2. API设计：遵循RESTful规范设计规范的接口
3. 参数设计：能设计完整的请求参数和响应结构
4. 风险评估：能评估接口的技术可行性和潜在风险

输出要求：
- 严格按照JSON数组格式返回，不要包含任何markdown标记
- 接口名称采用"动词+名词"格式
- 参数描述包含类型、说明、是否必填
- 置信度评分基于实际证据客观评估
- 确保JSON格式正确，可被直接解析`
            },
            {
              role: 'user',
              content: assembleInterfacePrompt(content)
            }
          ],
          temperature: 0.2,
          max_tokens: 16000,
          top_p: 0.8
        })
      })
      
      console.log('智谱AI响应状态:', response.status)
      
      // 处理429速率限制错误
      if (response.status === 429) {
        const errorText = await response.text()
        console.error(`智谱AI速率限制 (尝试 ${attempt}/${maxRetries}):`, errorText)
        
        if (attempt < maxRetries) {
          const waitTime = attempt * 15000 // 递增等待时间：15秒、30秒、45秒
          console.log(`等待 ${waitTime/1000} 秒后重试...`)
          await delay(waitTime)
          continue
        }
        
        throw new Error('API调用频率超限，请等待2-3分钟后重试')
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('智谱AI错误响应:', errorText)
        throw new Error(`HTTP请求失败: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('智谱AI响应结构:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasMessage: !!data.choices?.[0]?.message,
        hasContent: !!data.choices?.[0]?.message?.content
      })
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('AI返回了空的响应')
      }
      
      const aiResponse = data.choices[0].message.content
      console.log('AI原始响应长度:', aiResponse.length)
      console.log('AI响应预览:', aiResponse.substring(0, 300))
      
      // 解析AI返回的结果
      let cleanedResponse = aiResponse.trim()
      let interfacesList = null
      
      // 尝试多种方式提取JSON数组
      try {
        // 方法1：直接解析
        const parsed = JSON.parse(cleanedResponse)
        if (Array.isArray(parsed)) {
          interfacesList = parsed
          console.log('✓ 方法1成功：直接解析JSON数组')
        } else if (parsed.interfaces && Array.isArray(parsed.interfaces)) {
          // 兼容旧格式
          interfacesList = parsed.interfaces
          console.log('✓ 方法1成功：解析对象中的interfaces数组')
        }
      } catch (e) {
        console.log('✗ 方法1失败，尝试方法2')
        // 方法2：正则提取数组
        const arrayMatch = cleanedResponse.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (arrayMatch) {
          try {
            interfacesList = JSON.parse(arrayMatch[0])
            console.log('✓ 方法2成功：正则提取JSON数组')
          } catch (e2) {
            console.log('✗ 方法2失败，尝试方法3')
            // 方法3：提取代码块中的JSON
            const codeBlockMatch = cleanedResponse.match(/```(?:json)?\n([\s\S]*?)```/)
            if (codeBlockMatch) {
              try {
                const parsed = JSON.parse(codeBlockMatch[1].trim())
                if (Array.isArray(parsed)) {
                  interfacesList = parsed
                  console.log('✓ 方法3成功：提取代码块中的JSON数组')
                } else if (parsed.interfaces && Array.isArray(parsed.interfaces)) {
                  interfacesList = parsed.interfaces
                  console.log('✓ 方法3成功：提取代码块中的interfaces数组')
                }
              } catch (e3) {
                console.error('所有方法都失败')
              }
            }
          }
        }
      }
      
      if (!interfacesList) {
        console.error('JSON解析失败，返回空接口列表')
        interfacesList = []
      } else {
        console.log(`✓ 成功解析 ${interfacesList.length} 个接口`)
      }
      
      // 将新格式的接口数据转换为前端期望的格式
      const convertedInterfaces = interfacesList.map((item, index) => {
        // 处理 requestParams - 可能是对象或字符串
        let requestParamsStr = ''
        if (item.requestParams) {
          if (typeof item.requestParams === 'object') {
            requestParamsStr = Object.entries(item.requestParams)
              .map(([key, desc]) => `${key}: ${desc}`)
              .join('\n')
          } else {
            requestParamsStr = String(item.requestParams)
          }
        }
        
        // 处理 responseParams - 可能在旧格式中叫 responseFormat
        let responseParamsStr = ''
        if (item.responseParams) {
          responseParamsStr = String(item.responseParams)
        }
        
        // 处理 responseFormat - 响应格式说明
        let responseFormatStr = ''
        if (item.responseFormat) {
          responseFormatStr = String(item.responseFormat)
        }
        
        return {
          id: item.id || String(index + 1),
          name: item.interfaceName || item.name || '未命名接口',
          method: item.requestMethod || item.method || 'GET',
          path: item.requestPath || item.path || '',
          description: item.interfaceDesc || item.description || '',
          requestParams: requestParamsStr || item.requestParams || '',
          responseParams: responseParamsStr || item.responseParams || '',
          responseFormat: responseFormatStr || item.responseFormat || '',
          priority: item.priority || (item.confidenceScore >= 0.8 ? '高' : item.confidenceScore >= 0.5 ? '中' : '低'),
          category: item.systemName || item.category || '其他',
          // 保留新字段的原始数据
          _raw: {
            systemName: item.systemName,
            interfaceType: item.interfaceType,
            confidenceScore: item.confidenceScore,
            aiSuggestion: item.aiSuggestion
          }
        }
      })
      
      console.log(`✓ 转换完成，共 ${convertedInterfaces.length} 个接口`)
      
      // 转换为新格式的返回结构
      const parsedResult = { interfaces: convertedInterfaces }
      
      return { success: true, data: parsedResult }
      
    } catch (error) {
      lastError = error
      console.error(`尝试 ${attempt} 失败:`, error.message)
      
      // 如果是速率限制错误且还有重试次数，继续重试
      if (error.message.includes('频率超限') && attempt < maxRetries) {
        continue
      }
      
      // 其他错误直接抛出
      throw error
    }
  }
  
  // 所有重试都失败
  throw lastError
}

// 接口分析路由
router.post('/analyze-interfaces', async (req, res) => {
  try {
    const { content, type } = req.body
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '内容不能为空'
      })
    }

    console.log('=== 接口分析请求开始 ===')
    console.log('内容长度:', content.length)
    console.log('内容类型:', type)
    
    // 从环境变量获取API密钥
    const apiKey = process.env.ZHIPUAI_API_KEY
    console.log('环境变量检查:')
    console.log('  - ZHIPUAI_API_KEY存在:', !!apiKey)
    console.log('  - ZHIPUAI_MODEL:', process.env.ZHIPUAI_MODEL)
    
    if (!apiKey) {
      console.warn('⚠️ 未配置智谱AI API密钥，使用模拟模式')
      // 模拟模式返回示例接口
      return res.status(200).json({
        success: true,
        message: '分析完成（模拟模式：未配置API密钥）',
        data: {
          interfaces: [
            {
              id: '1',
              name: '获取列表',
              method: 'GET',
              path: '/api/items',
              description: '获取数据列表，支持分页和筛选',
              requestParams: 'page(Integer): 页码，从1开始\npageSize(Integer): 每页数量，默认10\nkeyword(String): 搜索关键词，选填',
              responseParams: 'code(Integer): 状态码，200成功\nmessage(String): 提示信息\ndata(Object): 响应数据\n  - list(Array): 数据列表\n  - total(Integer): 总记录数\n  - page(Integer): 当前页码\n  - pageSize(Integer): 每页数量',
              responseFormat: 'JSON格式响应，包含code、message、data三个字段。code为200表示成功，data中包含list数组、total总数、page当前页、pageSize每页数量',
              priority: '高',
              category: '数据管理'
            },
            {
              id: '2',
              name: '创建数据',
              method: 'POST',
              path: '/api/items',
              description: '创建新的数据记录',
              requestParams: 'name(String): 名称，必填，最大50字符\ndescription(String): 描述，选填，最大500字符\ntype(String): 类型，选填',
              responseParams: 'code(Integer): 状态码\nmessage(String): 提示信息\ndata(Object): 新创建的数据\n  - id(String): 新记录ID\n  - name(String): 名称\n  - createdAt(String): 创建时间',
              responseFormat: 'JSON格式响应。code为201表示创建成功，data中返回新创建记录的完整信息',
              priority: '高',
              category: '数据管理'
            },
            {
              id: '3',
              name: '更新数据',
              method: 'PUT',
              path: '/api/items/:id',
              description: '更新指定数据记录',
              requestParams: 'id(String): 记录ID，路径参数，必填\nname(String): 名称，选填\ndescription(String): 描述，选填',
              responseParams: 'code(Integer): 状态码\nmessage(String): 提示信息\ndata(Object): 更新后的数据',
              responseFormat: 'JSON格式响应。code为200表示更新成功',
              priority: '中',
              category: '数据管理'
            },
            {
              id: '4',
              name: '删除数据',
              method: 'DELETE',
              path: '/api/items/:id',
              description: '删除指定数据记录',
              requestParams: 'id(String): 记录ID，路径参数，必填',
              responseParams: 'code(Integer): 状态码\nmessage(String): 提示信息',
              responseFormat: 'JSON格式响应。code为200表示删除成功，无data字段',
              priority: '高',
              category: '数据管理'
            }
          ]
        }
      })
    }
    
    try {
      // 使用带重试的API调用
      const result = await callZhipuAIWithRetry(content, apiKey, 3)
      
      res.status(200).json({
        success: true,
        message: `接口分析完成，共识别 ${result.data.interfaces.length} 个接口`,
        data: result.data
      })
      
    } catch (aiError) {
      console.error('=== 调用智谱AI失败 ===')
      console.error('错误类型:', aiError.constructor.name)
      console.error('错误信息:', aiError.message)
      console.error('错误堆栈:', aiError.stack)
      
      // 更友好的错误提示
      let errorMessage = aiError.message
      if (aiError.message.includes('频率超限') || aiError.message.includes('429')) {
        errorMessage = 'API调用频率超限，请等待1-2分钟后重试'
      }
      
      res.status(200).json({
        success: false,
        message: `接口分析失败: ${errorMessage}`,
        data: {
          interfaces: [{
            id: '1',
            name: '数据接口',
            method: 'GET',
            path: '/api/data',
            description: `AI分析失败: ${errorMessage}，请手动补充接口信息`,
            requestParams: '',
            responseParams: '',
            responseFormat: '',
            priority: '中',
            category: '其他'
          }]
        }
      })
    }
  } catch (error) {
    console.error('接口分析错误:', error)
    res.status(500).json({
      success: false,
      message: error.message || '接口分析失败，请稍后重试'
    })
  }
})

// ==================== Dashboard 统计数据路由 ====================

// KPI 统计数据
router.get('/kpi', async (req, res) => {
  try {
    const { default: Requirement } = await import('../models/Requirement.js')
    const { default: Project } = await import('../models/Project.js')

    const totalRequirements = await Requirement.countDocuments({})
    const pendingRequirements = await Requirement.countDocuments({ status: '待评审' })
    const inProgressRequirements = await Requirement.countDocuments({ status: '进行中' })
    const completedRequirements = await Requirement.countDocuments({ status: '已完成' })
    const totalProjects = await Project.countDocuments({})

    res.json({
      success: true,
      data: {
        totalRequirements,
        pendingRequirements,
        inProgressRequirements,
        completedRequirements,
        totalProjects,
        completionRate: totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0,
      }
    })
  } catch (error) {
    console.error('[Analysis] 获取KPI数据失败:', error)
    res.status(500).json({ success: false, message: '获取KPI数据失败' })
  }
})

// 需求趋势数据
router.get('/requirements/trend', async (req, res) => {
  try {
    const { default: Requirement } = await import('../models/Requirement.js')

    const { startDate, endDate } = req.query
    const dateFilter = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {}
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate)
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate)
    }

    const trend = await Requirement.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', '已完成'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ])

    res.json({
      success: true,
      data: trend.map(item => ({
        date: item._id,
        total: item.count,
        completed: item.completed
      }))
    })
  } catch (error) {
    console.error('[Analysis] 获取需求趋势失败:', error)
    res.status(500).json({ success: false, message: '获取需求趋势失败' })
  }
})

// 项目进度数据
router.get('/projects/progress', async (req, res) => {
  try {
    const { default: Project } = await import('../models/Project.js')

    const projects = await Project.find({})
      .select('name progress status')
      .sort({ progress: -1 })
      .limit(10)
      .lean()

    res.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('[Analysis] 获取项目进度失败:', error)
    res.status(500).json({ success: false, message: '获取项目进度失败' })
  }
})

// 团队绩效数据
router.get('/team/performance', async (req, res) => {
  try {
    const { default: Requirement } = await import('../models/Requirement.js')

    const performance = await Requirement.aggregate([
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', '已完成'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ])

    res.json({
      success: true,
      data: performance
    })
  } catch (error) {
    console.error('[Analysis] 获取团队绩效失败:', error)
    res.status(500).json({ success: false, message: '获取团队绩效失败' })
  }
})

// 项目分布数据
router.get('/projects/distribution', async (req, res) => {
  try {
    const { default: Project } = await import('../models/Project.js')

    const distribution = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' }
        }
      }
    ])

    res.json({
      success: true,
      data: distribution
    })
  } catch (error) {
    console.error('[Analysis] 获取项目分布失败:', error)
    res.status(500).json({ success: false, message: '获取项目分布失败' })
  }
})

// 导出数据
router.post('/export/:exportType', async (req, res) => {
  try {
    const { exportType } = req.params
    if (!['pdf', 'excel', 'csv'].includes(exportType)) {
      return res.status(400).json({ success: false, message: '不支持的导出格式' })
    }

    res.json({
      success: false,
      message: '导出功能正在开发中，敬请期待'
    })
  } catch (error) {
    console.error('[Analysis] 导出数据失败:', error)
    res.status(500).json({ success: false, message: '导出数据失败' })
  }
})

export default router
/**
 * AI Requirements Engine - Fixed UTF-8 Version
 */

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { aiRequirementsAPI } from '@/services/api'
import { ReviewTable } from '@/components/ReviewTable'
import { IssueDetailDialog } from '@/components/IssueDetailDialog'
import { ReviewList } from '@/components/ReviewList'
import {
  Sparkles,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  File,
  RefreshCw,
  Copy,
  Filter,
  User,
  Calendar,
  Download,
  Eye
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import * as mammoth from 'mammoth'
import type { ReviewResult, Issue } from '@/types/review-types'
import { generateIssueId, getIssueStatistics } from '@/utils/review-utils'
import {
  loadReviewsFromStorage,
  saveReviewsToStorage
} from '@/utils/storage-utils'
import {
  UnifiedInputSource,
  ContentLoadResult
} from '@/types/unified-input'
import { smartContentLoader } from '@/utils/SmartContentLoader'
import InputSourceSelector from './InputSourceSelector'

const AIRequirementsEngine = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'list'>('analyze')
  const [inputSource, setInputSource] = useState<UnifiedInputSource | null>(null)
  const [requirementText, setRequirementText] = useState('')
  const [requirementHtml, setRequirementHtml] = useState<string | undefined>(undefined)
  const [requirementFileName, setRequirementFileName] = useState<string | undefined>(undefined)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [reviews, setReviews] = useState<ReviewResult[]>([])
  const [currentReview, setCurrentReview] = useState<ReviewResult | null>(null)
  const [aiServiceAvailable, setAiServiceAvailable] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [showIssueDialog, setShowIssueDialog] = useState(false)
  const [isContentLoading, setIsContentLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadedReviews = loadReviewsFromStorage()
    const migratedReviews = loadedReviews.map(review => migrateReviewData(review))
    setReviews(migratedReviews)
    checkAIStatus()
  }, [])

  const checkAIStatus = async () => {
    try {
      const response = await aiRequirementsAPI.healthCheck()
      setAiServiceAvailable(response.data?.data?.available ?? response.data?.available)
    } catch (error) {
      console.error('[AI] Check failed:', error)
      setAiServiceAvailable(false)
    }
  }

  const getCurrentUser = () => {
    try {
      const user = localStorage.getItem('user')
      if (user) {
        const userData = JSON.parse(user)
        return userData.username || userData.name || 'Anonymous User'
      }
    } catch (error) {
      console.error('[User] Get failed:', error)
    }
    return 'Anonymous User'
  }

  const extractTitle = (requirement: string, fileName?: string): string => {
    if (fileName) {
      return fileName.replace(/\.[^/.]+$/, '')
    }

    const lines = requirement.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      let title = lines[0].trim()
      if (title.length > 50) {
        title = title.substring(0, 50) + '...'
      }
      return title
    }

    return 'Untitled Requirement'
  }

  const migrateReviewData = (review: ReviewResult): ReviewResult => {
    const migrated = { ...review }

    if (!migrated.title) {
      // 如果requirement包含HTML标签，先去除标签再提取标题
      const textContent = migrated.requirement.replace(/<[^>]*>/g, '')
      migrated.title = extractTitle(textContent, migrated.fileName)
    }

    if (!migrated.creator) {
      migrated.creator = 'Anonymous User'
    }

    if (migrated.status === 'completed' && !migrated.completedAt) {
      migrated.completedAt = migrated.timestamp
    }

    // 确保旧数据有默认值
    if (migrated.htmlContent === undefined) {
      migrated.htmlContent = undefined
    }

    return migrated
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        alert('请上传文本或文档文件（.txt, .md, .doc, .docx, .pdf）')
        return
      }
      setUploadedFile(file)
    }
  }

  // 处理输入源变化
  const handleInputSourceChange = async (source: UnifiedInputSource | null) => {
    if (!source) {
      setInputSource(null)
      setUploadedFile(null)
      setRequirementText('')
      setRequirementHtml(undefined)
      setRequirementFileName(undefined)
      return
    }

    setInputSource(source)

    // 如果是需求池需求，自动加载内容
    if (source.type === 'requirement') {
      setIsContentLoading(true)
      try {
        const content = await smartContentLoader.getContent(source)
        setRequirementText(content.text)
        setRequirementHtml(content.html)
        setRequirementFileName(content.fileName)
        console.log('[AI] 从需求池加载内容成功:', content.sourceInfo)
      } catch (error) {
        console.error('[AI] 加载需求内容失败:', error)
        alert(`加载需求内容失败: ${error instanceof Error ? error.message : '未知错误'}`)
        setInputSource(null)
      } finally {
        setIsContentLoading(false)
      }
    } else if (source.type === 'document') {
      setUploadedFile(null)
      setRequirementText('')
      setRequirementHtml(undefined)
      setRequirementFileName(undefined)
    } else if (source.type === 'text') {
      setUploadedFile(null)
      setRequirementHtml(undefined)
      setRequirementFileName(undefined)
      setRequirementText(source.content || '')
    }
  }

  const readFileContent = async (file: File): Promise<{ text: string; html?: string; fileData: string }> => {
    // 1. 提取文本和HTML内容
    const extractContent = (): Promise<{ text: string; html?: string }> => {
      const fileName = file.name.toLowerCase()
      console.log('[File] Extracting content from:', file.name)

      return new Promise((resolve, reject) => {
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          console.log('[File] Using mammoth for Word')
          const reader = new FileReader()

          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer
              const result = await mammoth.convertToHtml({
                arrayBuffer,
                convertImage: mammoth.images.imgElement(function(image) {
                  return image.read("base64").then(function(imageBuffer) {
                    return {
                      src: "data:" + image.contentType + ";base64," + imageBuffer
                    }
                  })
                })
              })
              const html = result.value
              console.log('[File] Word HTML extracted, length:', html.length)
              resolve({ text: html, html })
            } catch (error) {
              console.error('[File] Word failed:', error)
              reject(new Error('Word文档读取失败'))
            }
          }

          reader.onerror = (e) => {
            console.error('[File] Read failed:', e)
            reject(new Error('文件读取失败'))
          }

          reader.readAsArrayBuffer(file)
        } else if (fileName.endsWith('.pdf')) {
          console.log('[File] PDF - text extraction only')
          const reader = new FileReader()

          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer
              const pdfjs = pdfjsLib.default
              pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`

              const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
              const pdf = await loadingTask.promise
              const numPages = pdf.numPages

              console.log('[File] PDF loaded, pages:', numPages)

              let fullText = ''
              for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items
                  .map((item: any) => item.str || '')
                  .join(' ')
                fullText += pageText + '\n'
              }

              console.log('[File] PDF extracted, length:', fullText.length)
              resolve({ text: fullText })
            } catch (error) {
              console.error('[File] PDF failed:', error)
              reject(new Error('PDF读取失败'))
            }
          }

          reader.onerror = (e) => {
            console.error('[File] Read failed:', e)
            reject(new Error('文件读取失败'))
          }

          reader.readAsArrayBuffer(file)
        } else if (fileName.endsWith('.md')) {
          console.log('[File] Markdown file')
          const reader = new FileReader()

          reader.onload = (e) => {
            try {
              const text = e.target?.result as string
              if (!text || text.trim().length === 0) {
                reject(new Error('文件为空'))
                return
              }
              console.log('[File] Markdown success, length:', text.length)
              resolve({ text })
            } catch (error) {
              console.error('[File] Process failed:', error)
              reject(error)
            }
          }

          reader.onerror = (e) => {
            console.error('[File] Read failed:', e)
            reject(new Error('文件读取失败'))
          }

          reader.readAsText(file, 'utf-8')
        } else if (fileName.endsWith('.txt')) {
          console.log('[File] Using FileReader')
          const reader = new FileReader()

          reader.onload = (e) => {
            try {
              const text = e.target?.result as string
              if (!text || text.trim().length === 0) {
                reject(new Error('文件为空'))
                return
              }
              console.log('[File] Text success, length:', text.length)
              resolve({ text })
            } catch (error) {
              console.error('[File] Process failed:', error)
              reject(error)
            }
          }

          reader.onerror = (e) => {
            console.error('[File] Read failed:', e)
            reject(new Error('文件读取失败'))
          }

          reader.readAsText(file, 'utf-8')
        } else {
          reject(new Error(`不支持的文件格式: ${file.name}`))
        }
      })
    }

    // 2. 读取文件为base64
    const readAsBase64 = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const fileData = e.target?.result as string
          resolve(fileData)
        }
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsDataURL(file)
      })
    }

    // 并行执行
    const [content, fileData] = await Promise.all([
      extractContent(),
      readAsBase64()
    ])

    return {
      text: content.text,
      html: content.html,
      fileData
    }
  }

  const analyzeRequirement = async (requirement: string, inputType: 'text' | 'document' | 'requirement', fileName?: string): Promise<ReviewResult['review']> => {
    try {
      console.log('[Frontend] Start analysis, length:', requirement.length, 'type:', inputType)

      const response = await aiRequirementsAPI.analyze({
        requirement
      })

      console.log('[Frontend] Response:', JSON.stringify(response, null, 2))

      const axiosData = response?.data
      const reviewData = axiosData?.data

      if (!reviewData || typeof reviewData !== 'object' || reviewData === null) {
        throw new Error('Invalid response format')
      }

      if (!reviewData.issues) {
        console.warn('[Frontend] No issues field, initializing empty array')
        reviewData.issues = []
      } else if (!Array.isArray(reviewData.issues)) {
        console.error('[Frontend] Issues is not array:', typeof reviewData.issues)
        throw new Error(`Issues is not array, type: ${typeof reviewData.issues}`)
      }

      if (reviewData.overallScore === undefined) {
        reviewData.overallScore = 0
      }

      return reviewData
    } catch (error: any) {
      console.error('[Frontend] Analysis failed:', error)

      const errorData = error?.response?.data
      if (errorData?.suggestion) {
        error._suggestion = errorData.suggestion
      }
      if (errorData?.errorType) {
        error._errorType = errorData.errorType
      }

      throw error
    }
  }

  const handleAnalyze = async () => {
    let content = ''
    let htmlContent: string | undefined
    let fileData: string | undefined
    let fileSize: number | undefined

    // 统一内容获取逻辑
    if (isContentLoading) {
      alert('正在加载内容，请稍候...')
      return
    }

    if (inputSource?.type === 'document' && uploadedFile) {
      try {
        const result = await readFileContent(uploadedFile)
        content = result.text
        htmlContent = result.html
        fileData = result.fileData
        fileSize = uploadedFile.size
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        alert(`读取失败: ${errorMessage}`)
        return
      }
    } else if (inputSource?.type === 'text') {
      content = requirementText.trim()
    } else if (inputSource?.type === 'requirement') {
      content = requirementText.trim()
      htmlContent = requirementHtml
    }

    if (!content) {
      alert('请输入需求内容、上传文件或从需求池选择需求')
      return
    }

    setIsAnalyzing(true)
    const reviewId = Date.now().toString()

    const creator = getCurrentUser()
    const title = extractTitle(content, uploadedFile?.name)

    const initialResult: ReviewResult = {
      id: reviewId,
      requirement: content,
      htmlContent,
      title: inputSource?.type === 'requirement' && inputSource.requirementTitle
        ? `${inputSource.businessId} - ${inputSource.requirementTitle}`
        : title,
      creator,
      inputMethod: inputSource?.type === 'requirement' ? 'requirement' : inputSource?.type || 'text',
      fileName: uploadedFile?.name || requirementFileName,
      fileData,
      fileType: uploadedFile?.type,
      fileSize,
      timestamp: new Date().toLocaleString('zh-CN'),
      status: 'analyzing',
      review: {
        overallScore: 0,
        issues: []
      },
      sourceRequirementId: inputSource?.requirementId
    }

    setCurrentReview(initialResult)

    try {
      const review = await analyzeRequirement(content, inputSource?.type || 'text', uploadedFile?.name)
      
      if (!review || typeof review !== 'object') {
        throw new Error('Invalid review data')
      }

      if (!review.issues || !Array.isArray(review.issues)) {
        throw new Error('Invalid issues data')
      }

      const issuesWithId = review.issues.map((issue, index) => {
        if (!issue || typeof issue !== 'object') {
          console.warn(`[Frontend] Skip issue ${index}:`, issue)
          return null
        }
        return {
          ...issue,
          id: generateIssueId(),
          status: '待处理' as const,
          note: undefined
        }
      }).filter((issue): issue is Issue => issue !== null)

      const completedResult: ReviewResult = {
        ...initialResult,
        status: 'completed',
        completedAt: new Date().toLocaleString('zh-CN'),
        review: {
          ...review,
          issues: issuesWithId
        }
      }

      setCurrentReview(completedResult)
      const updatedReviews = [completedResult, ...reviews]
      setReviews(updatedReviews)
      saveReviewsToStorage(updatedReviews)

    } catch (error: any) {
      console.error('[AI] Analysis failed:', error)
      const errorResult: ReviewResult = {
        id: reviewId,
        requirement: content,
        htmlContent,
        title: extractTitle(content, uploadedFile?.name),
        creator: getCurrentUser(),
        inputMethod: inputSource?.type === 'requirement' ? 'requirement' : inputSource?.type || 'text',
        fileName: uploadedFile?.name,
        fileData,
        fileType: uploadedFile?.type,
        fileSize,
        timestamp: new Date().toLocaleString('zh-CN'),
        status: 'error',
        error: error.message || '分析失败',
        review: {
          overallScore: 0,
          issues: []
        }
      }
      setCurrentReview(errorResult)

      let errorMessage = error.message || '分析失败'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'AI分析请求超时，请检查网络连接或减少输入内容后重试'
      } else if (error.response?.status === 503) {
        errorMessage = 'AI服务不可用，请检查后端API密钥配置'
      } else if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter
        errorMessage = retryAfter
          ? `AI请求频率超限，请等待${retryAfter}秒后重试`
          : 'AI请求频率超限，请等待1-2分钟后重试'
      } else if (error.response?.status === 401) {
        errorMessage = '认证已过期，请重新登录'
      } else if (error._suggestion) {
        errorMessage = error._suggestion
      }
      alert(`分析失败: ${errorMessage}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleIssueUpdate = (issueId: string, updates: Partial<Issue>) => {
    if (!currentReview) return

    const updatedIssues = currentReview.review.issues.map(issue =>
      issue.id === issueId ? { ...issue, ...updates } : issue
    )

    const updatedReview: ReviewResult = {
      ...currentReview,
      review: {
        ...currentReview.review,
        issues: updatedIssues
      }
    }

    setCurrentReview(updatedReview)

    const updatedReviews = reviews.map(review =>
      review.id === currentReview.id ? updatedReview : review
    )
    setReviews(updatedReviews)
    saveReviewsToStorage(updatedReviews)
  }

  const handleViewIssueDetail = (issue: Issue) => {
    setSelectedIssue(issue)
    setShowIssueDialog(true)
  }

  const handleReanalyze = (review: ReviewResult) => {
    setRequirementText(review.requirement)
    setInputSource({
      type: review.inputMethod === 'requirement' ? 'requirement' : review.inputMethod === 'document' ? 'document' : 'text',
      content: review.inputMethod === 'text' ? review.requirement : undefined,
      requirementId: review.sourceRequirementId,
      requirementTitle: review.inputMethod === 'requirement' ? review.title : undefined,
      businessId: review.sourceRequirementId ? review.title : undefined
    })
    setCurrentReview(review)
  }

  const handleCopyReview = (review: ReviewResult) => {
    if (!review || !review.review) {
      alert('无效的评审数据')
      return
    }

    if (!Array.isArray(review.review.issues)) {
      alert('无效的问题数据')
      return
    }

    const stats = getIssueStatistics(review.review.issues)
    const reviewText = `AI需求评审报告
================

评分: ${review.review.overallScore}/100
问题总数: ${stats.total}

${review.review.issues.map(issue => `- ${issue.issue_desc}`).join('\n')}

生成时间: ${review.timestamp}
`

    navigator.clipboard.writeText(reviewText)
    alert('报告已复制到剪贴板')
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 处理文件下载
  const handleDownloadFile = () => {
    if (!currentReview?.fileData || !currentReview?.fileName) return

    try {
      const link = document.createElement('a')
      link.href = currentReview.fileData
      link.download = currentReview.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('[Download] Failed:', error)
      alert('下载失败')
    }
  }

  // 获取文件图标
  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <File className="h-6 w-6" />

    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return <File className="h-6 w-6 text-red-500" />
      case 'doc':
      case 'docx':
        return <File className="h-6 w-6 text-blue-500" />
      case 'txt':
      case 'md':
        return <File className="h-6 w-6 text-gray-500" />
      default:
        return <File className="h-6 w-6 text-gray-500" />
    }
  }

  // 渲染文档卡片
  const renderDocumentCard = () => {
    if (currentReview?.inputMethod === 'document' && currentReview.fileName) {
      return (
        <div className="border-2 border-dashed border-blue-200 rounded-lg overflow-hidden shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <div className="mb-4 p-4 bg-white rounded-full shadow-md">
              {getFileIcon(currentReview.fileName)}
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">{currentReview.fileName}</h4>
            <div className="text-sm text-gray-500 mb-4">
              {currentReview.fileSize ? `${(currentReview.fileSize / 1024).toFixed(2)} KB` : ''}
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleDownloadFile}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                下载文档
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (currentReview.fileData) {
                    const ext = currentReview.fileName?.toLowerCase().split('.').pop()
                    
                    if (ext === 'pdf') {
                      // PDF: 直接打开原文件
                      const newWindow = window.open('', '_blank')
                      if (newWindow) {
                        newWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="UTF-8">
                            <title>${currentReview.fileName}</title>
                            <style>
                              body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
                              iframe { width: 100%; height: 100vh; border: none; }
                            </style>
                          </head>
                          <body>
                            <iframe src="${currentReview.fileData}" type="application/pdf"></iframe>
                          </body>
                          </html>
                        `)
                        newWindow.document.close()
                      }
                    } else if (ext === 'docx' || ext === 'doc') {
                      // Word: 使用HTML格式预览
                      const newWindow = window.open('', '_blank')
                      if (newWindow) {
                        newWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="UTF-8">
                            <title>${currentReview.fileName}</title>
                            <style>
                              body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                padding: 40px;
                                margin: 0;
                                background-color: #ffffff;
                                color: #333;
                                max-width: 1200px;
                                margin: 0 auto;
                              }
                              .document-header {
                                border-bottom: 2px solid #e0e0e0;
                                padding-bottom: 20px;
                                margin-bottom: 30px;
                              }
                              .document-title {
                                font-size: 24px;
                                font-weight: bold;
                                margin: 0 0 10px 0;
                                color: #1a1a1a;
                              }
                              .document-meta {
                                font-size: 12px;
                                color: #666;
                                margin-top: 5px;
                              }
                              /* Word样式 */
                              table { border-collapse: collapse; margin: 10px 0; }
                              td, th { border: 1px solid #ddd; padding: 8px; }
                              th { background-color: #f5f5f5; }
                              h1, h2, h3, h4, h5, h6 { margin-top: 20px; }
                              ul, ol { margin: 10px 0; padding-left: 30px; }
                              li { margin: 5px 0; }
                            </style>
                          </head>
                          <body>
                            <div class="document-header">
                              <h1 class="document-title">${currentReview.fileName}</h1>
                              <div class="document-meta">
                                字符数: ${currentReview.requirement.length} |
                                生成时间: ${currentReview.timestamp}
                              </div>
                            </div>
                            <div class="document-content">
                              ${currentReview.htmlContent || currentReview.requirement}
                            </div>
                          </body>
                          </html>
                        `)
                        newWindow.document.close()
                      }
                    } else if (ext === 'md') {
                      // Markdown: 预览为格式化文本
                      const newWindow = window.open('', '_blank')
                      if (newWindow) {
                        // 简单的Markdown转HTML
                        let html = currentReview.requirement
                          // 标题
                          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                          // 粗体
                          .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                          // 斜体
                          .replace(/\*(.*)\*/gim, '<i>$1</i>')
                          // 代码块
                          .replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>')
                          // 行内代码
                          .replace(/`([^`]+)`/gim, '<code>$1</code>')
                          // 链接
                          .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
                          // 换行
                          .replace(/\n/g, '<br>')
                        
                        newWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="UTF-8">
                            <title>${currentReview.fileName}</title>
                            <style>
                              body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                font-size: 14px;
                                line-height: 1.8;
                                padding: 40px;
                                margin: 0;
                                background-color: #ffffff;
                                color: #333;
                                max-width: 1200px;
                                margin: 0 auto;
                              }
                              .document-header {
                                border-bottom: 2px solid #e0e0e0;
                                padding-bottom: 20px;
                                margin-bottom: 30px;
                              }
                              .document-title {
                                font-size: 24px;
                                font-weight: bold;
                                margin: 0 0 10px 0;
                                color: #1a1a1a;
                              }
                              .document-meta {
                                font-size: 12px;
                                color: #666;
                                margin-top: 5px;
                              }
                              h1, h2, h3 { margin-top: 20px; color: #1a1a1a; }
                              code { background-color: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
                              pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
                              a { color: #0066cc; }
                            </style>
                          </head>
                          <body>
                            <div class="document-header">
                              <h1 class="document-title">${currentReview.fileName}</h1>
                              <div class="document-meta">
                                字符数: ${currentReview.requirement.length} |
                                生成时间: ${currentReview.timestamp}
                              </div>
                            </div>
                            <div class="document-content">
                              ${html}
                            </div>
                          </body>
                          </html>
                        `)
                        newWindow.document.close()
                      }
                    } else {
                      // TXT: 显示纯文本但保留格式
                      const newWindow = window.open('', '_blank')
                      if (newWindow) {
                        newWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="UTF-8">
                            <title>${currentReview.fileName}</title>
                            <style>
                              body {
                                font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
                                font-size: 14px;
                                line-height: 1.6;
                                padding: 40px;
                                margin: 0;
                                background-color: #ffffff;
                                color: #333;
                                max-width: 1200px;
                                margin: 0 auto;
                              }
                              .document-container {
                                white-space: pre-wrap;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                              }
                              .document-header {
                                border-bottom: 2px solid #e0e0e0;
                                padding-bottom: 20px;
                                margin-bottom: 30px;
                              }
                              .document-title {
                                font-size: 24px;
                                font-weight: bold;
                                margin: 0 0 10px 0;
                                color: #1a1a1a;
                              }
                              .document-meta {
                                font-size: 12px;
                                color: #666;
                                margin-top: 5px;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="document-header">
                              <h1 class="document-title">${currentReview.fileName}</h1>
                              <div class="document-meta">
                                字符数: ${currentReview.requirement.length} |
                                生成时间: ${currentReview.timestamp}
                              </div>
                            </div>
                            <div class="document-container">${currentReview.requirement.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                          </body>
                          </html>
                        `)
                        newWindow.document.close()
                      }
                    }
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                预览内容
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // 文本输入/需求池模式：显示平铺内容
    return (
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">
              {currentReview.inputMethod === 'requirement' ? '需求池内容' : '需求文档'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {currentReview.requirement.length} 字符
          </span>
        </div>
        <div className="p-5 max-h-[400px] overflow-y-auto bg-white">
          <div 
            className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-mono text-sm"
            style={{
              tabSize: 4,
              WebkitTextSizeAdjust: '100%'
            }}
          >
            {currentReview.requirement}
          </div>
        </div>
      </div>
    )
  }

  const clearCurrentReview = () => {
    setCurrentReview(null)
    setSelectedIssue(null)
    setShowIssueDialog(false)
  }

  const handleDeleteReview = (reviewId: string) => {
    const updatedReviews = reviews.filter(review => review.id !== reviewId)
    setReviews(updatedReviews)
    saveReviewsToStorage(updatedReviews)

    if (currentReview?.id === reviewId) {
      clearCurrentReview()
    }
  }

  const handleBatchDeleteReviews = (reviewIds: string[]) => {
    const updatedReviews = reviews.filter(review => !reviewIds.includes(review.id))
    setReviews(updatedReviews)
    saveReviewsToStorage(updatedReviews)

    // 如果当前正在查看的记录被删除,则清除
    if (currentReview && reviewIds.includes(currentReview.id)) {
      clearCurrentReview()
    }
  }

  const handleViewDetailFromList = (review: ReviewResult) => {
    // 只记录查看，不跳转，使用 ReviewList 内置的弹框显示详情
    console.log('Viewing review:', review.id)
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-primary-600 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">AI 需求评审</h2>
                <p className="text-sm text-white/90">基于资深 IT 需求分析师标准的智能分析</p>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="flex items-center space-x-2">
              {aiServiceAvailable ? (
                <div className="flex items-center space-x-2 text-sm px-4 py-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <span className="text-green-800 font-medium">AI 服务在线</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-sm px-4 py-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-4 w-4 text-red-700" />
                  <span className="text-red-800 font-medium">AI 服务不可用</span>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value: 'analyze' | 'list') => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1.5 rounded-xl">
              <TabsTrigger 
                value="analyze"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI 分析
              </TabsTrigger>
              <TabsTrigger 
                value="list"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <Filter className="h-4 w-4 mr-2" />
                评审列表 ({reviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyze" className="space-y-4">
              {/* 统一输入源选择器 */}
              <InputSourceSelector
                value={inputSource}
                onChange={handleInputSourceChange}
                availableModes={['text', 'document', 'requirement']}
                disabled={isAnalyzing || isContentLoading}
              />

              {/* 加载状态提示 */}
              {isContentLoading && (
                <div className="flex items-center justify-center p-6 bg-blue-50 rounded-xl">
                  <Loader2 className="h-5 w-5 text-blue-600 mr-2 animate-spin" />
                  <span className="text-blue-700">正在加载需求内容...</span>
                </div>
              )}

              {/* 文档上传区域（仅在文档模式下显示） */}
              {inputSource?.type === 'document' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-indigo-300/50 rounded-2xl p-12 text-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 hover:from-indigo-50 hover:to-purple-50 transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.doc,.docx,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploadedFile ? (
                      <div className="space-y-3">
                        <div className="p-6 bg-white rounded-xl shadow-md inline-block">
                          <div className="flex items-center space-x-4">
                            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                              <File className="h-10 w-10 text-white" />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-gray-900 text-lg">{uploadedFile.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {(uploadedFile.size / 1024).toFixed(2)} KB
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 bg-white rounded-xl shadow-md inline-block mb-4">
                          <Upload className="h-16 w-16 mx-auto text-gradient-to-br from-indigo-500 to-purple-600 text-transparent bg-clip-text" />
                        </div>
                        <div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-indigo-600 hover:text-indigo-700 font-semibold text-lg transition-colors"
                          >
                            点击上传文档
                          </button>
                          <span className="text-gray-600 ml-2">或拖拽文件到这里</span>
                        </div>
                        <p className="text-sm text-gray-500 bg-white/80 backdrop-blur-sm inline-block px-4 py-2 rounded-full">
                          支持格式：.txt, .md, .doc, .docx, .pdf
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end items-center space-x-3">
                    {uploadedFile && (
                      <Button
                        variant="outline"
                        onClick={() => setUploadedFile(null)}
                        className="border-gray-300 hover:bg-gray-50 px-6"
                      >
                        <X className="h-4 w-4 mr-2" />
                        清除文件
                      </Button>
                    )}
                    <Button
                      onClick={handleAnalyze}
                      disabled={!uploadedFile || isAnalyzing}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 px-8 py-2.5 text-base font-medium"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          开始分析
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* 文本/需求模式的分析按钮 */}
              {(inputSource?.type === 'text' || inputSource?.type === 'requirement') && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleAnalyze}
                    disabled={!requirementText.trim() || isAnalyzing || isContentLoading}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 px-8 py-2.5 text-base font-medium"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        开始分析
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="list">
              <ReviewList
                reviews={reviews}
                onViewDetail={handleViewDetailFromList}
                onDeleteReview={handleDeleteReview}
                onBatchDeleteReviews={handleBatchDeleteReviews}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {currentReview && activeTab === 'analyze' && (
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {currentReview.status === 'analyzing' && (
                  <div className="flex items-center space-x-2 text-indigo-600 px-4 py-2 bg-indigo-100 rounded-full">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">分析中</span>
                  </div>
                )}
                {currentReview.status === 'completed' && (
                  <div className="flex items-center space-x-2 text-green-600 px-4 py-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">已完成</span>
                  </div>
                )}
                {currentReview.status === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600 px-4 py-2 bg-red-100 rounded-full">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">失败</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleReanalyze(currentReview)} className="border-gray-300 hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新分析
                </Button>
                {currentReview.status === 'completed' && (
                  <Button variant="outline" size="sm" onClick={() => handleCopyReview(currentReview)} className="border-gray-300 hover:bg-gray-50">
                    <Copy className="h-4 w-4 mr-2" />
                    复制报告
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCurrentReview}
                  className="border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {currentReview.status === 'error' && (
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">分析失败</h4>
                    <p className="text-red-700">{currentReview.error}</p>
                  </div>
                </div>
              </div>
            )}

            {currentReview.status === 'analyzing' && (
              <div className="p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">AI正在分析您的需求...</p>
                <p className="text-sm text-gray-500 mt-2">分析维度：完整性、一致性、清晰度、可测试性、安全性、性能</p>
              </div>
            )}

            {currentReview.status === 'completed' && (
              <div className="space-y-6">
                {/* 需求标题和元信息 */}
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{currentReview.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{currentReview.creator}</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{currentReview.timestamp}</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs">
                        {currentReview.inputMethod === 'text' ? '文本输入' : currentReview.inputMethod === 'requirement' ? '需求池' : '文档上传'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 评分卡片 */}
                <div className="p-8 bg-primary-50 rounded-2xl border border-primary-100">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-3 font-medium">需求文档质量评分</div>
                    <div className={`text-6xl font-bold ${getScoreColor(currentReview.review.overallScore)} bg-gradient-to-br bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600`}>
                      {currentReview.review.overallScore || 0}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 font-medium">满分 100 分</div>
                    {(!currentReview.review.issues || currentReview.review.issues.length === 0) && (
                      <div className="mt-4 px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl text-green-800 font-semibold inline-flex items-center shadow-sm">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        需求质量优秀 - 未发现问题
                      </div>
                    )}
                  </div>
                </div>

                {currentReview.review.issues && currentReview.review.issues.length > 0 && (
                  <ReviewTable
                    issues={currentReview.review.issues}
                    onIssueUpdate={handleIssueUpdate}
                    onIssueViewDetail={handleViewIssueDetail}
                  />
                )}

                <div>
                  <h3 className="font-semibold mb-3 flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>原始需求</span>
                    {currentReview.fileName && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {currentReview.inputMethod === 'document' ? '文档上传' : currentReview.inputMethod === 'requirement' ? '需求池' : '文本输入'}
                      </Badge>
                    )}
                  </h3>
                  {renderDocumentCard()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <IssueDetailDialog
        issue={selectedIssue}
        open={showIssueDialog}
        onClose={() => setShowIssueDialog(false)}
        onSave={handleIssueUpdate}
      />
    </div>
  )
}

export default AIRequirementsEngine

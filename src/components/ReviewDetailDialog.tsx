/**
 * 评审详情弹窗组件
 * 展示单个评审记录的完整详情
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ReviewTable } from '@/components/ReviewTable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ReviewResult } from '@/types/review-types'
import { X, Copy, FileText, Calendar, User, Clock, TrendingUp, Maximize2, Download, Minimize2, FileDown } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ReviewDetailDialogProps {
  review: ReviewResult | null
  open: boolean
  onClose: () => void
}

export const ReviewDetailDialog = ({ review, open, onClose }: ReviewDetailDialogProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (!review) return null

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  // 格式化时间
  const formatFullTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 导出评审报告为 HTML 文件
  const handleExportReport = () => {
    console.log('[Export] =========================================')
    console.log('[Export] Starting export process...')

    // 数据验证
    if (!review) {
      console.error('[Export] Review is null or undefined')
      alert('评审数据为空，无法导出报告')
      return
    }

    if (!review.review) {
      console.error('[Export] Review.review is null or undefined')
      alert('评审结果数据为空，无法导出报告')
      return
    }

    console.log('[Export] Review data validated successfully')
    console.log('[Export] Review status:', review.status)

    try {
      console.log('[Export] Step 1: Generating stats...')
      const issues = Array.isArray(review.review.issues) ? review.review.issues : []
      console.log('[Export] Issues array validated, length:', issues.length)

      const stats = {
        total: issues.length,
        pending: issues.filter(i => i && i.status === '待处理').length,
        processed: issues.filter(i => i && i.status === '已处理').length,
        ignored: issues.filter(i => i && i.status === '已忽略').length
      }
      console.log('[Export] Stats generated:', stats)

      console.log('[Export] Step 2: Generating issues HTML...')
      const issuesHtml = issues.map((issue, idx) => {
        if (!issue) {
          console.warn(`[Export] Issue ${idx} is null or undefined, skipping`)
          return ''
        }

        const statusColors = {
          '待处理': 'bg-yellow-100 text-yellow-800',
          '已处理': 'bg-green-100 text-green-800',
          '已忽略': 'bg-gray-100 text-gray-800'
        }

        const priorityColors = {
          high: 'bg-red-100 text-red-800',
          medium: 'bg-orange-100 text-orange-800',
          low: 'bg-blue-100 text-blue-800'
        }

        const categoryColors = {
          '完整性': '#ef4444',
          '一致性': '#f97316',
          '清晰性': '#eab308',
          '可测试性': '#22c55e',
          '安全性': '#8b5cf6',
          '性能/体验': '#ec4899'
        }

        const priority = issue.priority || 'low'
        const status = issue.status || 'pending'
        const category = issue.category || '其他'

        return `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #fafafa;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">#${idx + 1}</span>
              <span style="background-color: ${categoryColors[category] || '#6b7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${category}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>问题描述：</strong>
              <div style="color: #374151; margin-top: 4px;">${issue.issue_desc || '无描述'}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>修改建议：</strong>
              <div style="color: #374151; margin-top: 4px;">${issue.suggestion || '无建议'}</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px;">
              <div>
                <span style="font-size: 12px; color: #6b7280;">优先级</span>
                <div style="background-color: ${(priorityColors[priority] || 'bg-gray-100 text-gray-800').split(' ')[0]}; color: ${(priorityColors[priority] || 'bg-gray-100 text-gray-800').split(' ')[1]}; padding: 4px 8px; border-radius: 4px; display: inline-block; font-size: 12px;">
                  ${priority === 'high' ? '高' : priority === 'medium' ? '中' : priority === 'low' ? '低' : priority}
                </div>
              </div>
              <div>
                <span style="font-size: 12px; color: #6b7280;">置信度</span>
                <div style="color: #374151; font-weight: 500;">${issue.confidence ? Math.round(issue.confidence * 100) + '%' : 'N/A'}</div>
              </div>
              <div>
                <span style="font-size: 12px; color: #6b7280;">状态</span>
                <div style="background-color: ${(statusColors[status] || 'bg-gray-100 text-gray-800').split(' ')[0]}; color: ${(statusColors[status] || 'bg-gray-100 text-gray-800').split(' ')[1]}; padding: 4px 8px; border-radius: 4px; display: inline-block; font-size: 12px;">
                  ${status}
                </div>
              </div>
            </div>
            ${issue.evidence ? `
              <div style="margin-bottom: 8px;">
                <strong>引用原文：</strong>
                <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 4px; font-style: italic; color: #6b7280;">
                  ${issue.evidence}
                </div>
              </div>
            ` : ''}
            ${issue.note ? `
              <div>
                <strong>备注：</strong>
                <div style="background-color: #fef3c7; padding: 8px; border-radius: 4px; margin-top: 4px; color: #92400e;">
                  ${issue.note}
                </div>
              </div>
            ` : ''}
          </div>
        `
      }).join('')
      console.log('[Export] Issues HTML generated, length:', issuesHtml.length)

      console.log('[Export] Step 3: Generating full HTML content...')
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI需求评审报告 - ${review.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header h1 {
      color: #1e40af;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      color: #6b7280;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #1f2937;
      border-left: 4px solid #3b82f6;
      padding-left: 12px;
      margin-bottom: 16px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 12px;
      background-color: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .info-value {
      font-weight: 500;
      color: #1f2937;
    }
    .score-card {
      text-align: center;
      padding: 24px;
      background: linear-gradient(135deg, #dbeafe 0%, #f3e8ff 100%);
      border-radius: 12px;
      margin-bottom: 30px;
      border: 2px solid #3b82f6;
    }
    .score-value {
      font-size: 48px;
      font-weight: bold;
      margin: 0;
      color: ${review.review.overallScore >= 80 ? '#16a34a' : review.review.overallScore >= 60 ? '#ca8a04' : '#dc2626'};
    }
    .score-label {
      color: #6b7280;
      margin: 8px 0 4px 0;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-item {
      text-align: center;
      padding: 16px;
      background-color: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin: 4px 0 0 0;
    }
    .requirement-content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 400px;
      overflow-y: auto;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    @media print {
      body { background-color: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI 需求评审报告</h1>
      <p>基于资深 IT 需求分析师标准的专家分析</p>
    </div>

    <div class="section">
      <h2>📋 基本信息</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">需求标题</div>
          <div class="info-value">${review.title}</div>
        </div>
        <div class="info-item">
          <div class="info-label">评审 ID</div>
          <div class="info-value">${review.id}</div>
        </div>
        <div class="info-item">
          <div class="info-label">创建人</div>
          <div class="info-value">${review.creator}</div>
        </div>
        <div class="info-item">
          <div class="info-label">创建时间</div>
          <div class="info-value">${formatFullTime(review.timestamp)}</div>
        </div>
        ${review.completedAt ? `
        <div class="info-item">
          <div class="info-label">完成时间</div>
          <div class="info-value">${formatFullTime(review.completedAt)}</div>
        </div>
        ` : ''}
        ${review.fileName ? `
        <div class="info-item">
          <div class="info-label">来源文档</div>
          <div class="info-value">${review.fileName}</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${review.status === 'completed' ? `
      <div class="section">
        <h2>📊 总体评分</h2>
        <div class="score-card">
          <div class="score-label">需求文档质量评分</div>
          <div class="score-value">${review.review.overallScore}</div>
          <div style="color: #6b7280; font-size: 14px;">满分 100 分</div>
          ${review.review.issues.length === 0 ? '<div style="margin-top: 12px; color: #16a34a; font-weight: 500;">✨ 需求文档质量优秀</div>' : ''}
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value" style="color: #1f2937;">${stats.total}</div>
            <div class="stat-label">问题总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #f97316;">${stats.pending}</div>
            <div class="stat-label">待处理</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #16a34a;">${stats.processed}</div>
            <div class="stat-label">已处理</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #6b7280;">${stats.ignored}</div>
            <div class="stat-label">已忽略</div>
          </div>
        </div>
      </div>

      ${review.review.issues.length > 0 ? `
        <div class="section">
          <h2>⚠️ 问题详情（共 ${review.review.issues.length} 个）</h2>
          ${issuesHtml}
        </div>
      ` : ''}
    ` : `
      <div class="section">
        <div style="text-align: center; padding: 40px; background-color: ${review.status === 'error' ? '#fef2f2' : '#dbeafe'}; border-radius: 8px; border: 2px solid ${review.status === 'error' ? '#fecaca' : '#bfdbfe'};">
          <div style="font-size: 48px; margin-bottom: 16px;">
            ${review.status === 'error' ? '❌' : '⏳'}
          </div>
          <div style="font-size: 20px; font-weight: bold; color: ${review.status === 'error' ? '#dc2626' : '#2563eb'}; margin-bottom: 8px;">
            ${review.status === 'error' ? '评审失败' : '分析中'}
          </div>
          ${review.error ? `<div style="color: #dc2626; margin-top: 12px;">${review.error}</div>` : ''}
        </div>
      </div>
    `}

    <div class="footer">
      <p>报告生成时间：${new Date().toLocaleString('zh-CN')}</p>
      <p>AI 需求评审系统 © 2024</p>
    </div>
  </div>
</body>
</html>
      `

      // 创建并下载文件
      console.log('[Export] Step 4: Creating blob...')
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      console.log('[Export] Blob created:', blob.size, 'bytes')

      console.log('[Export] Step 5: Creating download link...')
      const url = URL.createObjectURL(blob)
      console.log('[Export] Object URL created:', url)

      const link = document.createElement('a')
      link.href = url
      link.download = `AI需求评审报告_${review.title}_${new Date().toISOString().slice(0, 10)}.html`
      console.log('[Export] Link created with filename:', link.download)

      console.log('[Export] Step 6: Triggering download...')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('[Export] Report exported successfully')
      alert('报告导出成功！')
    } catch (error) {
      console.error('[Export] Failed to export report:', error)
      console.error('[Export] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      alert(`导出报告失败：${error instanceof Error ? error.message : '未知错误'}，请重试`)
    }
  }

  // 导出评审报告为 Word 文档
  const handleExportWord = async () => {
    console.log('[Export Word] =========================================')
    console.log('[Export Word] Starting Word export process...')

    try {
      if (!review || !review.review) {
        alert('评审数据为空，无法导出报告')
        return
      }

      const issues = Array.isArray(review.review.issues) ? review.review.issues : []
      
      // 创建文档结构
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // 标题
            new Paragraph({
              text: 'AI 需求评审报告',
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: '基于资深 IT 需求分析师标准的专家分析',
              spacing: { after: 400 },
              alignment: AlignmentType.CENTER,
            }),

            // 基本信息
            new Paragraph({
              text: '📋 基本信息',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),

            new Paragraph({ text: `需求标题：${review.title}` }),
            new Paragraph({ text: `评审 ID：${review.id}` }),
            new Paragraph({ text: `创建人：${review.creator}` }),
            new Paragraph({ text: `创建时间：${formatFullTime(review.timestamp)}` }),
            
            ...(review.completedAt ? [new Paragraph({ text: `完成时间：${formatFullTime(review.completedAt)}` })] : []),
            ...(review.fileName ? [new Paragraph({ text: `来源文档：${review.fileName}` })] : []),
            new Paragraph({ text: '' }),

            // 如果已完成，显示评分和问题
            ...(review.status === 'completed' ? [
              // 总体评分
              new Paragraph({
                text: '📊 总体评分',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `${review.review.overallScore} / 100`,
                    bold: true,
                    size: 48,
                    color: review.review.overallScore >= 80 ? '16a34a' : review.review.overallScore >= 60 ? 'ca8a04' : 'dc2626',
                  }),
                ],
                spacing: { after: 100 },
              }),

              // 统计信息
              new Paragraph({
                children: [
                  new TextRun({
                    text: `问题总数：${issues.length}  |  待处理：${issues.filter(i => i?.status === '待处理').length}  |  已处理：${issues.filter(i => i?.status === '已处理').length}  |  已忽略：${issues.filter(i => i?.status === '已忽略').length}`,
                    size: 24,
                  }),
                ],
                spacing: { after: 200 },
              }),

              // 问题详情
              ...(issues.length > 0 ? [
                new Paragraph({
                  text: `⚠️ 问题详情（共 ${issues.length} 个）`,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 400, after: 200 },
                }),
                ...issues.map((issue, idx) => [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `#${idx + 1} [${issue?.category || '其他'}]`,
                        bold: true,
                        size: 24,
                      }),
                      new TextRun({
                        text: ` [${issue?.priority === 'high' ? '高' : issue?.priority === 'medium' ? '中' : '低'}优先级]`,
                        size: 24,
                      }),
                    ],
                    spacing: { before: 200, after: 100 },
                  }),
                  new Paragraph({ text: `问题描述：${issue?.issue_desc || '无描述'}` }),
                  new Paragraph({ text: `修改建议：${issue?.suggestion || '无建议'}` }),
                  ...(issue?.evidence ? [new Paragraph({ text: `引用原文：${issue.evidence}` })] : []),
                  ...(issue?.note ? [new Paragraph({ text: `备注：${issue.note}` })] : []),
                  new Paragraph({ text: '', spacing: { after: 100 } })
                ]                ).flat(),
              ] : [
                new Paragraph({
                  text: '✨ 需求文档质量优秀',
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 400, after: 200 },
                }),
                new Paragraph({ text: '未发现需要改进的问题，文档符合资深IT需求分析师标准' }),
              ]),

            ] : [
              // 分析中或错误状态
              new Paragraph({
                text: review.status === 'error' ? '❌ 评审失败' : '⏳ 分析中',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
              }),
              ...(review.error ? [new Paragraph({ text: `错误信息：${review.error}` })] : []),
            ]),

            // 页脚
            new Paragraph({ text: '' }),
            new Paragraph({
              text: `报告生成时间：${new Date().toLocaleString('zh-CN')}`,
              spacing: { before: 400 },
              size: 20,
              color: '6b7280',
            }),
            new Paragraph({
              text: 'AI 需求评审系统 © 2024',
              size: 20,
              color: '6b7280',
            }),
          ],
        }],
      })

      // 生成并下载文件
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `AI需求评审报告_${review.title}_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('[Export Word] Word document exported successfully')
      alert('Word 文档导出成功！')
    } catch (error) {
      console.error('[Export Word] Failed to export Word document:', error)
      alert(`导出 Word 文档失败：${error instanceof Error ? error.message : '未知错误'}，请重试`)
    }
  }

  // 导出评审报告为 PDF 文档
  const handleExportPDF = async () => {
    console.log('[Export PDF] =========================================')
    console.log('[Export PDF] Starting PDF export process...')

    try {
      if (!review || !review.review) {
        alert('评审数据为空，无法导出报告')
        return
      }

      // 创建一个隐藏的 HTML 容器用于渲染
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.padding = '20mm'
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif'
      container.style.fontSize = '12px'
      container.style.lineHeight = '1.6'
      container.style.color = '#1f2937'
      container.style.backgroundColor = '#ffffff'
      document.body.appendChild(container)

      const issues = Array.isArray(review.review.issues) ? review.review.issues : []
      const stats = {
        total: issues.length,
        pending: issues.filter(i => i && i.status === '待处理').length,
        processed: issues.filter(i => i && i.status === '已处理').length,
        ignored: issues.filter(i => i && i.status === '已忽略').length
      }

      const categoryColors = {
        '完整性': '#ef4444',
        '一致性': '#f97316',
        '清晰性': '#eab308',
        '可测试性': '#22c55e',
        '安全性': '#8b5cf6',
        '性能/体验': '#ec4899'
      }

      const priorityColors = {
        high: '#dc2626',
        medium: '#f97316',
        low: '#2563eb'
      }

      const statusColors = {
        pending: '#f59e0b',
        processed: '#16a34a',
        ignored: '#6b7280'
      }

      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
          <h1 style="color: #1e40af; margin: 0 0 10px 0; font-size: 28px;">AI 需求评审报告</h1>
          <p style="color: #6b7280; margin: 0;">基于资深 IT 需求分析师标准的专家分析</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-left: 4px solid #3b82f6; padding-left: 12px; margin-bottom: 16px;">📋 基本信息</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div style="padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">需求标题</div>
              <div style="font-weight: 500; color: #1f2937;">${review.title}</div>
            </div>
            <div style="padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">评审 ID</div>
              <div style="font-weight: 500; color: #1f2937;">${review.id}</div>
            </div>
            <div style="padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">创建人</div>
              <div style="font-weight: 500; color: #1f2937;">${review.creator}</div>
            </div>
            <div style="padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">创建时间</div>
              <div style="font-weight: 500; color: #1f2937;">${formatFullTime(review.timestamp)}</div>
            </div>
            ${review.completedAt ? `
            <div style="padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">完成时间</div>
              <div style="font-weight: 500; color: #1f2937;">${formatFullTime(review.completedAt)}</div>
            </div>
            ` : ''}
            ${review.fileName ? `
            <div style="padding: 12px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">来源文档</div>
              <div style="font-weight: 500; color: #1f2937;">${review.fileName}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${review.status === 'completed' ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1f2937; border-left: 4px solid #3b82f6; padding-left: 12px; margin-bottom: 16px;">📊 总体评分</h2>
            <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #dbeafe 0%, #f3e8ff 100%); border-radius: 12px; margin-bottom: 30px; border: 2px solid #3b82f6;">
              <div style="color: #6b7280; margin-bottom: 8px; font-size: 14px;">需求文档质量评分</div>
              <div style="font-size: 48px; font-weight: bold; margin: 0; color: ${review.review.overallScore >= 80 ? '#16a34a' : review.review.overallScore >= 60 ? '#ca8a04' : '#dc2626'};">
                ${review.review.overallScore}
              </div>
              <div style="color: #6b7280; font-size: 14px;">满分 100 分</div>
              ${review.review.issues.length === 0 ? '<div style="margin-top: 12px; color: #16a34a; font-weight: 500;">✨ 需求文档质量优秀</div>' : ''}
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
              <div style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">${stats.total}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">问题总数</div>
              </div>
              <div style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: bold; margin: 0; color: #f97316;">${stats.pending}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">待处理</div>
              </div>
              <div style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: bold; margin: 0; color: #16a34a;">${stats.processed}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">已处理</div>
              </div>
              <div style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: bold; margin: 0; color: #6b7280;">${stats.ignored}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">已忽略</div>
              </div>
            </div>
          </div>

          ${issues.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; border-left: 4px solid #3b82f6; padding-left: 12px; margin-bottom: 16px;">⚠️ 问题详情（共 ${issues.length} 个）</h2>
              ${issues.map((issue, idx) => {
                if (!issue) return ''
                const priority = issue.priority || 'low'
                const status = issue.status || 'pending'
                const category = issue.category || '其他'

                return `
                  <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #fafafa; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                      <span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">#${idx + 1}</span>
                      <span style="background-color: ${categoryColors[category] || '#6b7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${category}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                      <strong>问题描述：</strong>
                      <div style="color: #374151; margin-top: 4px;">${issue.issue_desc || '无描述'}</div>
                    </div>
                    <div style="margin-bottom: 8px;">
                      <strong>修改建议：</strong>
                      <div style="color: #374151; margin-top: 4px;">${issue.suggestion || '无建议'}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px;">
                      <div>
                        <span style="font-size: 12px; color: #6b7280;">优先级</span>
                        <div style="color: ${priorityColors[priority] || '#6b7280'}; font-weight: 500;">
                          ${priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
                        </div>
                      </div>
                      <div>
                        <span style="font-size: 12px; color: #6b7280;">置信度</span>
                        <div style="color: #374151; font-weight: 500;">${issue.confidence ? Math.round(issue.confidence * 100) + '%' : 'N/A'}</div>
                      </div>
                      <div>
                        <span style="font-size: 12px; color: #6b7280;">状态</span>
                        <div style="color: ${statusColors[status] || '#6b7280'}; font-weight: 500;">
                          ${status}
                        </div>
                      </div>
                    </div>
                    ${issue.evidence ? `
                      <div style="margin-bottom: 8px;">
                        <strong>引用原文：</strong>
                        <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 4px; font-style: italic; color: #6b7280;">
                          ${issue.evidence}
                        </div>
                      </div>
                    ` : ''}
                    ${issue.note ? `
                      <div>
                        <strong>备注：</strong>
                        <div style="background-color: #fef3c7; padding: 8px; border-radius: 4px; margin-top: 4px; color: #92400e;">
                          ${issue.note}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `
              }).join('')}
            </div>
          ` : ''}
        ` : `
          <div style="margin-bottom: 30px;">
            <div style="text-align: center; padding: 40px; background-color: ${review.status === 'error' ? '#fef2f2' : '#dbeafe'}; border-radius: 8px; border: 2px solid ${review.status === 'error' ? '#fecaca' : '#bfdbfe'};">
              <div style="font-size: 48px; margin-bottom: 16px;">
                ${review.status === 'error' ? '❌' : '⏳'}
              </div>
              <div style="font-size: 20px; font-weight: bold; color: ${review.status === 'error' ? '#dc2626' : '#2563eb'}; margin-bottom: 8px;">
                ${review.status === 'error' ? '评审失败' : '分析中'}
              </div>
              ${review.error ? `<div style="color: #dc2626; margin-top: 12px;">${review.error}</div>` : ''}
            </div>
          </div>
        `}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">报告生成时间：${new Date().toLocaleString('zh-CN')}</p>
          <p style="margin: 8px 0 0 0;">AI 需求评审系统 © 2024</p>
        </div>
      `

      // 等待内容渲染
      await new Promise(resolve => setTimeout(resolve, 100))

      // 使用 html2canvas 将内容转换为图片
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
      })

      const imgData = canvas.toDataURL('image/png')

      // 创建 PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const maxPageHeight = 297

      if (imgHeight <= maxPageHeight) {
        // 单页
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      } else {
        // 多页
        let heightLeft = imgHeight
        let position = 0

        let page = 0
        while (heightLeft > 0) {
          if (page > 0) {
            pdf.addPage()
          }
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= maxPageHeight
          position -= maxPageHeight
          page++
        }
      }

      // 清理
      document.body.removeChild(container)

      // 保存 PDF
      pdf.save(`AI需求评审报告_${review.title}_${new Date().toISOString().slice(0, 10)}.pdf`)

      console.log('[Export PDF] PDF document exported successfully')
      alert('PDF 文档导出成功！')
    } catch (error) {
      console.error('[Export PDF] Failed to export PDF document:', error)
      console.error('[Export PDF] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      alert(`导出 PDF 文档失败：${error instanceof Error ? error.message : '未知错误'}，请重试`)
      
      // 清理
      const container = document.querySelector('div[style*="position: fixed"][style*="left: -9999px"]')
      if (container) {
        document.body.removeChild(container)
      }
    }
  }

  // 获取状态标签
  const getStatusBadge = () => {
    switch (review.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">已完成</Badge>
      case 'analyzing':
        return <Badge className="bg-blue-100 text-blue-800">分析中</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">失败</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'w-screen h-screen max-w-none max-h-none rounded-none' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
        <DialogHeader>
          <div className="flex items-start justify-between pr-8">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{review.title}</DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>评审ID: {review.id}</span>
                {getStatusBadge()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "退出全屏" : "全屏查看"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-50 border-gray-200">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">创建人:</span>
                  <span className="font-medium">{review.creator}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">创建时间:</span>
                  <span className="font-medium">{formatFullTime(review.timestamp)}</span>
                </div>
                {review.completedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">完成时间:</span>
                    <span className="font-medium">{formatFullTime(review.completedAt)}</span>
                  </div>
                )}
                {review.inputMethod === 'document' && review.fileName && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">来源文档:</span>
                    <span className="font-medium">{review.fileName}</span>
                  </div>
                )}
              </div>
            </Card>

            {review.status === 'completed' && (
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-600">总体评分</span>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(review.review.overallScore)?.split(' ')[0] || 'text-red-600'}`}>
                    {review.review.overallScore}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">/ 100</div>
                  <div className="mt-3 flex justify-center gap-2 text-xs">
                    {review.review.issues.length === 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        需求文档质量优秀
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* 错误信息 */}
          {review.status === 'error' && review.error && (
            <Card className="bg-red-50 border-red-200">
              <div className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="font-semibold">错误信息:</span>
                </div>
                <p className="mt-2 text-sm text-red-600">{review.error}</p>
              </div>
            </Card>
          )}

          {/* 需求内容 */}
          <Card>
            <div className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                需求内容
              </h4>
              <div className="bg-white rounded-lg border border-gray-200 p-5 max-h-[400px] overflow-y-auto">
                {review.htmlContent ? (
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: review.htmlContent
                    }}
                  />
                ) : (
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                    {review.requirement}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 问题列表 */}
          {review.status === 'completed' && review.review.issues.length > 0 && (
            <Card>
              <div className="p-4">
                <h4 className="font-semibold mb-4">问题列表</h4>
                <ReviewTable
                  issues={review.review.issues}
                  onIssueUpdate={() => {}}
                  onIssueViewDetail={() => {}}
                />
              </div>
            </Card>
          )}

          {review.status === 'completed' && review.review.issues.length === 0 && (
            <Card className="bg-green-50 border-green-200">
              <div className="p-8 text-center">
                <div className="text-green-600 font-semibold text-lg mb-2">
                  ✨ 需求文档质量优秀
                </div>
                <p className="text-sm text-gray-600">
                  未发现需要改进的问题，文档符合资深IT需求分析师标准
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
          {review.status === 'completed' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <FileDown className="h-4 w-4 mr-2" />
                  导出报告
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  导出为 HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportWord}>
                  <FileText className="h-4 w-4 mr-2" />
                  导出为 Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  导出为 PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

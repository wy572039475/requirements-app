import {
  UnifiedInputSource,
  ContentLoadResult
} from '../types/unified-input'
import { fetchRequirement } from '../services/requirements-api'
import * as pdfjsLib from 'pdfjs-dist'
import * as mammoth from 'mammoth'

/**
 * 智能内容加载器
 * 统一处理不同输入源的内容获取逻辑
 */
export class SmartContentLoader {
  /**
   * 根据输入源类型获取内容
   */
  async getContent(source: UnifiedInputSource): Promise<ContentLoadResult> {
    console.log('[SmartContentLoader] 开始加载内容，类型:', source.type)

    switch (source.type) {
      case 'text':
        return this.loadTextContent(source)

      case 'document':
        return this.loadDocumentContent(source)

      case 'requirement':
        return this.loadRequirementContent(source)

      default:
        throw new Error(`不支持的输入源类型: ${(source as any).type}`)
    }
  }

  /**
   * 加载文本内容
   */
  private async loadTextContent(source: UnifiedInputSource): Promise<ContentLoadResult> {
    console.log('[SmartContentLoader] 加载文本内容')

    if (!source.content) {
      throw new Error('文本内容不能为空')
    }

    return {
      text: source.content,
      sourceInfo: '文本输入'
    }
  }

  /**
   * 加载文档内容
   */
  private async loadDocumentContent(source: UnifiedInputSource): Promise<ContentLoadResult> {
    console.log('[SmartContentLoader] 加载文档内容:', source.fileName)

    if (!source.fileData) {
      throw new Error('文档数据不能为空')
    }

    const file = this.dataURLToFile(source.fileData, source.fileName || 'document')
    const content = await this.readFileContent(file)

    return {
      text: content.text,
      html: content.html,
      fileName: source.fileName,
      fileData: source.fileData,
      fileSize: source.fileSize,
      sourceInfo: `文档上传 - ${source.fileName}`
    }
  }

  /**
   * 加载需求内容（智能降级策略）
   * 优先级：附件 > 描述 > 错误
   */
  private async loadRequirementContent(source: UnifiedInputSource): Promise<ContentLoadResult> {
    console.log('[SmartContentLoader] 加载需求内容:', source.requirementId)

    if (!source.requirementId) {
      throw new Error('需求ID不能为空')
    }

    try {
      // 获取需求详情
      const response = await fetchRequirement(source.requirementId)
      // 后端返回 { success: true, data: requirement }，需要取出 data 字段
      const requirement = response.data?.data || response.data

      console.log('[SmartContentLoader] 需求详情:', {
        businessId: requirement.businessId,
        title: requirement.title,
        hasAttachments: requirement.attachments?.length > 0,
        hasDescription: !!requirement.description
      })

      // 智能降级策略
      if (requirement.attachments && requirement.attachments.length > 0) {
        // 策略1：优先使用第一个附件
        console.log('[SmartContentLoader] 使用附件内容')
        return await this.loadAttachmentContent(requirement, requirement.attachments[0])
      } else if (requirement.description) {
        // 策略2：无附件时使用需求描述
        console.log('[SmartContentLoader] 使用需求描述')
        return {
          text: requirement.description,
          sourceInfo: `来源需求：${requirement.businessId} - ${requirement.title}`,
          sourceRequirementId: requirement._id
        }
      } else {
        // 策略3：都没有内容
        throw new Error(`需求 ${requirement.businessId} 没有可用内容（无附件且无描述）`)
      }
    } catch (error) {
      console.error('[SmartContentLoader] 加载需求内容失败:', error)
      throw new Error(`加载需求失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 加载附件内容
   */
  private async loadAttachmentContent(
    requirement: any,
    attachment: { filename: string; url: string }
  ): Promise<ContentLoadResult> {
    console.log('[SmartContentLoader] 加载附件:', attachment.filename)

    try {
      // 尝试读取附件内容
      const file = await this.fetchAttachmentFile(attachment.url, attachment.filename)
      const content = await this.readFileContent(file)

      return {
        text: content.text,
        html: content.html,
        fileName: attachment.filename,
        fileData: attachment.url,
        sourceInfo: `来源需求：${requirement.businessId} - ${requirement.title}（附件）`,
        sourceRequirementId: requirement._id
      }
    } catch (error) {
      console.error('[SmartContentLoader] 加载附件失败:', error)
      // 如果附件加载失败，降级到描述
      if (requirement.description) {
        console.log('[SmartContentLoader] 降级到需求描述')
        return {
          text: requirement.description,
          sourceInfo: `来源需求：${requirement.businessId} - ${requirement.title}（附件加载失败，使用描述）`,
          sourceRequirementId: requirement._id
        }
      } else {
        throw new Error(`附件加载失败且需求无描述: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }
  }

  /**
   * 从URL获取附件文件
   * 支持 base64 data URL 和常规 HTTP URL
   */
  private async fetchAttachmentFile(url: string, filename: string): Promise<File> {
    try {
      // 检查是否是 base64 data URL
      if (url.startsWith('data:')) {
        return this.dataURLToFile(url, filename)
      }

      // 否则作为普通 URL 处理
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const blob = await response.blob()
      return new File([blob], filename, { type: blob.type })
    } catch (error) {
      console.error('[SmartContentLoader] 获取附件失败:', error)
      throw new Error(`无法获取附件: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 读取文件内容（支持多种格式）
   */
  private async readFileContent(file: File): Promise<{ text: string; html?: string }> {
    const extension = file.name.split('.').pop()?.toLowerCase()

    console.log('[SmartContentLoader] 读取文件:', file.name, '类型:', extension)

    try {
      if (extension === 'docx' || extension === 'doc') {
        return await this.readWordFile(file)
      } else if (extension === 'pdf') {
        return await this.readPdfFile(file)
      } else if (extension === 'md') {
        return await this.readMarkdownFile(file)
      } else {
        // 默认为文本文件
        return await this.readTextFile(file)
      }
    } catch (error) {
      console.error('[SmartContentLoader] 读取文件失败:', error)
      throw new Error(`读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 读取Word文档
   */
  private async readWordFile(file: File): Promise<{ text: string; html: string }> {
    const arrayBuffer = await file.arrayBuffer()
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
    return { text: result.value, html: result.value }
  }

  /**
   * 读取PDF文档
   */
  private async readPdfFile(file: File): Promise<{ text: string }> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfjs = pdfjsLib.default
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`

    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ')
      fullText += pageText + '\n'
    }

    return { text: fullText }
  }

  /**
   * 读取Markdown文件
   */
  private async readMarkdownFile(file: File): Promise<{ text: string }> {
    return this.readTextFile(file)
  }

  /**
   * 读取文本文件
   */
  private async readTextFile(file: File): Promise<{ text: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text || text.trim().length === 0) {
          reject(new Error('文件为空'))
        } else {
          resolve({ text })
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file, 'utf-8')
    })
  }

  /**
   * 将 Data URL 转换为 File 对象
   */
  private dataURLToFile(dataURL: string, filename: string): File {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'text/plain'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }
}

// 导出单例实例
export const smartContentLoader = new SmartContentLoader()

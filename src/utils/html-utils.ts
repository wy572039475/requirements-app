/**
 * HTML 工具函数
 * 用于处理和显示包含 HTML 的需求描述
 */

/**
 * 检测字符串是否包含 HTML 内容
 */
export function isHtmlContent(content: string | undefined | null): boolean {
  if (!content) return false
  return content.includes('<') && content.includes('>')
}

/**
 * 去除 HTML 标签，只保留文本内容
 * 用于在卡片、列表等简短显示场景
 */
export function stripHtmlTags(html: string | undefined | null): string {
  if (!html) return ''
  
  // 创建临时元素来解析 HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  
  // 获取文本内容
  const text = tmp.textContent || tmp.innerText || ''
  
  // 清理多余的空白字符
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 获取描述的纯文本预览（限制长度）
 * @param content 描述内容
 * @param maxLength 最大长度，默认 100
 */
export function getDescriptionPreview(content: string | undefined | null, maxLength: number = 100): string {
  if (!content) return ''
  
  // 如果是 HTML，先去除标签
  const text = isHtmlContent(content) ? stripHtmlTags(content) : content
  
  // 截断
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 用于 dangerouslySetInnerHTML 的安全样式类
 * 包含图片、表格等元素的样式
 */
export const htmlContentStyles = "text-gray-700 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:my-2 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-1"

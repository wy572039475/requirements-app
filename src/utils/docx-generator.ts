import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, AlignmentType, HeadingLevel, ImageRun, PageBreak, ShadingType } from 'docx'

export const generateDocxFromPRD = (content: string) => {
  const children: any[] = []

  let currentSection: any[] = []
  let inTable = false
  let tableRows: TableRow[] = []
  let tableHeaders: string[] = []
  let isFirstSection = true

  const flushSection = () => {
    if (currentSection.length > 0) {
      children.push(...currentSection)
      currentSection = []
    }
  }

  const flushTable = () => {
    if (inTable) {
      inTable = false
      if (tableRows.length > 0) {
        pushTableToChildren(tableHeaders, tableRows, children)
      }
      tableRows = []
      tableHeaders = []
    }
  }

  const createCellBorders = (color: string = 'D1D5DB') => ({
    top: { style: 'single', size: 4, color },
    bottom: { style: 'single', size: 4, color },
    left: { style: 'single', size: 4, color },
    right: { style: 'single', size: 4, color }
  })

  const pushTableToChildren = (headers: string[], rows: TableRow[], target: any[]) => {
    const isTwoColTable = headers.length === 2
    const headerFillColor = isTwoColTable ? 'EFF6FF' : '1E40AF'
    const headerTextColor = isTwoColTable ? '1E40AF' : 'FFFFFF'
    const headerBorderColor = isTwoColTable ? 'BFDBFE' : '1E40AF'

    target.push(
      new Table({
        width: {
          size: 100,
          type: 'pct'
        },
        rows: [
          new TableRow({
            children: headers.map(header =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: header,
                        bold: true,
                        size: 21,
                        font: '微软雅黑',
                        color: headerTextColor
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: {
                      line: 360,
                      after: 60,
                      before: 60
                    }
                  })
                ],
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 140,
                  right: 140
                },
                shading: {
                  fill: headerFillColor,
                  type: ShadingType.CLEAR
                },
                borders: createCellBorders(headerBorderColor),
                verticalAlign: 'center'
              })
            )
          }),
          ...rows
        ],
        margins: {
          top: 200,
          bottom: 200
        }
      })
    )
  }

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()

    // 移除特殊符号（如波浪线）
    line = line.replace(/~+/g, '')

    if (!line) continue

    // 处理图片 - 正确处理base64图片
    if (line.includes('![') && line.includes('](') && line.includes(')')) {
      flushSection()
      flushTable()

      // 匹配图片Markdown
      const match = line.match(/!\[(.*?)\]\((data:image\/[^)]+)\)/)
      if (match) {
        const alt = match[1]
        const src = match[2]

        try {
          // 验证图片数据格式
          if (!src.startsWith('data:image/')) {
            throw new Error('Invalid image format: must start with data:image/')
          }

          // 提取base64数据
          const base64Parts = src.split(',')
          if (base64Parts.length < 2) {
            throw new Error('Invalid base64 format: missing comma separator')
          }

          const base64Data = base64Parts[1]
          if (!base64Data || base64Data.length < 100) {
            throw new Error('Invalid base64 data: too short')
          }

          // 验证base64数据格式
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
          if (!base64Regex.test(base64Data)) {
            throw new Error('Invalid base64 data: contains invalid characters')
          }

          // 将base64转换为Buffer
          const buffer = Buffer.from(base64Data, 'base64')

          // 验证图片大小 (最大 5MB)
          if (buffer.length > 5 * 1024 * 1024) {
            throw new Error('Image too large: maximum size is 5MB')
          }

          // 创建图片运行对象 - 使用正确的类型定义
          const imageRun = new ImageRun({
            data: buffer,
            transformation: {
              width: 500,
              height: 300,
            }
          } as any)

          // 添加图片到段落
          children.push(
            new Paragraph({
              children: [imageRun],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            })
          )
        } catch (error) {
          console.error('Error adding image to Word document:', error)
          // 如果处理失败，添加占位符
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[图片: ${alt}]`,
                  italics: true,
                  size: 20
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            })
          )
        }

        continue
      }
    }

    // 处理自定义Markdown标题格式（**标题**）
    if (line.startsWith('**') && line.endsWith('**')) {
      flushSection()
      flushTable()
      const titleText = line.replace(/^\*\*(.*)\*\*$/, '$1')

      let headingLevel: any
      let spacingBefore: number
      let spacingAfter: number
      let fontSize: number
      let fontColor: string = '1F2937'
      let showBorder = false

      if (/^[一二三四五六七八九十]、/.test(titleText) || /^[一二三四五六七八九十]\d*、/.test(titleText)) {
        headingLevel = HeadingLevel.HEADING_1
        spacingBefore = isFirstSection ? 200 : 480
        spacingAfter = 240
        fontSize = 28
        fontColor = '1E3A5F'
        showBorder = true
        isFirstSection = false
      } else if (/^\d+\.\d+\./.test(titleText)) {
        headingLevel = HeadingLevel.HEADING_3
        spacingBefore = 240
        spacingAfter = 120
        fontSize = 22
        fontColor = '374151'
      } else if (/^\d+\./.test(titleText)) {
        headingLevel = HeadingLevel.HEADING_2
        spacingBefore = 320
        spacingAfter = 160
        fontSize = 24
        fontColor = '1F2937'
      } else {
        headingLevel = HeadingLevel.HEADING_2
        spacingBefore = 320
        spacingAfter = 160
        fontSize = 24
      }

      const paragraphOptions: any = {
        children: [
          new TextRun({
            text: titleText,
            bold: true,
            size: fontSize,
            font: '微软雅黑',
            color: fontColor
          })
        ],
        heading: headingLevel,
        spacing: { before: spacingBefore, after: spacingAfter }
      }

      if (showBorder) {
        paragraphOptions.border = {
          bottom: {
            color: '3B82F6',
            space: 4,
            style: 'single',
            size: 6
          }
        }
      }

      children.push(new Paragraph(paragraphOptions))
      continue
    }

    // 处理标准Markdown标题格式
    if (line.startsWith('# ')) {
      flushSection()
      flushTable()
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(2),
              bold: true,
              size: 36,
              font: '微软雅黑',
              color: '1E3A5F'
            })
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 400 }
        })
      )
      // 添加标题下的蓝色装饰线
      children.push(
        new Paragraph({
          border: {
            bottom: {
              color: '3B82F6',
              space: 4,
              style: 'single',
              size: 12
            }
          },
          spacing: { after: 400 }
        })
      )
      continue
    }

    if (line.startsWith('## ')) {
      flushSection()
      flushTable()
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(3),
              bold: true,
              size: 28,
              font: '微软雅黑',
              color: '1E3A5F'
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
          border: {
            bottom: {
              color: '3B82F6',
              space: 4,
              style: 'single',
              size: 6
            }
          }
        })
      )
      continue
    }

    if (line.startsWith('### ')) {
      flushSection()
      flushTable()
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(4),
              bold: true,
              size: 24,
              font: '微软雅黑',
              color: '374151'
            })
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 320, after: 160 }
        })
      )
      continue
    }

    // 处理表格分隔行 (|---|---|)，仅作为表头和数据的分界
    if (line.includes('|') && /^[\s|:-]+$/.test(line)) {
      // 如果之前还在收集表头还没进入数据模式，标记表头已读完
      if (inTable && tableHeaders.length > 0 && tableRows.length === 0) {
        // 分隔行仅作为标志，不产出内容
      }
      continue
    }

    // 处理表格行
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true
        tableHeaders = line.split('|').map(header => header.trim()).filter(Boolean)
        continue
      }

      const cells = line.split('|').map(cell => cell.trim()).filter(Boolean)

      // 列数不匹配时，说明这是新表格的表头行，先结束当前表格
      if (cells.length !== tableHeaders.length) {
        // 先输出当前表格
        if (tableRows.length > 0) {
          pushTableToChildren(tableHeaders, tableRows, children)
        }
        // 重置，当前行作为新表格的表头
        tableHeaders = cells
        tableRows = []
        continue
      }

      const tableCells = cells.map((cell, cellIndex) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell,
                  size: 21,
                  font: '微软雅黑',
                  color: '374151'
                })
              ],
              alignment: tableHeaders.length === 2 && cellIndex === 0
                ? AlignmentType.LEFT
                : AlignmentType.CENTER,
              spacing: {
                line: 340,
                after: 60,
                before: 60
              }
            })
          ],
          margins: {
            top: 80,
            bottom: 80,
            left: 140,
            right: 140
          },
          shading: {
            fill: tableRows.length % 2 === 0 ? 'F9FAFB' : 'FFFFFF',
            type: ShadingType.CLEAR
          },
          borders: createCellBorders(),
          verticalAlign: 'center'
        })
      )

      tableRows.push(new TableRow({
        children: tableCells
      }))
      continue
    }

    // 非表格行，结束当前表格
    if (inTable) {
      inTable = false
      if (tableRows.length > 0) {
        pushTableToChildren(tableHeaders, tableRows, children)
      }
      tableRows = []
      tableHeaders = []
    }

    // 处理列表项
    if (line.startsWith('- ')) {
      currentSection.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '\u2022 ',
              size: 22,
              font: '\u5fae\u8f6f\u96c5\u9ed1',
              color: '3B82F6'
            }),
            new TextRun({
              text: line.substring(2),
              size: 21,
              font: '\u5fae\u8f6f\u96c5\u9ed1',
              color: '374151'
            })
          ],
          spacing: { before: 80, after: 80 },
          indent: {
            left: 420,
            hanging: 210
          }
        })
      )
      continue
    }

    // 处理普通段落
    currentSection.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 21,
            font: '\u5fae\u8f6f\u96c5\u9ed1',
            color: '374151'
          })
        ],
        spacing: { before: 120, after: 120, line: 360 }
      })
    )
  }

  flushSection()
  flushTable()

  // 创建文档实例并返回
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            },
            size: {
              width: 11906,
              height: 16838
            }
          }
        },
        children: children
      }
    ]
  })
}

export const downloadDocx = async (content: string, filename: string) => {
  try {
    console.log('Starting Word document generation...')

    console.log('Generating document with images...')
    const doc = generateDocxFromPRD(content)

    console.log('Document generated, converting to Blob...')
    const blob = await Packer.toBlob(doc)

    console.log('Blob created, initiating download...')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.docx`
    document.body.appendChild(link)
    link.click()

    // 延迟移除链接，确保下载完成
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('Download completed successfully')
    }, 100)

  } catch (error) {
    console.error('Error generating Word document:', error)
    // 输出更详细的错误信息
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

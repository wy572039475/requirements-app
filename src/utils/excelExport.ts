import * as XLSX from 'xlsx'

interface Feature {
  id: string
  name: string
  description: string
  kanoModel: string
  priority: string
  businessRules: string
}

/**
 * 导出功能清单为Excel文件
 * @param features 功能列表
 */
export const exportFeaturesToExcel = (features: Feature[]) => {
  console.log('=== 开始导出Excel ===')
  console.log('功能数量:', features.length)
  
  if (features.length === 0) {
    throw new Error('暂无功能清单可导出')
  }

  try {
    // 准备表头
    const headers = [
      '序号',
      '功能点',
      '功能描述',
      'KANO模型',
      '优先级',
      '业务规则'
    ]
    console.log('表头:', headers)
    
    // 准备数据行
    const rows = features.map((feature, index) => {
      const rowData = [
        index + 1,
        feature.name || '',
        feature.description || '',
        feature.kanoModel || '',
        feature.priority || '',
        feature.businessRules || ''
      ]
      console.log(`第${index + 1}行数据:`, rowData)
      return rowData
    })
    console.log('数据行数:', rows.length)
    
    // 组合数据（表头 + 数据行）
    const data = [headers, ...rows]
    console.log('完整数据数组长度:', data.length)
    console.log('完整数据前3行:', data.slice(0, 3))
    
    // 创建工作表（使用aoa_to_sheet方法）
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    console.log('工作表创建成功:', worksheet)
    
    // 设置列宽（更合理的宽度设置）
    const colWidths = [
      { wch: 8 },   // 序号
      { wch: 20 },  // 功能点
      { wch: 60 },  // 功能描述
      { wch: 16 },  // KANO模型
      { wch: 12 },  // 优先级
      { wch: 50 }   // 业务规则
    ]
    worksheet['!cols'] = colWidths
    console.log('列宽设置完成:', colWidths)
    
    // 获取工作表范围
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    console.log('数据范围:', range)
    
    // 设置表头样式（加粗）
    for (let C = 0; C < headers.length; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: C })
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          font: { bold: true }
        }
      }
    }
    console.log('表头样式设置完成')
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    console.log('工作簿创建成功:', workbook)
    
    // 添加工作表
    XLSX.utils.book_append_sheet(workbook, worksheet, '功能清单')
    console.log('工作表添加成功')
    
    // 生成文件名
    const fileName = `功能清单_${new Date().toLocaleDateString('zh-CN')}.xlsx`
    console.log('文件名:', fileName)
    
    // 写入文件
    console.log('开始写入Excel文件...')
    XLSX.writeFile(workbook, fileName)
    console.log('=== Excel导出成功 ===')
    
    return fileName
  } catch (error) {
    console.error('Excel导出失败:', error)
    throw error
  }
}

/**
 * 导出功能清单为Excel文件并下载
 * @param features 功能列表
 */
export const downloadFeaturesAsExcel = (features: Feature[]) => {
  try {
    console.log('调用downloadFeaturesAsExcel')
    const fileName = exportFeaturesToExcel(features)
    console.log('Excel文件导出成功:', fileName)
    
    // 显示成功提示
    alert(`✅ Excel文件导出成功！\n\n文件名: ${fileName}\n\n请在浏览器的下载记录中查找文件`)
  } catch (error) {
    console.error('Excel文件导出失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    alert(`❌ Excel导出失败！\n\n错误信息: ${errorMessage}\n\n建议：\n1. 使用CSV导出功能（已验证可用）\n2. 刷新页面后重试\n3. 检查浏览器控制台错误`)
    throw error
  }
}

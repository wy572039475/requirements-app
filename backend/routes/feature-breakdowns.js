import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { authenticateToken } from '../middleware/auth.js'
import FeatureBreakdown from '../models/FeatureBreakdown.js'

const router = express.Router()

// multer 配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const breakdownUploadDir = path.join(UPLOAD_DIR, 'breakdowns')
if (!fs.existsSync(breakdownUploadDir)) {
  fs.mkdirSync(breakdownUploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, breakdownUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = crypto.randomBytes(16).toString('hex')
    cb(null, `${name}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.txt', '.docx', '.doc', '.pdf', '.md']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式，仅支持 txt/docx/doc/pdf/md'))
    }
  }
})

/**
 * 获取归档列表
 * GET /api/feature-breakdowns
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query
    const skip = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const query = {
      user: req.user._id,
      status: 'archived'
    }

    if (keyword) {
      query.title = { $regex: keyword, $options: 'i' }
    }

    const [list, total] = await Promise.all([
      FeatureBreakdown.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FeatureBreakdown.countDocuments(query)
    ])

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: limit }
    })
  } catch (error) {
    console.error('[FeatureBreakdown] 获取归档列表错误:', error)
    res.status(500).json({
      success: false,
      message: '获取归档列表失败',
      error: error.message
    })
  }
})

/**
 * 获取统计信息（必须在 /:id 之前定义）
 * GET /api/feature-breakdowns/stats/summary
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default
    const stats = await FeatureBreakdown.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user._id), status: 'archived' } },
      {
        $group: {
          _id: null,
          totalArchives: { $sum: 1 },
          totalFeatures: { $sum: '$featureCount' }
        }
      }
    ])

    res.json({
      success: true,
      data: stats[0] || { totalArchives: 0, totalFeatures: 0 }
    })
  } catch (error) {
    console.error('[FeatureBreakdown] 获取统计错误:', error)
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error.message
    })
  }
})

/**
 * 上传源文件（用于归档时保存原始文档）
 * POST /api/feature-breakdowns/upload-source
 */
router.post('/upload-source', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' })
    }

    res.json({
      success: true,
      data: {
        filePath: `breakdowns/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: path.extname(req.file.originalname).replace('.', ''),
        fileSize: req.file.size
      }
    })
  } catch (error) {
    console.error('[FeatureBreakdown] 上传源文件错误:', error)
    res.status(500).json({ success: false, message: '文件上传失败', error: error.message })
  }
})

/**
 * 下载归档的源文件
 * GET /api/feature-breakdowns/:id/download-source
 */
router.get('/:id/download-source', authenticateToken, async (req, res) => {
  try {
    const record = await FeatureBreakdown.findOne({
      _id: req.params.id,
      user: req.user._id
    })

    if (!record) {
      return res.status(404).json({ success: false, message: '归档记录不存在' })
    }

    if (!record.sourceFilePath) {
      return res.status(404).json({ success: false, message: '该归档记录没有关联的源文件' })
    }

    const filePath = path.join(UPLOAD_DIR, record.sourceFilePath)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '源文件已丢失' })
    }

    const encodedName = encodeURIComponent(record.sourceFileName || '源文件')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`)
    res.download(filePath, record.sourceFileName)
  } catch (error) {
    console.error('[FeatureBreakdown] 下载源文件错误:', error)
    res.status(500).json({ success: false, message: '文件下载失败', error: error.message })
  }
})

/**
 * 获取归档详情
 * GET /api/feature-breakdowns/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await FeatureBreakdown.findOne({
      _id: req.params.id,
      user: req.user._id
    })

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '归档记录不存在'
      })
    }

    res.json({ success: true, data: record })
  } catch (error) {
    console.error('[FeatureBreakdown] 获取归档详情错误:', error)
    res.status(500).json({
      success: false,
      message: '获取归档详情失败',
      error: error.message
    })
  }
})

/**
 * 保存归档
 * POST /api/feature-breakdowns
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      sourceType,
      sourceContent,
      sourceFileName,
      sourceFileType,
      sourceRequirementId,
      sourceRequirementTitle,
      features,
      projectId
    } = req.body

    if (!title || !sourceType) {
      return res.status(400).json({
        success: false,
        message: '标题和来源类型为必填项'
      })
    }

    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        success: false,
        message: '功能清单不能为空'
      })
    }

    const record = new FeatureBreakdown({
      user: req.user._id,
      project: projectId || null,
      title,
      sourceType,
      sourceContent: sourceContent ? sourceContent.substring(0, 5000) : '',
      sourceFileName,
      sourceFileType,
      sourceFilePath: req.body.sourceFilePath || '',
      sourceRequirementId,
      sourceRequirementTitle,
      features,
      featureCount: features.length,
      status: 'archived'
    })

    await record.save()

    res.json({
      success: true,
      message: '归档保存成功',
      data: record
    })
  } catch (error) {
    console.error('[FeatureBreakdown] 保存归档错误:', error)
    res.status(500).json({
      success: false,
      message: '保存归档失败',
      error: error.message
    })
  }
})

/**
 * 更新归档标题
 * PUT /api/feature-breakdowns/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body
    const record = await FeatureBreakdown.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title },
      { new: true }
    )

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '归档记录不存在'
      })
    }

    res.json({ success: true, message: '更新成功', data: record })
  } catch (error) {
    console.error('[FeatureBreakdown] 更新归档错误:', error)
    res.status(500).json({
      success: false,
      message: '更新归档失败',
      error: error.message
    })
  }
})

/**
 * 删除归档
 * DELETE /api/feature-breakdowns/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await FeatureBreakdown.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    })

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '归档记录不存在'
      })
    }

    res.json({ success: true, message: '归档记录已删除' })
  } catch (error) {
    console.error('[FeatureBreakdown] 删除归档错误:', error)
    res.status(500).json({
      success: false,
      message: '删除归档失败',
      error: error.message
    })
  }
})

export default router

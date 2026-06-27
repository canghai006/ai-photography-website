import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import sharp from 'sharp'
import express from 'express'
import multer from 'multer'
import { createDatabase } from './database.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const envPath = path.join(rootDir, '.env.local')

async function loadEnvFile() {
  try {
    const raw = await fs.readFile(envPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const index = trimmed.indexOf('=')
      if (index === -1) continue
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim()
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // env file is optional in repo; runtime values can come from shell env
  }
}

await loadEnvFile()

const app = express()
const port = Number(process.env.PORT || 8787)
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(rootDir, 'storage')
const uploadDir = path.join(storageDir, 'uploads')
const analysesPath = path.join(storageDir, 'analyses.json')
const dbPath = path.join(storageDir, 'app.db')
const distDir = path.join(rootDir, 'dist')

await fs.mkdir(storageDir, { recursive: true })
await fs.mkdir(uploadDir, { recursive: true })
const database = createDatabase({ dbPath, legacyAnalysesPath: analysesPath })
await database.migrateLegacyAnalyses()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
})

app.use(express.json({ limit: '4mb' }))

app.get('/api/health', (_req, res) => {
  return res.json({ ok: true })
})

function buildMockAnalysis(imageUrl) {
  return {
    overallScore: 86,
    tags: ['电影感', '低饱和', '冷色调', '孤独感'],
    imageUrl,
    scores: {
      构图: 88,
      光影: 82,
      色彩: 90,
      情绪: 85,
      后期空间: 80,
    },
    sections: {
      作品亮点: '画面拥有明确主体和干净留白，视觉中心集中，观看节奏平稳。',
      构图分析: '主体落位较克制，边缘控制比较整洁，整体结构稳定且有呼吸感。',
      光影分析: '明暗过渡自然，阴影区域保留细节，画面空间感较完整。',
      色彩分析: '冷色调和低饱和方向统一，局部亮部能够形成轻微视觉锚点。',
      情绪表达: '影像情绪偏安静、疏离、克制，具有明显的个人作者气质。',
      改进建议: '建议适度压低局部高光，并收紧少量边缘信息，让主体更集中。',
    },
    source: 'mock',
  }
}

async function callArkVision({ base64DataUrl }) {
  const apiKey = process.env.ARK_API_KEY
  const model = process.env.ARK_MODEL
  const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'

  if (!apiKey || !model) {
    throw new Error('ARK_API_KEY or ARK_MODEL is missing')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是一名专业摄影评论人。请用中文返回严格 JSON，不要 markdown，不要额外说明。字段必须包含 overallScore(number), tags(string[]), scores(object: 构图/光影/色彩/情绪/后期空间), sections(object: 作品亮点/构图分析/光影分析/色彩分析/情绪表达/改进建议)。分数范围 0-100。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张摄影作品，输出可直接展示在网站中的专业摄影点评结果。' },
            { type: 'image_url', image_url: { url: base64DataUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ark request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Ark response missing message content')
  }

  return JSON.parse(content)
}

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' })
    }

    const filePath = req.file.path
    const fileBuffer = await fs.readFile(filePath)
    const mimeType = req.file.mimetype || 'image/jpeg'
    const storedFilename = path.basename(filePath)
    const imageUrl = `/uploads/${storedFilename}`
    
    // Ark API 限制最大 3600 万像素，压缩超大图片
    const MAX_PIXELS = 34000000
    const meta = await sharp(fileBuffer).metadata()
    const totalPixels = (meta.width || 0) * (meta.height || 0)
    let apiBuffer = fileBuffer
    if (totalPixels > MAX_PIXELS) {
      const scale = Math.sqrt(MAX_PIXELS / totalPixels)
      const newWidth = Math.round((meta.width || 1) * scale)
      const newHeight = Math.round((meta.height || 1) * scale)
      apiBuffer = await sharp(fileBuffer)
        .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
    }
    const base64DataUrl = `data:${mimeType};base64,${apiBuffer.toString('base64')}`
    let analysis
    try {
      analysis = await callArkVision({ base64DataUrl })
      analysis.source = 'ark'
    } catch (error) {
      analysis = buildMockAnalysis(imageUrl)
      analysis.error = error instanceof Error ? error.message : 'Ark request failed'
    }

    const userId = req.body.userId || database.DEFAULT_USER_ID
    const photoId = database.createPhoto({
      userId,
      title: req.body.title,
      description: req.body.description,
      originalFilename: req.file.originalname,
      storedFilename,
      imageUrl,
      mimeType,
      size: req.file.size,
      width: meta.width,
      height: meta.height,
      metadata: {
        format: meta.format,
        space: meta.space,
        channels: meta.channels,
        depth: meta.depth,
      },
    })

    const record = database.createAnalysis({
      id: crypto.randomUUID(),
      photoId,
      userId,
      overallScore: analysis.overallScore,
      tags: analysis.tags,
      scores: analysis.scores,
      sections: analysis.sections,
      source: analysis.source,
      error: analysis.error,
      raw: analysis,
    })
    return res.json(record)
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

app.get('/api/analyses/latest', async (_req, res) => {
  const record = database.getLatestAnalysis()
  if (!record) {
    return res.status(404).json({ error: 'No analyses found' })
  }
  return res.json(record)
})

app.get('/api/analyses/:id', async (req, res) => {
  const record = database.getAnalysis(req.params.id)
  if (!record) {
    return res.status(404).json({ error: 'Analysis not found' })
  }
  return res.json(record)
})

app.get('/api/users', (_req, res) => {
  return res.json(database.listUsers())
})

app.post('/api/users', (req, res) => {
  try {
    const user = database.upsertUser(req.body || {})
    return res.status(201).json(user)
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save user' })
  }
})

app.get('/api/photos', (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 100)
  const userId = req.query.userId ? String(req.query.userId) : undefined
  return res.json(database.listPhotos({ limit, userId }))
})

app.get('/api/photos/:photoId/comments', (req, res) => {
  return res.json(database.listComments(req.params.photoId))
})

app.post('/api/photos/:photoId/comments', (req, res) => {
  const content = String(req.body?.content || '').trim()
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' })
  }
  const comment = database.addComment({
    photoId: req.params.photoId,
    userId: req.body?.userId,
    content,
  })
  return res.status(201).json(comment)
})

app.post('/api/photos/:photoId/likes', (req, res) => {
  try {
    return res.json(database.toggleLike({ photoId: req.params.photoId, userId: req.body?.userId }))
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update like' })
  }
})

app.post('/api/photos/:photoId/collections', (req, res) => {
  try {
    return res.status(201).json(database.addToCollection({
      photoId: req.params.photoId,
      userId: req.body?.userId,
      name: req.body?.name,
    }))
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save collection' })
  }
})

app.get('/api/collections', (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : database.DEFAULT_USER_ID
  return res.json(database.listCollections(userId))
})

app.use('/uploads', express.static(uploadDir))

app.use(express.static(distDir))
app.get(/.*/, async (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next()
  }

  try {
    return res.sendFile(path.join(distDir, 'index.html'))
  } catch (error) {
    return next(error)
  }
})

await new Promise((resolve, reject) => {
  const server = app.listen(port, () => {
    console.log(`API server running at http://127.0.0.1:${port}`)
  })
  server.on('error', reject)
  server.on('close', resolve)
})

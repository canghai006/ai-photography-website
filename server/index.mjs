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
const railwayVolumeMountPath = String(process.env.RAILWAY_VOLUME_MOUNT_PATH || '').trim()
const storageDir = railwayVolumeMountPath
  ? path.resolve(railwayVolumeMountPath)
  : process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
  : path.join(rootDir, 'storage')
const uploadDir = path.join(storageDir, 'uploads')
const analysesPath = path.join(storageDir, 'analyses.json')
const dbPath = path.join(storageDir, 'app.db')
const distDir = path.join(rootDir, 'dist')
const arkTimeoutMs = Number(process.env.ARK_TIMEOUT_MS || 55000)
const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const sessionCookieName = 'yingxi_session'
const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000
const guestAnalysisTtlMs = 60 * 60 * 1000
const guestAnalyses = new Map()
const galleryCategories = new Set(['风光', '人像', '其他'])

await fs.mkdir(storageDir, { recursive: true })
await fs.mkdir(uploadDir, { recursive: true })

console.log(JSON.stringify({
  event: 'storage_configured',
  storageDir,
  persistent: Boolean(railwayVolumeMountPath),
  source: railwayVolumeMountPath ? 'railway-volume' : process.env.STORAGE_DIR ? 'storage-dir' : 'local-default',
}))
if (process.env.RAILWAY_ENVIRONMENT && !railwayVolumeMountPath) {
  console.warn(JSON.stringify({ event: 'persistent_storage_missing', message: 'No Railway Volume is attached; data will be lost on redeploy.' }))
}

async function cleanupStaleGuestUploads() {
  const entries = await fs.readdir(uploadDir, { withFileTypes: true }).catch(() => [])
  await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.startsWith('guest-')).map(async (entry) => {
    const filePath = path.join(uploadDir, entry.name)
    const stat = await fs.stat(filePath).catch(() => null)
    if (stat && Date.now() - stat.mtimeMs >= guestAnalysisTtlMs) await fs.unlink(filePath).catch(() => undefined)
  }))
}

await cleanupStaleGuestUploads()
const guestCleanupInterval = setInterval(() => void cleanupStaleGuestUploads(), guestAnalysisTtlMs)
guestCleanupInterval.unref()

const database = createDatabase({ dbPath, legacyAnalysesPath: analysesPath })
await database.migrateLegacyAnalyses()
if (adminEmail) database.setUserRoleByEmail(adminEmail, 'admin')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const prefix = req.user ? '' : 'guest-'
    cb(null, `${prefix}${Date.now()}-${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (allowed.has(file.mimetype)) return cb(null, true)
    const error = new Error('仅支持 JPG、PNG 和 WEBP 图片')
    error.code = 'INVALID_FILE_TYPE'
    return cb(error, false)
  },
})

app.set('trust proxy', 1)
app.use(express.json({ limit: '4mb' }))

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=')
    if (index < 0) return ['', '']
    const value = part.slice(index + 1).trim()
    try {
      return [part.slice(0, index).trim(), decodeURIComponent(value)]
    } catch {
      return [part.slice(0, index).trim(), value]
    }
  }).filter(([key]) => key))
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false
  const [salt, expectedHex] = storedHash.split(':')
  const actual = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)
  const parts = [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(sessionMaxAgeMs / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)
  res.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`)
}

function optionalAuth(req, _res, next) {
  const token = parseCookies(req)[sessionCookieName]
  req.sessionTokenHash = token ? hashToken(token) : null
  req.user = req.sessionTokenHash ? database.getUserBySession(req.sessionTokenHash) : null
  next()
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: '请先登录后再继续' })
    next()
  })
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' })
    next()
  })
}

function createLoginSession(user, res) {
  const token = crypto.randomBytes(32).toString('base64url')
  database.createSession({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + sessionMaxAgeMs).toISOString(),
  })
  setSessionCookie(res, token)
}

// --- Multer error handling ---
function handleMulterError(err, _req, res, next) {
  if (!err) return next()
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 50MB），请压缩后重新上传' })
  }
  if (err.code === 'INVALID_FILE_TYPE') return res.status(400).json({ error: err.message })
  if (err.name === 'MulterError' || err.code?.startsWith('LIMIT_')) {
    return res.status(400).json({ error: err.message || '文件上传失败' })
  }
  return res.status(500).json({ error: err.message || 'Internal server error' })
}

app.get('/api/health', (_req, res) => {
  return res.json({
    ok: true,
    database: 'sqlite',
    persistentStorage: Boolean(railwayVolumeMountPath),
    storageSource: railwayVolumeMountPath ? 'railway-volume' : process.env.STORAGE_DIR ? 'storage-dir' : 'local-default',
  })
})

app.post('/api/auth/register', (req, res) => {
  try {
    const displayName = String(req.body?.displayName || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (displayName.length < 1 || displayName.length > 30) return res.status(400).json({ error: '名称需为 1—30 个字符' })
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: '请输入有效邮箱' })
    if (password.length < 8) return res.status(400).json({ error: '密码至少需要 8 位' })
    const username = `user_${crypto.randomBytes(5).toString('hex')}`
    let user = database.createAuthUser({ username, displayName: displayName || username, email, passwordHash: hashPassword(password) })
    if (adminEmail && email === adminEmail) user = database.setUserRoleByEmail(email, 'admin')
    createLoginSession(user, res)
    return res.status(201).json({ user })
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: '该邮箱已被注册' })
    return res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

app.post('/api/auth/login', (req, res) => {
  const login = String(req.body?.login || '').trim()
  const password = String(req.body?.password || '')
  const account = database.findUserForLogin(login)
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return res.status(401).json({ error: '账号或密码不正确' })
  }
  const user = database.getUser(account.id)
  createLoginSession(user, res)
  return res.json({ user })
})

app.post('/api/auth/logout', optionalAuth, (req, res) => {
  if (req.sessionTokenHash) database.deleteSession(req.sessionTokenHash)
  clearSessionCookie(res)
  return res.status(204).end()
})

app.get('/api/auth/me', optionalAuth, (req, res) => {
  return res.json({ user: req.user || null })
})

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  return res.json(database.getAdminStats())
})

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  return res.json(database.listAdminUsers())
})

app.get('/api/admin/photos', requireAdmin, (_req, res) => {
  return res.json(database.listAdminPhotos())
})

app.delete('/api/admin/photos/:photoId', requireAdmin, async (req, res) => {
  const photo = database.deleteAdminPhoto(req.params.photoId)
  if (!photo) return res.status(404).json({ error: '图片不存在' })
  await fs.unlink(path.join(uploadDir, path.basename(photo.storedFilename))).catch(() => undefined)
  return res.status(204).end()
})

app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
  const target = database.getUser(req.params.userId)
  if (!target) return res.status(404).json({ error: '用户不存在' })
  if (target.id === req.user.id || target.role === 'admin') return res.status(400).json({ error: '不能删除管理员账号' })
  const files = database.getUserStoredFilenames(target.id)
  if (!database.deleteAdminUser(target.id)) return res.status(404).json({ error: '用户不存在' })
  await Promise.all(files.map(({ storedFilename }) => fs.unlink(path.join(uploadDir, path.basename(storedFilename))).catch(() => undefined)))
  return res.status(204).end()
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
      改进建议: '改进方向：建议适度压低局部高光，并收紧少量边缘信息，让主体更集中。\n\n调色建议：白平衡可轻微向冷色偏移，高光减少约 10%，阴影略微抬升；适当降低整体饱和度，并保留亮部的暖色，让冷暖关系更清晰、画面更有电影感。',
    },
    source: 'mock',
  }
}

function ensureColorGradingAdvice(analysis) {
  const sections = analysis?.sections && typeof analysis.sections === 'object'
    ? { ...analysis.sections }
    : {}
  const improvement = typeof sections.改进建议 === 'string' ? sections.改进建议.trim() : ''
  const separateColorAdvice = typeof sections.调色建议 === 'string' ? sections.调色建议.trim() : ''

  if (!improvement.includes('调色建议')) {
    const colorAdvice = separateColorAdvice || '建议根据画面主色调整白平衡，并分别微调高光、阴影和主要色相的饱和度，使主体更突出、整体色调更统一。'
    sections.改进建议 = `${improvement || '改进方向：可进一步优化主体与背景的视觉关系。'}\n\n调色建议：${colorAdvice.replace(/^调色建议[：:]\s*/, '')}`
  }

  delete sections.调色建议
  return { ...analysis, sections }
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
    signal: AbortSignal.timeout(arkTimeoutMs),
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
            '你是一名专业摄影评论人。请用中文返回严格 JSON，不要 markdown，不要额外说明。字段必须包含 overallScore(number), tags(string[]), scores(object: 构图/光影/色彩/情绪/后期空间), sections(object: 作品亮点/构图分析/光影分析/色彩分析/情绪表达/改进建议)。分数范围 0-100。改进建议必须是一个字符串，并严格分成“改进方向：……”和“调色建议：……”两段，中间用两个换行符分隔。调色建议必须结合当前照片给出可操作的调色方案，至少涉及白平衡、曝光或明暗、HSL、饱和度、曲线、色彩分级中的三项，并说明调整方向或参考幅度，避免使用泛泛而谈的套话。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张摄影作品，输出可直接展示在网站中的专业摄影点评结果。' },
            { type: 'image_url', image_url: { url: base64DataUrl } },
          ],
        },
      ],
      temperature: 0.5,
      max_tokens: 1200,
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

// Build a compressed image for the Ark API, keeping base64 under ~8 MB (API limit is 10 MB).
async function buildArkImage(fileBuffer) {
  const MB = 1024 * 1024
  // Try progressively smaller sizes to stay under the Ark 10 MB limit
  const sizes = [
    { width: 1920, height: 1920, quality: 78 },
    { width: 1536, height: 1536, quality: 72 },
    { width: 1280, height: 1280, quality: 68 },
    { width: 1024, height: 1024, quality: 65 },
  ]

  for (const size of sizes) {
    const apiBuffer = await sharp(fileBuffer)
      .rotate()
      .resize({ width: size.width, height: size.height, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: size.quality, chromaSubsampling: '4:2:0' })
      .toBuffer()

    const base64Length = apiBuffer.toString('base64').length
    if (base64Length < 8 * MB) {
      return { apiBuffer, base64DataUrl: `data:image/jpeg;base64,${apiBuffer.toString('base64')}` }
    }
    console.log(JSON.stringify({
      event: 'ark_image_too_large',
      base64Length,
      width: size.width,
      quality: size.quality,
    }))
  }

  // Last resort: use the smallest size
  const apiBuffer = await sharp(fileBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 60, chromaSubsampling: '4:2:0' })
    .toBuffer()

  return { apiBuffer, base64DataUrl: `data:image/jpeg;base64,${apiBuffer.toString('base64')}` }
}

app.post('/api/analyze', optionalAuth, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未检测到上传的图片，请选择图片后重试' })
    }

    console.log(JSON.stringify({
      event: 'upload_received',
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }))

    const filePath = req.file.path
    const fileBuffer = await fs.readFile(filePath)
    const mimeType = req.file.mimetype || 'image/jpeg'
    const storedFilename = path.basename(filePath)
    const imageUrl = `/uploads/${storedFilename}`

    const meta = await sharp(fileBuffer).metadata()
    const requestStartedAt = Date.now()

    // Build a compressed image for Ark API that fits under the 10 MB limit
    const { apiBuffer, base64DataUrl } = await buildArkImage(fileBuffer)

    let analysis
    try {
      analysis = await callArkVision({ base64DataUrl })
      analysis.source = 'ark'
    } catch (error) {
      console.log(JSON.stringify({
        event: 'ark_call_failed',
        error: error instanceof Error ? error.message : 'Unknown',
      }))
      analysis = buildMockAnalysis(imageUrl)
      analysis.error = error instanceof Error ? error.message : 'Ark request failed'
    }

    analysis = ensureColorGradingAdvice(analysis)

    console.log(JSON.stringify({
      event: 'analysis_complete',
      source: analysis.source,
      originalBytes: fileBuffer.length,
      arkImageBytes: apiBuffer.length,
      durationMs: Date.now() - requestStartedAt,
      error: analysis.error || null,
    }))

    if (!req.user) {
      const guestId = `guest-${crypto.randomUUID()}`
      const createdAt = new Date().toISOString()
      const record = {
        id: guestId,
        createdAt,
        imageUrl,
        filename: req.file.originalname,
        mimeType,
        overallScore: analysis.overallScore,
        tags: analysis.tags,
        scores: analysis.scores,
        sections: analysis.sections,
        source: analysis.source,
        error: analysis.error,
        photo: {
          id: guestId,
          userId: null,
          title: req.file.originalname,
          description: '',
          width: meta.width,
          height: meta.height,
          size: req.file.size,
          createdAt,
        },
      }
      guestAnalyses.set(guestId, record)
      const cleanupTimer = setTimeout(async () => {
        guestAnalyses.delete(guestId)
        await fs.unlink(filePath).catch(() => undefined)
      }, guestAnalysisTtlMs)
      cleanupTimer.unref()
      return res.json(record)
    }

    const userId = req.user.id
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
    console.log(JSON.stringify({
      event: 'analysis_error',
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    }))
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

app.get('/api/analyses/latest', requireAuth, async (req, res) => {
  const record = database.getLatestAnalysis(req.user.id)
  if (!record) {
    return res.status(404).json({ error: 'No analyses found' })
  }
  return res.json(record)
})

app.get('/api/analyses/:id', optionalAuth, async (req, res) => {
  const guestRecord = guestAnalyses.get(req.params.id)
  if (guestRecord) return res.json(guestRecord)
  const record = database.getAnalysis(req.params.id)
  const canView = record && (record.photo.userId === req.user?.id || database.isPublicPhoto(record.photo.id))
  if (!canView) {
    return res.status(404).json({ error: 'Analysis not found' })
  }
  return res.json(record)
})

app.get('/api/me/analyses', requireAuth, (req, res) => {
  return res.json(database.listUserAnalyses(req.user.id))
})

app.get('/api/me/photos', requireAuth, (req, res) => {
  return res.json(database.listPhotos({ userId: req.user.id, limit: 100 }))
})

app.get('/api/gallery', optionalAuth, (req, res) => {
  return res.json(database.listGallery(req.user?.id))
})

app.post('/api/gallery', requireAuth, upload.array('images', 20), handleMulterError, async (req, res) => {
  let persisted = false
  try {
    const files = Array.isArray(req.files) ? req.files : []
    if (files.length === 0) return res.status(400).json({ error: '请至少选择一张图片' })
    const title = String(req.body.title || '').trim()
    const description = String(req.body.description || '').trim()
    const requestedCategory = String(req.body.category || '其他').trim()
    const category = galleryCategories.has(requestedCategory) ? requestedCategory : '其他'

    const preparedFiles = await Promise.all(files.map(async (file, index) => {
      const fileBuffer = await fs.readFile(file.path)
      const meta = await sharp(fileBuffer).metadata()
      const fallbackTitle = path.parse(file.originalname).name.trim() || '未命名作品'
      return {
        file,
        meta,
        photoTitle: title ? files.length > 1 ? `${title} ${index + 1}` : title : fallbackTitle,
      }
    }))

    const photoIds = database.createPhotos(preparedFiles.map(({ file, meta, photoTitle }) => ({
      userId: req.user.id,
      title: photoTitle,
      description,
      category,
      isPublic: true,
      originalFilename: file.originalname,
      storedFilename: path.basename(file.path),
      imageUrl: `/uploads/${path.basename(file.path)}`,
      mimeType: file.mimetype || 'image/jpeg',
      size: file.size,
      width: meta.width,
      height: meta.height,
      metadata: { format: meta.format, space: meta.space, channels: meta.channels, depth: meta.depth },
    })))
    persisted = true
    const uploadedIds = new Set(photoIds)
    const uploadedPhotos = database.listGallery(req.user.id).filter((photo) => uploadedIds.has(photo.id))
    return res.status(201).json({ count: uploadedPhotos.length, photos: uploadedPhotos })
  } catch (error) {
    const files = Array.isArray(req.files) ? req.files : []
    if (!persisted) await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)))
    return res.status(400).json({ error: error instanceof Error ? error.message : '作品上传失败' })
  }
})

app.get('/api/photos', requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 100)
  return res.json(database.listPhotos({ limit, userId: req.user.id }))
})

app.get('/api/photos/:photoId/comments', (req, res) => {
  if (!database.isPublicPhoto(req.params.photoId)) return res.status(404).json({ error: '作品不存在' })
  return res.json(database.listComments(req.params.photoId))
})

app.post('/api/photos/:photoId/comments', requireAuth, (req, res) => {
  if (!database.isPublicPhoto(req.params.photoId)) return res.status(404).json({ error: '作品不存在' })
  const content = String(req.body?.content || '').trim()
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' })
  }
  const comment = database.addComment({
    photoId: req.params.photoId,
    userId: req.user.id,
    content,
  })
  return res.status(201).json(comment)
})

app.post('/api/photos/:photoId/likes', requireAuth, (req, res) => {
  try {
    if (!database.isPublicPhoto(req.params.photoId)) return res.status(404).json({ error: '作品不存在' })
    return res.json(database.toggleLike({ photoId: req.params.photoId, userId: req.user.id }))
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update like' })
  }
})

app.post('/api/photos/:photoId/collections', requireAuth, (req, res) => {
  try {
    return res.status(201).json(database.addToCollection({
      photoId: req.params.photoId,
      userId: req.user.id,
      name: req.body?.name,
    }))
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save collection' })
  }
})

app.get('/api/collections', requireAuth, (req, res) => {
  return res.json(database.listCollections(req.user.id))
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

// Global error handler (must be last)
app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({
    event: 'unhandled_error',
    error: err instanceof Error ? err.message : String(err),
  }))
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 50MB），请压缩后重新上传' })
  }
  return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' })
})

await new Promise((resolve, reject) => {
  const server = app.listen(port, () => {
    console.log(`API server running at http://127.0.0.1:${port}`)
  })
  server.on('error', reject)
  server.on('close', resolve)
})

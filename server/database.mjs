import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const DEFAULT_USER_ID = 'default-photographer'

function jsonStringify(value, fallback) {
  return JSON.stringify(value ?? fallback)
}

function jsonParse(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function rowToAnalysisRecord(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    imageUrl: row.image_url,
    filename: row.original_filename,
    mimeType: row.mime_type,
    overallScore: row.overall_score,
    tags: jsonParse(row.tags, []),
    scores: jsonParse(row.scores, {}),
    sections: jsonParse(row.sections, {}),
    source: row.source || undefined,
    error: row.error || undefined,
    photo: {
      id: row.photo_id,
      userId: row.user_id,
      title: row.title || '',
      description: row.description || '',
      width: row.width,
      height: row.height,
      size: row.size,
      createdAt: row.photo_created_at,
    },
  }
}

function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? row.display_name,
    email: row.email,
    avatarUrl: row.avatarUrl ?? row.avatar_url,
    bio: row.bio,
    role: row.role,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  }
}

export function createDatabase({ dbPath, legacyAnalysesPath }) {
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE,
      avatar_url TEXT,
      bio TEXT,
      role TEXT NOT NULL DEFAULT 'photographer',
      password_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL UNIQUE,
      image_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      metadata_json TEXT,
      category TEXT NOT NULL DEFAULT '其他',
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      scores_json TEXT NOT NULL DEFAULT '{}',
      sections_json TEXT NOT NULL DEFAULT '{}',
      source TEXT,
      error TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (photo_id, user_id),
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Default',
      created_at TEXT NOT NULL,
      UNIQUE (user_id, photo_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_photos_user_created ON photos(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analysis_photo_created ON analysis_results(photo_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_photo_created ON comments(photo_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_likes_photo ON likes(photo_id);
    CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  `)

  const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name))
  if (!userColumns.has('password_hash')) db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT')
  const photoColumns = new Set(db.prepare('PRAGMA table_info(photos)').all().map((column) => column.name))
  if (!photoColumns.has('category')) db.exec("ALTER TABLE photos ADD COLUMN category TEXT NOT NULL DEFAULT '其他'")
  if (!photoColumns.has('is_public')) db.exec('ALTER TABLE photos ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users(username COLLATE NOCASE)')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE) WHERE email IS NOT NULL')
  db.exec('CREATE INDEX IF NOT EXISTS idx_photos_public_created ON photos(is_public, created_at DESC)')

  const now = new Date().toISOString()
  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, display_name, email, avatar_url, bio, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEFAULT_USER_ID,
    'photographer',
    'Default Photographer',
    null,
    null,
    'Local photographer account used when uploads do not provide a user.',
    'photographer',
    now,
    now,
  )

  return {
    DEFAULT_USER_ID,

    async migrateLegacyAnalyses() {
      try {
        await fs.access(legacyAnalysesPath)
      } catch {
        return 0
      }

      const raw = await fs.readFile(legacyAnalysesPath, 'utf8')
      const records = jsonParse(raw, [])
      if (!Array.isArray(records) || records.length === 0) return 0

      const countRow = db.prepare('SELECT COUNT(*) AS count FROM analysis_results').get()
      if (countRow.count > 0) return 0

      const insertPhoto = db.prepare(`
        INSERT OR IGNORE INTO photos (
          id, user_id, title, description, original_filename, stored_filename, image_url,
          mime_type, size, width, height, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertAnalysis = db.prepare(`
        INSERT OR IGNORE INTO analysis_results (
          id, photo_id, user_id, overall_score, tags_json, scores_json, sections_json,
          source, error, raw_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      db.exec('BEGIN')
      try {
        for (const item of records) {
          const createdAt = item.createdAt || now
          const storedFilename = path.basename(item.imageUrl || item.filename || `${item.id}.jpg`)
          const photoId = item.photoId || crypto.randomUUID()
          insertPhoto.run(
            photoId,
            DEFAULT_USER_ID,
            item.title || item.filename || 'Untitled photo',
            item.description || '',
            item.filename || storedFilename,
            storedFilename,
            item.imageUrl || `/uploads/${storedFilename}`,
            item.mimeType || 'image/jpeg',
            item.size || 0,
            item.width || null,
            item.height || null,
            jsonStringify(item.metadata, {}),
            createdAt,
            createdAt,
          )
          insertAnalysis.run(
            item.id || crypto.randomUUID(),
            photoId,
            DEFAULT_USER_ID,
            Number(item.overallScore || 0),
            jsonStringify(item.tags, []),
            jsonStringify(item.scores, {}),
            jsonStringify(item.sections, {}),
            item.source || null,
            item.error || null,
            jsonStringify(item, {}),
            createdAt,
          )
        }
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
      return records.length
    },

    upsertUser({ id, username, displayName, email, avatarUrl, bio, role }) {
      const userId = id || crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT INTO users (id, username, display_name, email, avatar_url, bio, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          display_name = excluded.display_name,
          email = excluded.email,
          avatar_url = excluded.avatar_url,
          bio = excluded.bio,
          role = excluded.role,
          updated_at = excluded.updated_at
      `).run(
        userId,
        username || `user-${userId.slice(0, 8)}`,
        displayName || username || 'Photographer',
        email || null,
        avatarUrl || null,
        bio || null,
        role || 'photographer',
        createdAt,
        createdAt,
      )
      return this.getUser(userId)
    },

    getUser(id) {
      return publicUser(db.prepare(`
        SELECT id, username, display_name AS displayName, email, avatar_url AS avatarUrl, bio, role,
          created_at AS createdAt, updated_at AS updatedAt
        FROM users
        WHERE id = ?
      `).get(id))
    },

    createAuthUser({ username, displayName, email, passwordHash }) {
      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT INTO users (id, username, display_name, email, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'photographer', ?, ?)
      `).run(id, username, displayName, email, passwordHash, createdAt, createdAt)
      return this.getUser(id)
    },

    findUserForLogin(login) {
      return db.prepare(`
        SELECT id, username, display_name AS displayName, email, avatar_url AS avatarUrl, bio, role,
          password_hash AS passwordHash, created_at AS createdAt, updated_at AS updatedAt
        FROM users
        WHERE lower(email) = lower(?) OR lower(username) = lower(?)
        LIMIT 1
      `).get(login, login)
    },

    createSession({ userId, tokenHash, expiresAt }) {
      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(createdAt)
      db.prepare(`
        INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, tokenHash, expiresAt, createdAt)
      return id
    },

    getUserBySession(tokenHash) {
      const row = db.prepare(`
        SELECT u.id, u.username, u.display_name AS displayName, u.email, u.avatar_url AS avatarUrl,
          u.bio, u.role, u.created_at AS createdAt, u.updated_at AS updatedAt
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?
      `).get(tokenHash, new Date().toISOString())
      return publicUser(row)
    },

    deleteSession(tokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
    },

    listUsers() {
      return db.prepare(`
        SELECT id, username, display_name AS displayName, email, avatar_url AS avatarUrl, bio, role,
          created_at AS createdAt, updated_at AS updatedAt
        FROM users
        ORDER BY created_at DESC
      `).all()
    },

    createPhoto({ userId, title, description, originalFilename, storedFilename, imageUrl, mimeType, size, width, height, metadata, category, isPublic }) {
      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT INTO photos (
          id, user_id, title, description, original_filename, stored_filename, image_url,
          mime_type, size, width, height, metadata_json, category, is_public, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId || DEFAULT_USER_ID,
        title || originalFilename,
        description || '',
        originalFilename,
        storedFilename,
        imageUrl,
        mimeType,
        size || 0,
        width || null,
        height || null,
        jsonStringify(metadata, {}),
        category || '其他',
        isPublic ? 1 : 0,
        createdAt,
        createdAt,
      )
      return id
    },

    createAnalysis({ id, photoId, userId, overallScore, tags, scores, sections, source, error, raw }) {
      const analysisId = id || crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT INTO analysis_results (
          id, photo_id, user_id, overall_score, tags_json, scores_json, sections_json,
          source, error, raw_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        analysisId,
        photoId,
        userId || DEFAULT_USER_ID,
        Number(overallScore || 0),
        jsonStringify(tags, []),
        jsonStringify(scores, {}),
        jsonStringify(sections, {}),
        source || null,
        error || null,
        jsonStringify(raw, {}),
        createdAt,
      )
      return this.getAnalysis(analysisId)
    },

    getAnalysis(id, userId) {
      const row = db.prepare(`
        SELECT
          ar.id,
          ar.created_at,
          ar.overall_score,
          ar.tags_json AS tags,
          ar.scores_json AS scores,
          ar.sections_json AS sections,
          ar.source,
          ar.error,
          p.id AS photo_id,
          p.user_id,
          p.title,
          p.description,
          p.original_filename,
          p.image_url,
          p.mime_type,
          p.size,
          p.width,
          p.height,
          p.created_at AS photo_created_at
        FROM analysis_results ar
        JOIN photos p ON p.id = ar.photo_id
        WHERE ar.id = ? AND (? IS NULL OR ar.user_id = ?)
      `).get(id, userId || null, userId || null)
      return row ? rowToAnalysisRecord(row) : null
    },

    getLatestAnalysis(userId) {
      const row = db.prepare(`
        SELECT
          ar.id,
          ar.created_at,
          ar.overall_score,
          ar.tags_json AS tags,
          ar.scores_json AS scores,
          ar.sections_json AS sections,
          ar.source,
          ar.error,
          p.id AS photo_id,
          p.user_id,
          p.title,
          p.description,
          p.original_filename,
          p.image_url,
          p.mime_type,
          p.size,
          p.width,
          p.height,
          p.created_at AS photo_created_at
        FROM analysis_results ar
        JOIN photos p ON p.id = ar.photo_id
        WHERE (? IS NULL OR ar.user_id = ?)
        ORDER BY ar.created_at DESC
        LIMIT 1
      `).get(userId || null, userId || null)
      return row ? rowToAnalysisRecord(row) : null
    },

    listPhotos({ limit = 50, userId } = {}) {
      const rows = userId
        ? db.prepare(`
            SELECT p.*, u.username, u.display_name
            FROM photos p
            JOIN users u ON u.id = p.user_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT ?
          `).all(userId, limit)
        : db.prepare(`
            SELECT p.*, u.username, u.display_name
            FROM photos p
            JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC
            LIMIT ?
          `).all(limit)

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        filename: row.original_filename,
        imageUrl: row.image_url,
        mimeType: row.mime_type,
        size: row.size,
        width: row.width,
        height: row.height,
        metadata: jsonParse(row.metadata_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          username: row.username,
          displayName: row.display_name,
        },
      }))
    },

    listUserAnalyses(userId, limit = 50) {
      const rows = db.prepare(`
        SELECT
          ar.id, ar.created_at, ar.overall_score, ar.tags_json AS tags,
          ar.scores_json AS scores, ar.sections_json AS sections, ar.source, ar.error,
          p.id AS photo_id, p.user_id, p.title, p.description, p.original_filename,
          p.image_url, p.mime_type, p.size, p.width, p.height, p.created_at AS photo_created_at
        FROM analysis_results ar
        JOIN photos p ON p.id = ar.photo_id
        WHERE ar.user_id = ?
        ORDER BY ar.created_at DESC
        LIMIT ?
      `).all(userId, limit)
      return rows.map(rowToAnalysisRecord)
    },

    listGallery(viewerUserId, limit = 100) {
      const rows = db.prepare(`
        SELECT p.*, u.username, u.display_name,
          (SELECT COUNT(*) FROM likes l WHERE l.photo_id = p.id) AS like_count,
          EXISTS(SELECT 1 FROM likes l WHERE l.photo_id = p.id AND l.user_id = ?) AS liked,
          (SELECT ar.id FROM analysis_results ar WHERE ar.photo_id = p.id ORDER BY ar.created_at DESC LIMIT 1) AS analysis_id,
          (SELECT ar.overall_score FROM analysis_results ar WHERE ar.photo_id = p.id ORDER BY ar.created_at DESC LIMIT 1) AS score
        FROM photos p
        JOIN users u ON u.id = p.user_id
        WHERE p.is_public = 1
        ORDER BY p.created_at DESC
        LIMIT ?
      `).all(viewerUserId || '', limit)
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        category: row.category || '其他',
        imageUrl: row.image_url,
        createdAt: row.created_at,
        likeCount: Number(row.like_count || 0),
        liked: Boolean(row.liked),
        analysisId: row.analysis_id || null,
        score: row.score ?? null,
        user: { username: row.username, displayName: row.display_name },
      }))
    },

    isPublicPhoto(photoId) {
      return Boolean(db.prepare('SELECT 1 AS found FROM photos WHERE id = ? AND is_public = 1').get(photoId))
    },

    addComment({ photoId, userId, content }) {
      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT INTO comments (id, photo_id, user_id, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, photoId, userId || DEFAULT_USER_ID, content, createdAt, createdAt)
      return { id, photoId, userId: userId || DEFAULT_USER_ID, content, createdAt, updatedAt: createdAt }
    },

    listComments(photoId) {
      return db.prepare(`
        SELECT c.id, c.photo_id AS photoId, c.user_id AS userId, c.content,
          c.created_at AS createdAt, c.updated_at AS updatedAt,
          u.username, u.display_name AS displayName
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.photo_id = ?
        ORDER BY c.created_at DESC
      `).all(photoId)
    },

    toggleLike({ photoId, userId }) {
      const nextUserId = userId || DEFAULT_USER_ID
      const existing = db.prepare('SELECT id FROM likes WHERE photo_id = ? AND user_id = ?').get(photoId, nextUserId)
      if (existing) {
        db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id)
        return { photoId, userId: nextUserId, liked: false, count: this.countLikes(photoId) }
      }
      db.prepare('INSERT INTO likes (id, photo_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
        crypto.randomUUID(),
        photoId,
        nextUserId,
        new Date().toISOString(),
      )
      return { photoId, userId: nextUserId, liked: true, count: this.countLikes(photoId) }
    },

    countLikes(photoId) {
      return db.prepare('SELECT COUNT(*) AS count FROM likes WHERE photo_id = ?').get(photoId).count
    },

    addToCollection({ photoId, userId, name }) {
      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      db.prepare(`
        INSERT OR IGNORE INTO collections (id, user_id, photo_id, name, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId || DEFAULT_USER_ID, photoId, name || 'Default', createdAt)
      return { photoId, userId: userId || DEFAULT_USER_ID, name: name || 'Default', createdAt }
    },

    listCollections(userId = DEFAULT_USER_ID) {
      return db.prepare(`
        SELECT c.id, c.user_id AS userId, c.photo_id AS photoId, c.name, c.created_at AS createdAt,
          p.title, p.image_url AS imageUrl, p.original_filename AS filename
        FROM collections c
        JOIN photos p ON p.id = c.photo_id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `).all(userId)
    },
  }
}

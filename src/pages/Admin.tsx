import { BarChart3, Heart, Image, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BorderGlow } from '../components/BorderGlow'
import { useAuth } from '../context/AuthContext'

type AdminStats = {
  users: number
  photos: number
  analyses: number
  publicPhotos: number
  likes: number
}

type AdminUser = {
  id: string
  displayName: string
  email: string
  role: string
  createdAt: string
  photoCount: number
  analysisCount: number
}

type AdminPhoto = {
  id: string
  title: string
  category: string
  imageUrl: string
  thumbnailUrl?: string
  isPublic: boolean
  createdAt: string
  ownerName: string
  ownerEmail: string
  analysisCount: number
  likeCount: number
}

async function adminRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || '后台请求失败')
  }
  return response.status === 204 ? null : response.json()
}

export function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [photos, setPhotos] = useState<AdminPhoto[]>([])
  const [tab, setTab] = useState<'users' | 'photos'>('users')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextStats, nextUsers, nextPhotos] = await Promise.all([
        adminRequest('/api/admin/stats'),
        adminRequest('/api/admin/users'),
        adminRequest('/api/admin/photos'),
      ])
      setStats(nextStats)
      setUsers(nextUsers)
      setPhotos(nextPhotos)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '后台加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') void loadData()
  }, [user, loadData])

  async function removeUser(target: AdminUser) {
    if (!window.confirm(`确定删除用户“${target.displayName}”吗？该用户的照片、分析和点赞也会删除。`)) return
    setDeletingId(target.id)
    try {
      await adminRequest(`/api/admin/users/${target.id}`, { method: 'DELETE' })
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除失败')
    } finally {
      setDeletingId('')
    }
  }

  async function removePhoto(photo: AdminPhoto) {
    if (!window.confirm(`确定删除图片“${photo.title}”吗？相关分析和点赞也会删除。`)) return
    setDeletingId(photo.id)
    try {
      await adminRequest(`/api/admin/photos/${photo.id}`, { method: 'DELETE' })
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除失败')
    } finally {
      setDeletingId('')
    }
  }

  if (!authLoading && !user) return <Navigate replace state={{ from: '/admin' }} to="/auth" />
  if (!authLoading && user?.role !== 'admin') return <Navigate replace to="/profile" />
  if (authLoading || !user) return <main className="min-h-screen bg-black pt-32 text-center text-zinc-400">正在验证管理员权限...</main>

  const statCards = [
    { label: '注册用户', value: stats?.users ?? 0, icon: Users },
    { label: '全部图片', value: stats?.photos ?? 0, icon: Image },
    { label: '分析记录', value: stats?.analyses ?? 0, icon: BarChart3 },
    { label: '公开作品', value: stats?.publicPhotos ?? 0, icon: ShieldCheck },
    { label: '累计点赞', value: stats?.likes ?? 0, icon: Heart },
  ]

  return (
    <main className="cloudscape-page-bg min-h-screen px-6 pb-24 pt-32 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-sm tracking-[0.32em] text-amber-100/80">ADMIN CONSOLE</p><h1 className="mt-4 text-5xl font-medium text-white md:text-7xl">管理后台</h1><p className="mt-4 text-zinc-400">{user.displayName} · {user.email}</p></div>
          <div className="inline-flex self-start rounded-full border border-amber-200/25 bg-black/45 px-4 py-2 text-sm text-amber-100"><ShieldCheck className="mr-2" size={17} />管理员权限已验证</div>
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map(({ label, value, icon: Icon }) => <BorderGlow key={label} borderRadius={12} backgroundColor="#08090b" glowColor="42 88 76"><div className="p-5"><Icon className="text-amber-100" size={21} /><p className="mt-4 text-sm text-zinc-500">{label}</p><p className="mt-1 text-3xl text-white">{value}</p></div></BorderGlow>)}
        </section>

        <div className="mt-12 flex gap-3 border-b border-white/10 pb-4">
          <button className={`rounded-full px-5 py-2.5 text-sm ${tab === 'users' ? 'bg-amber-200 text-black' : 'border border-white/15 text-zinc-300'}`} onClick={() => setTab('users')}>注册用户</button>
          <button className={`rounded-full px-5 py-2.5 text-sm ${tab === 'photos' ? 'bg-amber-200 text-black' : 'border border-white/15 text-zinc-300'}`} onClick={() => setTab('photos')}>上传图片</button>
        </div>

        {error ? <p className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-rose-200">{error}</p> : null}
        {loading ? <p className="mt-10 text-zinc-400">正在读取数据库...</p> : tab === 'users' ? (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-black/60">
            <table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-white/10 text-zinc-500"><tr><th className="p-5">用户</th><th className="p-5">邮箱</th><th className="p-5">角色</th><th className="p-5">图片</th><th className="p-5">分析</th><th className="p-5">注册时间</th><th className="p-5 text-right">操作</th></tr></thead><tbody>{users.map((item) => <tr className="border-b border-white/5 text-zinc-300 last:border-0" key={item.id}><td className="p-5 font-medium text-white">{item.displayName}</td><td className="p-5">{item.email}</td><td className="p-5"><span className={`rounded-full px-3 py-1 text-xs ${item.role === 'admin' ? 'bg-amber-200/15 text-amber-100' : 'bg-white/5 text-zinc-400'}`}>{item.role}</span></td><td className="p-5">{item.photoCount}</td><td className="p-5">{item.analysisCount}</td><td className="p-5">{new Date(item.createdAt).toLocaleString('zh-CN')}</td><td className="p-5 text-right"><button disabled={item.role === 'admin' || deletingId === item.id} className="inline-flex items-center gap-2 text-rose-300 disabled:cursor-not-allowed disabled:opacity-30" onClick={() => void removeUser(item)}><Trash2 size={16} />删除</button></td></tr>)}</tbody></table>
            {users.length === 0 ? <p className="p-10 text-center text-zinc-500">暂无注册用户</p> : null}
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => <article className="overflow-hidden rounded-xl border border-white/10 bg-black/65" key={photo.id}><img className="h-64 w-full object-cover" decoding="async" loading="lazy" src={photo.thumbnailUrl || photo.imageUrl} alt={photo.title} /><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg text-white">{photo.title}</h3><p className="mt-1 text-xs text-zinc-500">{photo.ownerName} · {photo.ownerEmail}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${photo.isPublic ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/5 text-zinc-400'}`}>{photo.isPublic ? '公开' : '私有'}</span></div><div className="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>{photo.category} · 分析 {photo.analysisCount} · 点赞 {photo.likeCount}</span><button disabled={deletingId === photo.id} className="inline-flex items-center gap-1 text-rose-300 disabled:opacity-40" onClick={() => void removePhoto(photo)}><Trash2 size={15} />删除</button></div></div></article>)}
            {photos.length === 0 ? <p className="text-zinc-500">暂无上传图片</p> : null}
          </div>
        )}
      </div>
    </main>
  )
}

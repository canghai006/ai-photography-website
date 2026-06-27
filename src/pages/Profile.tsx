import { BarChart3, Images, LogOut, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { FadeUp } from '../components/Animated'
import { BorderGlow } from '../components/BorderGlow'
import { useAuth } from '../context/AuthContext'
import type { AnalysisRecord } from '../types/analysis'

type UserPhoto = {
  id: string
  title: string
  imageUrl: string
  thumbnailUrl?: string
  createdAt: string
}

export function Profile() {
  const { user, loading: authLoading, logout } = useAuth()
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetch('/api/me/analyses').then((response) => response.ok ? response.json() : []),
      fetch('/api/me/photos').then((response) => response.ok ? response.json() : []),
    ]).then(([analysisData, photoData]) => {
      setAnalyses(analysisData)
      setPhotos(photoData)
    }).finally(() => setLoading(false))
  }, [user])

  if (!authLoading && !user) return <Navigate replace state={{ from: '/profile' }} to="/auth" />
  if (authLoading || !user) return <main className="min-h-screen bg-black pt-32 text-center text-zinc-400">正在读取账号...</main>

  const stats = [
    { label: '分析记录', value: analyses.length, icon: BarChart3 },
    { label: '保存照片', value: photos.length, icon: Images },
    { label: '加入时间', value: new Date(user.createdAt).toLocaleDateString('zh-CN'), icon: Images },
  ]

  return (
    <main className="cloudscape-page-bg min-h-screen px-6 pb-24 pt-36 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <FadeUp>
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="text-sm tracking-[0.35em] text-amber-100/80">个人中心</p>
              <h1 className="page-title mt-5 text-5xl font-medium text-white md:text-7xl">{user.displayName}</h1>
              <p className="mt-4 text-zinc-400">@{user.username} · {user.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-medium text-black" to="/analyze"><Plus size={17} />分析照片</Link>
              <Link className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-white" to="/gallery"><Images size={17} />上传作品集</Link>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-zinc-300" onClick={() => void logout()}><LogOut size={17} />退出</button>
            </div>
          </div>
        </FadeUp>

        <section className="mt-14 grid gap-5 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <BorderGlow className="profile-stat-card" key={label} borderRadius={12} backgroundColor="#08090b" glowColor="42 92 76">
              <div className="p-6"><Icon className="text-amber-100" size={22} /><p className="mt-5 text-sm text-zinc-500">{label}</p><p className="mt-2 text-3xl text-white">{value}</p></div>
            </BorderGlow>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="text-3xl font-medium text-white">我的分析记录</h2>
          {loading ? <p className="mt-8 text-zinc-500">加载中...</p> : analyses.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">还没有分析记录，上传第一张照片试试。</div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {analyses.map((analysis) => (
                <Link className="group overflow-hidden rounded-xl border border-white/10 bg-black/45" key={analysis.id} to={`/result?id=${analysis.id}`}>
                  <img className="h-64 w-full object-cover transition duration-500 group-hover:scale-105" decoding="async" loading="lazy" src={analysis.imageUrl} alt={analysis.filename} />
                  <div className="relative bg-black/80 p-5"><div className="flex items-center justify-between"><h3 className="truncate text-lg text-white">{analysis.photo?.title || analysis.filename}</h3><span className="text-amber-100">{analysis.overallScore}</span></div><p className="mt-2 text-xs text-zinc-500">{new Date(analysis.createdAt).toLocaleString('zh-CN')}</p></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

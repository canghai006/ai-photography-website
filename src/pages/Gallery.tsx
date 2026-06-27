import { ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FadeUp } from '../components/Animated'
import { PhotoCard, type GalleryPhoto } from '../components/PhotoCard'
import { useAuth } from '../context/AuthContext'

const categories = ['全部', '人像', '风光', '街头', '建筑', '黑白', '电影感', '胶片', '其他']

export function Gallery() {
  const { user } = useAuth()
  const [active, setActive] = useState('全部')
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: '其他', file: null as File | null })

  async function loadGallery() {
    setError('')
    try {
      const response = await fetch('/api/gallery')
      if (!response.ok) throw new Error('作品集加载失败')
      setPhotos(await response.json())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '作品集加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadGallery() }, [user])

  const visiblePhotos = useMemo(
    () => active === '全部' ? photos : photos.filter((photo) => photo.category === active),
    [active, photos],
  )

  async function toggleLike(photoId: string) {
    if (!user) return
    const response = await fetch(`/api/photos/${photoId}/likes`, { method: 'POST' })
    if (!response.ok) return
    const data = await response.json()
    setPhotos((current) => current.map((photo) => photo.id === photoId ? { ...photo, liked: data.liked, likeCount: data.count } : photo))
  }

  async function submitUpload(event: FormEvent) {
    event.preventDefault()
    if (!form.file) return setError('请选择一张图片')
    setSubmitting(true)
    setError('')
    const body = new FormData()
    body.append('image', form.file)
    body.append('title', form.title)
    body.append('description', form.description)
    body.append('category', form.category)
    try {
      const response = await fetch('/api/gallery', { method: 'POST', body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '作品上传失败')
      setForm({ title: '', description: '', category: '其他', file: null })
      setUploadOpen(false)
      await loadGallery()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '作品上传失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="gallery-page cloudscape-page-bg min-h-screen px-6 pb-24 pt-36 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <FadeUp>
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="text-sm tracking-[0.35em] text-amber-100/80">摄影师公开作品</p>
              <h1 className="page-title mt-5 max-w-4xl text-6xl font-medium leading-tight text-white md:text-7xl">摄影作品集</h1>
            </div>
            {user ? (
              <button className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-200 px-6 py-3 font-medium text-black" onClick={() => setUploadOpen(true)}><ImagePlus size={19} />上传我的作品</button>
            ) : (
              <Link className="rounded-full border border-amber-200/40 px-6 py-3 text-center text-amber-100" state={{ from: '/gallery' }} to="/auth">登录后上传与点赞</Link>
            )}
          </div>
        </FadeUp>

        {uploadOpen && user ? (
          <form className="relative mt-10 grid gap-5 rounded-2xl border border-white/10 bg-black/75 p-6 backdrop-blur-xl md:grid-cols-2" onSubmit={submitUpload}>
            <button type="button" aria-label="关闭上传" className="absolute right-5 top-5 text-zinc-400 hover:text-white" onClick={() => setUploadOpen(false)}><X size={20} /></button>
            <div className="md:col-span-2"><h2 className="text-2xl text-white">发布到作品集</h2><p className="mt-2 text-sm text-zinc-500">作品将公开展示，其他登录用户可以点赞。</p></div>
            <label className="text-sm text-zinc-300">作品标题<input required className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-200/60" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label className="text-sm text-zinc-300">分类<select className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="text-sm text-zinc-300 md:col-span-2">作品说明<textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-200/60" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 p-6 text-sm text-zinc-300 hover:border-amber-200/50"><input required accept="image/jpeg,image/png,image/webp" type="file" className="hidden" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} />{form.file ? form.file.name : '选择 JPG / PNG / WEBP 图片'}</label>
            <button disabled={submitting} className="rounded-xl bg-amber-200 px-6 py-3 font-medium text-black disabled:opacity-60">{submitting ? '上传中...' : '发布作品'}</button>
            {error ? <p className="text-sm text-rose-300 md:col-span-2">{error}</p> : null}
          </form>
        ) : error ? <p className="mt-7 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-12 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button className={`rounded-full border px-5 py-2.5 text-sm transition hover:-translate-y-0.5 ${active === category ? 'border-amber-200 bg-amber-200 text-black' : 'border-white/15 text-zinc-300 hover:border-violet-200/50'}`} key={category} onClick={() => setActive(category)}>{category}</button>
          ))}
        </div>

        {loading ? <p className="mt-14 text-zinc-400">正在加载作品...</p> : visiblePhotos.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-dashed border-white/15 p-14 text-center text-zinc-400">这个分类还没有作品，等你来发布第一张。</div>
        ) : (
          <section className="gallery-grid mt-14 grid auto-rows-[220px] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visiblePhotos.map((photo, index) => (
              <FadeUp key={photo.id} delay={index * 0.04}><div className={index % 3 === 0 ? 'row-span-3' : 'row-span-2'}><PhotoCard canLike={Boolean(user)} photo={photo} onLike={toggleLike} /></div></FadeUp>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

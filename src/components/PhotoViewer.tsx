import { AnimatePresence, motion } from 'framer-motion'
import { Download, MessageCircle, RotateCcw, Send, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type PointerEvent, type WheelEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { GalleryPhoto } from './PhotoCard'

type Comment = {
  id: string
  content: string
  createdAt: string
  username: string
  displayName: string
}

type Point = { x: number; y: number }

const MIN_SCALE = 1
const MAX_SCALE = 5

export function PhotoViewer({ photo, onClose, initialCommentsOpen = false }: { photo: GalleryPhoto; onClose: () => void; initialCommentsOpen?: boolean }) {
  const { user } = useAuth()
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const dragRef = useRef<{ pointerId: number; x: number; y: number; origin: Point } | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!commentsOpen) return
    setCommentsLoading(true)
    fetch(`/api/photos/${photo.id}/comments`)
      .then(async (response) => {
        if (!response.ok) throw new Error('评论加载失败')
        setComments(await response.json())
      })
      .catch((error) => setCommentError(error instanceof Error ? error.message : '评论加载失败'))
      .finally(() => setCommentsLoading(false))
  }, [commentsOpen, photo.id])

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor))
    if (nextScale === scale) return
    if (nextScale === MIN_SCALE) {
      setScale(MIN_SCALE)
      setOffset({ x: 0, y: 0 })
      return
    }
    const viewerRect = event.currentTarget.getBoundingClientRect()
    const cursor = {
      x: event.clientX - (viewerRect.left + viewerRect.width / 2),
      y: event.clientY - (viewerRect.top + viewerRect.height / 2),
    }
    const imagePoint = {
      x: (cursor.x - offset.x) / scale,
      y: (cursor.y - offset.y) / scale,
    }
    setOffset({
      x: cursor.x - imagePoint.x * nextScale,
      y: cursor.y - imagePoint.y * nextScale,
    })
    setScale(nextScale)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose()
      return
    }
    if (!(event.target instanceof HTMLImageElement)) return
    if (scale <= MIN_SCALE || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: offset }
    setDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setOffset({ x: drag.origin.x + event.clientX - drag.x, y: drag.origin.y + event.clientY - drag.y })
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function resetView() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault()
    const content = commentText.trim()
    if (!content) return
    setCommentError('')
    try {
      const response = await fetch(`/api/photos/${photo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '评论发布失败')
      setComments((current) => [data, ...current])
      setCommentText('')
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : '评论发布失败')
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[100] flex bg-black/85 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.24 }} onClick={(event) => event.stopPropagation()} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <img
          draggable={false}
          className={`max-h-[88vh] max-w-[92vw] select-none object-contain will-change-transform ${scale > 1 ? dragging ? 'cursor-grabbing' : 'cursor-grab' : 'cursor-zoom-in'}`}
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`, transformOrigin: 'center' }}
          src={photo.imageUrl}
          alt={photo.title}
          onDoubleClick={resetView}
        />

        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-md">
          <span>{Math.round(scale * 100)}%</span>
          {scale > 1 ? <button aria-label="重置缩放" title="重置缩放" onClick={resetView}><RotateCcw size={16} /></button> : null}
        </div>

        <div className="absolute right-5 top-5 flex items-center gap-2" onPointerDown={(event) => event.stopPropagation()}>
          <a className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-md hover:bg-white hover:text-black" download href={photo.imageUrl} onClick={(event) => event.stopPropagation()}><Download size={17} />下载</a>
          <button className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-md hover:bg-white hover:text-black" onClick={() => setCommentsOpen((value) => !value)}><MessageCircle size={17} />评论</button>
          <button aria-label="关闭查看器" className="rounded-full border border-white/15 bg-black/60 p-2.5 text-white backdrop-blur-md hover:bg-white hover:text-black" onClick={(event) => { event.stopPropagation(); onClose() }}><X size={19} /></button>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs text-zinc-300 backdrop-blur-md">滚轮缩放 · 放大后拖拽 · ESC 关闭</div>
      </motion.div>

      <AnimatePresence>
        {commentsOpen ? (
          <motion.aside className="relative z-10 flex h-full w-full max-w-sm shrink-0 flex-col border-l border-white/10 bg-zinc-950/95 p-5" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.25 }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><div><p className="text-xs text-zinc-500">作品评论</p><h2 className="mt-1 text-xl text-white">{photo.title}</h2></div><button aria-label="关闭评论" className="text-zinc-400 hover:text-white" onClick={() => setCommentsOpen(false)}><X size={20} /></button></div>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
              {commentsLoading ? <p className="text-sm text-zinc-500">正在加载评论...</p> : comments.length === 0 ? <p className="text-sm text-zinc-500">还没有评论，来留下第一条吧。</p> : comments.map((comment) => <article className="rounded-xl border border-white/8 bg-white/[0.03] p-4" key={comment.id}><div className="flex items-center justify-between gap-3"><p className="text-sm text-amber-100">{comment.displayName}</p><time className="text-[11px] text-zinc-600">{new Date(comment.createdAt).toLocaleString('zh-CN')}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{comment.content}</p></article>)}
            </div>
            {commentError ? <p className="mb-3 text-sm text-rose-300">{commentError}</p> : null}
            {user ? <form className="mt-4 border-t border-white/10 pt-4" onSubmit={submitComment}><textarea className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/55 p-3 text-sm text-white outline-none focus:border-amber-200/50" maxLength={500} placeholder="写下你的评论..." value={commentText} onChange={(event) => setCommentText(event.target.value)} /><button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-200 px-4 py-2.5 text-sm font-medium text-black"><Send size={16} />发布评论</button></form> : <Link className="mt-4 block rounded-full bg-amber-200 px-4 py-3 text-center text-sm font-medium text-black" state={{ from: '/gallery' }} to="/auth">登录后发表评论</Link>}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

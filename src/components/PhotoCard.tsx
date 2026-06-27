import { ArrowUpRight, Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export type GalleryPhoto = {
  id: string
  title: string
  description: string
  category: string
  imageUrl: string
  likeCount: number
  liked: boolean
  score: number | null
  analysisId: string | null
  user: { username: string; displayName: string }
}

type PhotoCardProps = {
  photo: GalleryPhoto
  canLike: boolean
  onLike: (photoId: string) => void
  showLike?: boolean
  onOpen?: (photo: GalleryPhoto) => void
  onComment?: (photo: GalleryPhoto) => void
}

export function PhotoCard({ photo, canLike, onLike, showLike = true, onOpen, onComment }: PhotoCardProps) {
  return (
    <article className={`group relative h-full min-h-[430px] overflow-hidden rounded-md border border-white/10 bg-zinc-950 ${onOpen ? 'cursor-zoom-in' : ''}`} onDoubleClick={(event) => {
      if ((event.target as HTMLElement).closest('button, a')) return
      onOpen?.(photo)
    }}>
      <img className="h-full w-full object-cover transition duration-700 group-hover:scale-105" draggable={false} src={photo.imageUrl} alt={photo.title} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 transition group-hover:opacity-95" />
      {showLike || onComment ? <div className="absolute right-4 top-4 flex items-center gap-2">
        {onComment ? <button title="查看评论" className="inline-flex items-center rounded-full border border-white/20 bg-black/35 p-2 text-white backdrop-blur-md transition hover:border-amber-200/60 hover:text-amber-100" onClick={() => onComment(photo)}><MessageCircle size={17} /></button> : null}
        {showLike ? <button disabled={!canLike} title={canLike ? '点赞' : '登录后可点赞'} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur-md transition ${photo.liked ? 'border-rose-300/60 bg-rose-400/20 text-rose-200' : 'border-white/20 bg-black/35 text-white'} disabled:cursor-not-allowed disabled:opacity-60`} onClick={() => onLike(photo.id)}>
          <Heart fill={photo.liked ? 'currentColor' : 'none'} size={17} /> {photo.likeCount}
        </button> : null}
      </div> : null}
      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-5 transition duration-500 group-hover:translate-y-0">
        <div className="mb-3 flex items-center justify-between text-sm text-zinc-300"><span>{photo.category}</span>{photo.score !== null ? <span className="text-amber-200">{photo.score} 分</span> : null}</div>
        <h3 className="text-2xl font-medium text-white">{photo.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{photo.description || `摄影师 ${photo.user.displayName} 的作品`}</p>
        <p className="mt-3 text-xs text-zinc-500">@{photo.user.username}</p>
        {photo.analysisId ? <Link className="mt-4 inline-flex items-center gap-2 text-sm text-amber-100" to={`/result?id=${photo.analysisId}`}>查看分析 <ArrowUpRight size={16} /></Link> : null}
      </div>
    </article>
  )
}

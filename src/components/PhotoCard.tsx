import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type PhotoCardProps = {
  photo: {
    title: string
    category: string
    score: number
    tags: string[]
    image: string
  }
}

export function PhotoCard({ photo }: PhotoCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-md border border-white/10 bg-zinc-950">
      <img
        className="aspect-[4/5] h-full w-full object-cover transition duration-700 group-hover:scale-105"
        src={photo.image}
        alt={photo.title}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent opacity-70 transition group-hover:opacity-95" />
      <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-90 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="mb-3 flex items-center justify-between text-sm text-zinc-300">
          <span>{photo.category}</span>
          <span className="text-amber-200">{photo.score} 分</span>
        </div>
        <h3 className="text-2xl font-medium text-white">{photo.title}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {photo.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">
              {tag}
            </span>
          ))}
        </div>
        <Link
          className="mt-5 inline-flex items-center gap-2 text-sm text-amber-100"
          to="/result"
        >
          查看分析 <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  )
}

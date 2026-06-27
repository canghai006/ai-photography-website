import { useMemo, useState } from 'react'
import { FadeUp } from '../components/Animated'
import { PhotoCard } from '../components/PhotoCard'
import { photos } from '../data/mock'

const categories = ['全部', '人像', '风光', '街头', '建筑', '黑白', '电影感', '胶片']

export function Gallery() {
  const [active, setActive] = useState('全部')
  const visiblePhotos = useMemo(
    () =>
      active === '全部'
        ? photos
        : photos.filter((photo) => photo.category === active || photo.tags.includes(active)),
    [active],
  )

  return (
    <main className="min-h-screen bg-black px-6 pb-24 pt-36 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <FadeUp>
          <p className="text-sm tracking-[0.35em] text-amber-100/80">公开摄影作品</p>
          <h1 className="mt-5 max-w-4xl text-6xl font-medium leading-tight text-white md:text-7xl">摄影作品集</h1>
        </FadeUp>

        <div className="mt-12 flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              className={`rounded-full border px-5 py-2.5 text-sm transition hover:-translate-y-0.5 ${
                active === category
                  ? 'border-amber-200 bg-amber-200 text-black'
                  : 'border-white/15 text-zinc-300 hover:border-violet-200/50'
              }`}
              key={category}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <section className="mt-14 grid auto-rows-[220px] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visiblePhotos.map((photo, index) => (
            <FadeUp key={photo.id} delay={index * 0.06}>
              <div className={index % 3 === 0 ? 'row-span-3' : 'row-span-2'}>
                <PhotoCard photo={photo} />
              </div>
            </FadeUp>
          ))}
        </section>
      </div>
    </main>
  )
}

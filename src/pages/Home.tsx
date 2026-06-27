import { motion, useScroll, useTransform, type Variants } from 'framer-motion'
import { Camera, Crop, Download, Eye, Lightbulb, Palette, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DriftReveal, ImageReveal, SectionIntro, cardReveal, smoothEase, staggerContainer } from '../components/Animated'
import { PhotoCard } from '../components/PhotoCard'
import { ScoreBar } from '../components/ScoreBar'
import { demoImage, features, photos, reportBlocks, scores } from '../data/mock'

const icons = [Crop, Lightbulb, Palette, Eye, Download, Star]
const marqueePhotos = [...photos, ...photos]

const heroLine: Variants = {
  hidden: { opacity: 0, y: 92 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.35, ease: smoothEase },
  },
}

const heroDetail: Variants = {
  hidden: { opacity: 0, y: 72 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.25, ease: smoothEase },
  },
}

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const demoRef = useRef<HTMLElement>(null)
  const showPreview = false
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroTextOpacity = useTransform(heroScroll, [0, 0.46, 0.88], [1, 0.82, 0])
  const heroTextY = useTransform(heroScroll, [0, 1], [0, -72])

  useEffect(() => {
    videoRef.current?.play().catch(() => undefined)
  }, [])

  return (
    <>
      <section ref={heroRef} className="relative min-h-screen overflow-hidden bg-black">
        <motion.video
          ref={videoRef}
          autoPlay
          className="absolute inset-0 z-0 h-full w-full object-cover"
          initial={{ scale: 1.08, filter: 'brightness(1) saturate(0.95)' }}
          animate={{ scale: 1.02, filter: 'brightness(1) saturate(1)' }}
          transition={{ duration: 4, ease: smoothEase }}
          loop
          muted
          onCanPlay={() => videoRef.current?.play().catch(() => undefined)}
          playsInline
          preload="auto"
        >
          <source src="/media/hero-video.mp4?v=4" type="video/mp4" />
        </motion.video>
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/22 to-black/28" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/84 via-transparent to-black/22" />

        <motion.div
          className="relative z-20 mx-auto min-h-screen max-w-[1700px] px-6 lg:px-10"
          style={{ opacity: heroTextOpacity, y: heroTextY }}
        >
          <motion.div className="relative flex min-h-screen items-center justify-center">
            <div className="hidden">
              <div>
                <motion.p className="mb-6 text-sm tracking-[0.35em] text-amber-100/80" variants={heroLine}>
                  专业摄影作品智能点评
                </motion.p>
              </div>
              <h1 className="max-w-5xl text-6xl font-medium leading-none text-white md:text-8xl">
                <span className="block">
                  <motion.span className="block" variants={heroLine}>
                    AI 摄影分析
                  </motion.span>
                </span>
              </h1>
              <motion.p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300" variants={heroDetail}>
                上传你的摄影作品，AI 将从构图、光影、色彩和情绪表达，为你生成专业摄影点评报告。
              </motion.p>
              <motion.div className="mt-10 flex flex-wrap gap-4" variants={heroDetail}>
                <Link className="rounded-full bg-amber-200 px-7 py-4 font-medium text-black transition duration-300 hover:-translate-y-1 hover:bg-violet-300 hover:text-black hover:shadow-[0_0_42px_rgba(196,181,253,0.45)]" to="/analyze">
                  上传作品开始分析
                </Link>
                <Link className="rounded-full border border-white/20 bg-white/0 px-7 py-4 text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:bg-amber-200 hover:text-black hover:shadow-[0_0_36px_rgba(253,230,138,0.28)]" to="/result">
                  查看示例报告
                </Link>
              </motion.div>
            </div>

            <motion.div
              className="absolute left-0 top-28 flex max-w-sm flex-col items-start text-left md:top-36"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 1.6, ease: smoothEase }}
            >
              <p className="text-sm font-semibold tracking-[0.32em] text-amber-100/65 md:text-base">
                INTELLIGENT CRITIQUE
              </p>

              <p className="mt-5 font-serif text-3xl font-semibold leading-tight text-white/80 md:text-5xl">
                影析AI深度点评
              </p>
              <p className="mt-6 max-w-sm text-sm leading-7 text-zinc-300/70 md:text-base">
                上传一张照片，从构图、光影、色彩与情绪中，找到更清晰的创作方向。
              </p>
              <Link
                className="mt-7 inline-flex rounded-full bg-amber-200 px-7 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-black transition duration-300 hover:-translate-y-1 hover:bg-white"
                to="/analyze"
              >
                开始分析
              </Link>
            </motion.div>

            <motion.h1
              className="max-w-6xl text-center font-serif text-6xl font-semibold leading-[0.84] text-white [text-shadow:0_0_34px_rgba(255,255,255,0.24)] md:text-8xl lg:text-[9.5rem]"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 1, ease: smoothEase }}
            >
              PhotoVision
            </motion.h1>

            <motion.div
              className="absolute inset-x-0 bottom-5 text-right md:bottom-12"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 1.6, ease: smoothEase }}
            >
              <p className="ml-auto max-w-md text-sm leading-7 tracking-[0.06em] text-zinc-300/65 md:text-base">
                核心能力：专业影像解析、作品归档与作品画廊系统
              </p>
            </motion.div>

            {showPreview && (
              <motion.div
                className="ml-auto w-full max-w-md border border-white/15 bg-black/35 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl"
                initial={{ opacity: 0, x: 80, scaleX: 0.86, filter: 'blur(18px)' }}
                animate={{ opacity: 1, x: 0, scaleX: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, ease: smoothEase }}
              >
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">综合评分</p>
                    <p className="mt-2 text-5xl font-medium text-white">
                      86 <span className="text-lg text-zinc-400">/ 100</span>
                    </p>
                  </div>
                  <Camera className="text-amber-100" size={34} />
                </div>
                <div className="space-y-5">
                  {Object.entries(scores).slice(0, 4).map(([label, value]) => (
                    <ScoreBar key={label} label={label} value={value} />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </section>

      <section id="features" className="features-section cloudscape-page-bg relative overflow-hidden px-6 py-16 lg:px-10 lg:py-20">
        <div className="features-vignette" aria-hidden="true" />
        <div className="features-lens-flare" aria-hidden="true" />
        <div className="features-grain" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1700px]">
          <div className="max-w-6xl">
            <DriftReveal>
              <p className="text-sm tracking-[0.42em] text-amber-100/70">影析AI点评</p>
            </DriftReveal>
            <DriftReveal delay={0.12}>
              <h2 className="mt-3 text-4xl font-medium leading-[1.08] text-white md:text-5xl lg:text-6xl">
                让 AI 读懂你的每一张照片
              </h2>
            </DriftReveal>
            <DriftReveal delay={0.2}>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300/70 md:text-base md:leading-8">
                从构图、光影、色彩到情绪表达，为你的摄影作品生成专业分析与优化建议。
              </p>
            </DriftReveal>
          </div>

          <DriftReveal delay={0.28} className="mt-7 lg:mt-8">
            <div className="analysis-flow" aria-label="摄影作品分析流程">
              {['上传照片', 'AI 分析', '获得建议', '优化作品'].map((step, index) => (
                <div className="analysis-flow-step" key={step}>
                  <span className="analysis-flow-dot">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </DriftReveal>

          <div className="mt-8 flex items-center gap-4">
            <span className="text-xs tracking-[0.32em] text-amber-100/65">核心能力</span>
            <span className="h-px flex-1 bg-gradient-to-r from-amber-100/25 to-transparent" />
          </div>
          <motion.div
            className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '0px 0px -8% 0px', amount: 0.12 }}
            variants={staggerContainer}
          >
            {features.slice(0, 3).map(([number, title, text], index) => {
              const Icon = icons[index]
              return (
                <motion.article
                  className="feature-card feature-card-core group min-h-48 origin-bottom p-6 md:p-7"
                  key={title}
                  variants={cardReveal}
                  whileHover={{ y: -8, scale: 1.045, transition: { duration: 0.42, ease: smoothEase } }}
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="text-sm tracking-[0.3em] text-zinc-500">{number}</span>
                    <span className="feature-icon-shell">
                      <Icon className="feature-icon text-amber-100" size={27} />
                    </span>
                  </div>
                  <div className="relative z-10 mt-8">
                    <h3 className="text-2xl font-medium text-white">{title}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-300/65">{text}</p>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>

          <div className="mt-7 flex items-center gap-4">
            <span className="text-xs tracking-[0.32em] text-zinc-400/80">辅助能力</span>
            <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          </div>
          <motion.div
            className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '0px 0px -8% 0px', amount: 0.12 }}
            variants={staggerContainer}
          >
            {features.slice(3).map(([number, title, text], index) => {
              const Icon = icons[index + 3]
              return (
                <motion.article
                  className="feature-card group min-h-44 origin-bottom p-6 md:p-7"
                  key={title}
                  variants={cardReveal}
                  whileHover={{ y: -8, scale: 1.045, transition: { duration: 0.42, ease: smoothEase } }}
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="text-sm tracking-[0.3em] text-zinc-600">{number}</span>
                    <span className="feature-icon-shell feature-icon-shell-muted">
                      <Icon className="feature-icon text-zinc-300" size={25} />
                    </span>
                  </div>
                  <div className="relative z-10 mt-7">
                    <h3 className="text-xl font-medium text-zinc-100">{title}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400/75">{text}</p>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <section ref={demoRef} className="cloudscape-page-bg px-6 py-32 lg:px-10">
        <div className="mx-auto grid max-w-[1700px] items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <ImageReveal className="min-h-[620px]" src={demoImage} alt="示例摄影作品" targetRef={demoRef} />
          <div>
            <SectionIntro kicker="SAMPLE REPORT" title="一份可继续创作的专业反馈" />
            <motion.div className="mt-10 border border-white/10 bg-black/55 p-8 backdrop-blur-xl" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
              <motion.div className="grid gap-4 sm:grid-cols-2" variants={cardReveal}>
                {Object.entries(scores).map(([label, value]) => (
                  <ScoreBar key={label} label={label} value={value} />
                ))}
              </motion.div>
              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {reportBlocks.slice(0, 6).map((block) => (
                  <motion.div key={block.title} className="border-t border-white/10 pt-5" variants={cardReveal}>
                    <h3 className="text-lg text-amber-100">{block.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">{block.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="cloudscape-page-bg overflow-hidden py-32">
        <div className="mx-auto max-w-[1700px] px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <SectionIntro kicker="PUBLIC GALLERY" title="公开摄影作品集预览" />
            <DriftReveal delay={0.18}>
              <Link className="text-amber-100 transition hover:text-white" to="/gallery">
                查看全部作品
              </Link>
            </DriftReveal>
          </div>
        </div>
        <motion.div className="relative mt-16" initial={{ opacity: 0, y: 80, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 1.2, ease: smoothEase }}>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-black to-transparent" />
          <div className="flex w-max animate-galleryMarquee gap-5 pr-5">
            {marqueePhotos.map((photo, index) => (
              <div className="w-[320px] shrink-0 md:w-[390px]" key={`${photo.id}-${index}`}>
                <PhotoCard photo={photo} />
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="cloudscape-page-bg relative overflow-hidden px-6 py-36 lg:px-10">
        <div className="mx-auto max-w-[1200px] text-center">
          <SectionIntro align="center" kicker="START ANALYSIS" title="让每一张照片，都知道自己还能怎么变得更好。" />
          <DriftReveal delay={0.18} className="mt-10">
            <Link className="inline-flex rounded-full bg-white px-8 py-4 font-medium text-black transition duration-300 hover:-translate-y-1 hover:bg-violet-300" to="/analyze">
              上传作品开始分析
            </Link>
          </DriftReveal>
        </div>
      </section>
    </>
  )
}

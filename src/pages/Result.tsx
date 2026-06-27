import { Download, ImageDown, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FadeUp } from '../components/Animated'
import { Aurora } from '../components/Aurora'
import { BorderGlow } from '../components/BorderGlow'
import { ScoreBar } from '../components/ScoreBar'
import type { AnalysisRecord } from '../types/analysis'

const sectionOrder = ['作品亮点', '构图分析', '光影分析', '色彩分析', '情绪表达', '改进建议']

export function Result() {
  const [searchParams] = useSearchParams()
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAnalysis() {
      const id = searchParams.get('id') || localStorage.getItem('latest-analysis-id')
      const url = id ? `/api/analyses/${id}` : '/api/analyses/latest'

      try {
        const response = await fetch(url)
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || '读取分析结果失败')
        }
        const data = (await response.json()) as AnalysisRecord
        setAnalysis(data)
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '读取分析结果失败')
      } finally {
        setLoading(false)
      }
    }

    void loadAnalysis()
  }, [searchParams])

  return (
    <main className="result-page cloudscape-page-bg relative min-h-screen overflow-hidden px-6 pb-24 pt-36 lg:px-10">
      <div className="absolute inset-0 opacity-25" aria-hidden="true">
        <Aurora amplitude={1.05} blend={0.48} colorStops={['#38bdf8', '#7cff67', '#5227FF']} speed={0.4} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,.68)_68%)]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-[1700px]">
        {loading ? (
          <div className="py-24 text-zinc-300">正在加载分析结果...</div>
        ) : error || !analysis ? (
          <div className="py-24 text-rose-300">{error || '暂无分析结果'}</div>
        ) : (
          <>
            <FadeUp>
              <p className="text-sm tracking-[0.35em] text-violet-200">摄影分析报告</p>
              <div className="mt-5 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <h1 className="page-title text-6xl font-medium text-white md:text-7xl">摄影分析报告</h1>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {analysis.tags.map((tag) => (
                      <span className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {analysis.source === 'mock' && analysis.error ? (
                    <p className="mt-4 text-sm text-amber-200/80">Ark 分析暂时失败，当前显示的是本地兜底结果。</p>
                  ) : null}
                </div>
                <div className="text-6xl font-medium text-amber-100">
                  {analysis.overallScore} <span className="text-xl text-zinc-500">/ 100</span>
                </div>
              </div>
            </FadeUp>

            <div className="result-summary mt-16 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <FadeUp>
                <BorderGlow animated borderRadius={8} backgroundColor="#050507" glowColor="264 90 78">
                  <img className="result-image h-[720px] w-full object-cover" src={analysis.imageUrl} alt={analysis.filename} />
                </BorderGlow>
              </FadeUp>
              <FadeUp delay={0.12}>
                <BorderGlow animated borderRadius={8} backgroundColor="#08080b" glowColor="40 90 78">
                  <div className="h-full p-8">
                    <h2 className="text-3xl font-medium text-white">评分维度</h2>
                    <div className="mt-10 space-y-7">
                      {Object.entries(analysis.scores).map(([label, value]) => (
                        <ScoreBar key={label} label={label} value={value} />
                      ))}
                    </div>
                  </div>
                </BorderGlow>
              </FadeUp>
            </div>

            <section className="result-details mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sectionOrder.map((title, index) => (
                <FadeUp key={title} delay={index * 0.06}>
                  <BorderGlow borderRadius={8} backgroundColor="#080808" glowColor={index % 2 ? '264 90 78' : '40 90 78'} glowIntensity={0.65}>
                    <article className="min-h-60 p-7">
                      <h3 className="text-2xl font-medium text-amber-100">{title}</h3>
                      <p className="mt-5 leading-8 text-zinc-400">{analysis.sections[title] || '暂无内容'}</p>
                    </article>
                  </BorderGlow>
                </FadeUp>
              ))}
            </section>

            <BorderGlow borderRadius={8} className="mt-16 inline-block" backgroundColor="#07070a" glowColor="210 90 72" glowIntensity={0.68}>
              <div className="flex flex-wrap gap-4 p-4">
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-black transition hover:-translate-y-1 hover:bg-amber-100">
                  <Download size={18} /> 导出报告
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-white transition hover:-translate-y-1 hover:border-amber-200/50">
                  <ImageDown size={18} /> 分享长图
                </button>
                <Link className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-white transition hover:-translate-y-1 hover:border-violet-200/50" to="/analyze">
                  <RotateCcw size={18} /> 再次分析
                </Link>
              </div>
            </BorderGlow>
          </>
        )}
      </div>
    </main>
  )
}

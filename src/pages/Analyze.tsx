import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, Loader2, Upload } from 'lucide-react'
import { type ChangeEvent, type CSSProperties, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BorderGlow } from '../components/BorderGlow'
import type { AnalysisRecord } from '../types/analysis'

const loadingSteps = ['正在分析构图...', '正在读取光影...', '正在理解色彩情绪...', '正在生成改进建议...']
const loadingStepDelays = [0, 4000, 12000, 30000]

export function Analyze() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const currentText = useMemo(() => loadingSteps[Math.min(step, loadingSteps.length - 1)], [step])

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    if (nextFile.size > MAX_FILE_SIZE) {
      setError(`文件过大（${(nextFile.size / 1024 / 1024).toFixed(1)} MB），最大支持 50 MB，请压缩后重新上传`)
      setFile(null)
      setPreview('')
      return
    }
    setFile(nextFile)
    setPreview(URL.createObjectURL(nextFile))
    setError('')
  }

  async function startAnalysis() {
    if (!file) return
    setLoading(true)
    setError('')
    setStep(0)
    const loadingTimers = loadingStepDelays.map((delay, index) => window.setTimeout(() => setStep(index), delay))
    const controller = new AbortController()
    const requestTimeout = window.setTimeout(() => controller.abort(), 120000)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = data.error || `上传失败 (HTTP ${response.status})，请稍后再试`
        throw new Error(errorMsg)
      }

      const analysis = (await response.json()) as AnalysisRecord
      localStorage.setItem('latest-analysis-id', analysis.id)
      navigate(`/result?id=${analysis.id}`)
    } catch (requestError) {
      const message = requestError instanceof DOMException && requestError.name === 'AbortError'
        ? '分析等待时间过长，请稍后重试或换一张较小的照片'
        : requestError instanceof Error ? requestError.message : '上传失败，请稍后再试'
      setError(message)
      setLoading(false)
      setStep(0)
    } finally {
      loadingTimers.forEach(window.clearTimeout)
      window.clearTimeout(requestTimeout)
    }
  }

  return (
    <main
      className="analyze-page analysis-page-bg cloudscape-page-bg relative min-h-screen overflow-hidden px-6 pb-24 pt-36 lg:px-10"
      style={{
        '--analysis-photo': preview ? `url("${preview}")` : 'url("/media/features-cloudscape.png")',
      } as CSSProperties}
    >
      <div className="relative z-10 mx-auto max-w-[1700px]">
        <motion.div className="analyze-heading" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>
          <p className="text-sm tracking-[0.35em] text-amber-100/80">上传分析</p>
          <h1 className="mt-5 text-6xl font-medium text-white md:text-7xl">上传你的摄影作品</h1>
        </motion.div>

        <div className="analyze-grid mt-16 grid gap-8 lg:grid-cols-[1fr_0.7fr]">
          <BorderGlow
            borderRadius={8}
            className={`analyze-frame min-h-[560px] ${preview ? 'analyze-frame-uploaded' : ''}`}
            colors={['#d8c99a', '#f4f1e8', '#b7b1a0']}
            edgeSensitivity={30}
            glowColor="42 70 78"
            backgroundColor="#07070a"
            glowIntensity={0.72}
            glowRadius={12}
            fillOpacity={0.06}
          >
            <label className="analyze-upload-label group flex min-h-[560px] cursor-pointer flex-col items-center justify-center bg-transparent p-8 text-center">
              {preview ? (
                <img className="max-h-[520px] w-full object-contain" src={preview} alt="上传图片预览" />
              ) : (
                <>
                  <ImagePlus className="text-amber-100 transition group-hover:-translate-y-1" size={48} />
                  <h2 className="mt-8 text-3xl text-white">拖拽照片到这里</h2>
                  <p className="mt-4 text-zinc-400">支持 JPG / PNG / WEBP</p>
                  <span className="mt-8 inline-flex rounded-full border border-white/15 px-6 py-3 text-zinc-200">选择图片</span>
                </>
              )}
              <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} type="file" />
            </label>
          </BorderGlow>

          <BorderGlow
            borderRadius={8}
            className={`analyze-frame ${preview ? 'analyze-frame-uploaded' : ''}`}
            colors={['#d8c99a', '#f4f1e8', '#b7b1a0']}
            edgeSensitivity={30}
            glowColor="42 70 78"
            backgroundColor="#09090c"
            glowIntensity={0.72}
            glowRadius={12}
            fillOpacity={0.06}
          >
            <aside className="h-full p-8">
              <Upload className="text-violet-200" size={32} />
              <h2 className="mt-8 text-3xl font-medium text-white">分析前预览</h2>
              <p className="mt-4 leading-7 text-zinc-400">上传后会模拟生成专业摄影点评报告，包含评分、风格标签和改进建议。</p>
              <button
                className="mt-10 w-full rounded-full bg-amber-200 px-7 py-4 font-medium text-black transition hover:-translate-y-1 hover:bg-violet-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                disabled={!file || loading}
                onClick={startAnalysis}
              >
                {loading ? '分析中...' : '开始分析'}
              </button>

              {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

              <AnimatePresence>
                {loading && (
                  <motion.div
                    className="mt-10 border border-white/10 bg-black/60 p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <div className="flex items-center gap-3 text-amber-100">
                      <Loader2 className="animate-spin" size={20} />
                      <span>{currentText}</span>
                    </div>
                    <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-200 to-violet-300"
                        animate={{ width: `${((step + 1) / loadingSteps.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>
          </BorderGlow>
        </div>
      </div>
    </main>
  )
}

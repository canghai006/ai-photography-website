import { motion } from 'framer-motion'
import { Camera, LogIn, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BorderGlow } from '../components/BorderGlow'
import { useAuth } from '../context/AuthContext'

export function Auth() {
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ login: '', username: '', displayName: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) return <Navigate replace to="/profile" />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'login') await login(form.login, form.password)
      else await register({ username: form.username, displayName: form.displayName, email: form.email, password: form.password })
      const next = (location.state as { from?: string } | null)?.from || '/profile'
      navigate(next, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="cloudscape-page-bg min-h-screen px-6 pb-24 pt-32 lg:px-10">
      <motion.div className="mx-auto max-w-xl" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 text-center">
          <Camera className="mx-auto text-amber-100" size={34} />
          <h1 className="mt-5 text-4xl font-medium text-white">{mode === 'login' ? '欢迎回来' : '创建摄影师账号'}</h1>
          <p className="mt-3 text-zinc-400">登录后保存你的照片、分析记录与作品集互动。</p>
        </div>
        <BorderGlow animated borderRadius={18} backgroundColor="#08090b" glowColor="40 90 78">
          <form className="space-y-5 p-7 md:p-9" onSubmit={submit}>
            {mode === 'login' ? (
              <label className="block text-sm text-zinc-300">用户名或邮箱
                <input required className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-amber-200/60" value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} />
              </label>
            ) : (
              <>
                <label className="block text-sm text-zinc-300">用户名
                  <input required minLength={3} maxLength={24} className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-amber-200/60" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
                </label>
                <label className="block text-sm text-zinc-300">显示名称
                  <input required className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-amber-200/60" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
                </label>
                <label className="block text-sm text-zinc-300">邮箱
                  <input required type="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-amber-200/60" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </label>
              </>
            )}
            <label className="block text-sm text-zinc-300">密码
              <input required minLength={8} type="password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white outline-none focus:border-amber-200/60" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-200 px-6 py-3.5 font-medium text-black transition hover:bg-amber-100 disabled:opacity-60">
              {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {submitting ? '请稍候...' : mode === 'login' ? '登录' : '注册并登录'}
            </button>
            <button type="button" className="w-full text-sm text-zinc-400 hover:text-white" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
              {mode === 'login' ? '还没有账号？立即注册' : '已有账号？返回登录'}
            </button>
          </form>
        </BorderGlow>
        <Link className="mt-7 block text-center text-sm text-zinc-500 hover:text-zinc-300" to="/">返回首页</Link>
      </motion.div>
    </main>
  )
}

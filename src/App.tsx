import Lenis from 'lenis'
import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { AuthProvider } from './context/AuthContext'

const Analyze = lazy(() => import('./pages/Analyze').then((module) => ({ default: module.Analyze })))
const Gallery = lazy(() => import('./pages/Gallery').then((module) => ({ default: module.Gallery })))
const Result = lazy(() => import('./pages/Result').then((module) => ({ default: module.Result })))
const Auth = lazy(() => import('./pages/Auth').then((module) => ({ default: module.Auth })))
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })))
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })))

function App() {
  const location = useLocation()

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true })
    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])

  return (
    <AuthProvider><div className="min-h-screen bg-black text-white">
      <Navbar />
      <Suspense fallback={<main className="min-h-screen bg-black pt-32 text-center text-zinc-400">正在加载页面...</main>}>
        <Routes>
          <Route element={<Home />} path="/" />
          <Route element={<Analyze />} path="/analyze" />
          <Route element={<Result />} path="/result" />
          <Route element={<Gallery />} path="/gallery" />
          <Route element={<Auth />} path="/auth" />
          <Route element={<Profile />} path="/profile" />
          <Route element={<Admin />} path="/admin" />
        </Routes>
      </Suspense>
      <Footer />
    </div></AuthProvider>
  )
}

export default App

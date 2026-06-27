import Lenis from 'lenis'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { Analyze } from './pages/Analyze'
import { Gallery } from './pages/Gallery'
import { Home } from './pages/Home'
import { Result } from './pages/Result'
import { Auth } from './pages/Auth'
import { Profile } from './pages/Profile'
import { AuthProvider } from './context/AuthContext'

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
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <AuthProvider><div className="min-h-screen bg-black text-white">
      <Navbar />
      <Routes>
        <Route element={<Home />} path="/" />
        <Route element={<Analyze />} path="/analyze" />
        <Route element={<Result />} path="/result" />
        <Route element={<Gallery />} path="/gallery" />
        <Route element={<Auth />} path="/auth" />
        <Route element={<Profile />} path="/profile" />
      </Routes>
      <Footer />
    </div></AuthProvider>
  )
}

export default App

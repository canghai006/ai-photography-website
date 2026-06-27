import { Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  ['首页', '/'],
  ['上传分析', '/analyze'],
  ['作品集', '/gallery'],
  ['功能介绍', '/#features'],
  ['关于我们', '/#about'],
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, loading } = useAuth()

  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/35 shadow-2xl shadow-black/20 backdrop-blur-2xl transition duration-500">
      <div className="mx-auto flex h-20 max-w-[1700px] items-center justify-between px-6 lg:px-10">
        <Link className="text-lg font-semibold tracking-[0.28em] text-white" to="/">
          影析 AI
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map(([label, to]) => (
            <NavLink
              className={({ isActive }) =>
                `text-sm tracking-widest transition hover:text-amber-100 ${
                  isActive && !to.includes('#') ? 'text-amber-100' : 'text-zinc-300'
                }`
              }
              key={label}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <Link className="hidden items-center gap-2 rounded-full border border-amber-200/40 px-5 py-2.5 text-sm text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-200 hover:text-black lg:inline-flex" to={user ? '/profile' : '/auth'}>
          <UserRound size={16} /> {loading ? '账号' : user ? user.displayName : '登录 / 注册'}
        </Link>
        <button className="rounded-full border border-white/15 p-2 text-white lg:hidden" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-black/90 px-6 py-6 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-5">
            {navItems.map(([label, to]) => (
              <NavLink key={label} onClick={() => setOpen(false)} to={to} className="text-zinc-200">
                {label}
              </NavLink>
            ))}
            <NavLink onClick={() => setOpen(false)} to={user ? '/profile' : '/auth'} className="text-amber-100">
              {user ? `个人中心 · ${user.displayName}` : '登录 / 注册'}
            </NavLink>
          </div>
        </div>
      )}
    </header>
  )
}

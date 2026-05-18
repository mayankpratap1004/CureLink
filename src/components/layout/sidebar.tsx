'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Stethoscope, LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { getNavItemsForRole } from './nav-items'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/types/app'

interface SidebarProps { user: CurrentUser }

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-300',
  doctor: 'bg-cyan-500/20 text-cyan-300',
  receptionist: 'bg-green-500/20 text-green-300',
  patient: 'bg-orange-500/20 text-orange-300',
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getNavItemsForRole(user.role)

  const initials = user.full_name
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    window.location.href = '/api/auth/signout'
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-4 h-4 text-slate-900" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight">CureLink</p>
          <p className="text-xs text-slate-500 leading-tight truncate">Hospital Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-cyan-400' : 'text-slate-500')} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-cyan-400/60" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl bg-slate-800/50">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-cyan-400">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium capitalize', ROLE_COLORS[user.role])}>
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     text-slate-500 hover:bg-red-500/10 hover:text-red-400 w-full transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex lg:flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cyan-400 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-3.5 h-3.5 text-slate-900" />
          </div>
          <span className="text-white font-bold text-sm">CureLink</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-400 hover:text-white p-2">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
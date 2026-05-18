'use client'

import { Bell } from 'lucide-react'
import type { CurrentUser } from '@/types/app'

interface TopbarProps {
  user: CurrentUser
  title?: string
}

export function Topbar({ user, title }: TopbarProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-sm font-semibold text-slate-800 hidden sm:block">{title}</h1>
        )}
        <span className="text-xs text-slate-400 hidden md:block">{today}</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center">
            <span className="text-xs font-bold text-cyan-600">
              {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-700 leading-tight">{user.full_name.split(' ')[0]}</p>
            <p className="text-xs text-slate-400 capitalize leading-tight">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
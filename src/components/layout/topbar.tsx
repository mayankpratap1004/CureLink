'use client'

import { Bell } from 'lucide-react'
import type { CurrentUser } from '@/types/app'

interface TopbarProps {
  user: CurrentUser
  title?: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  doctor: 'bg-blue-100 text-blue-700',
  receptionist: 'bg-green-100 text-green-700',
  patient: 'bg-orange-100 text-orange-700',
}

export function Topbar({ user, title }: TopbarProps) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div>
        {title && (
          <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
          {user.role}
        </span>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
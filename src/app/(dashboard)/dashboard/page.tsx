import { getCurrentUser } from '@/services/auth.service'
import {
  Users, UserCog, CalendarDays, ListOrdered,
  TrendingUp, Clock, CheckCircle, AlertCircle,
} from 'lucide-react'

const stats = [
  { label: 'Total Patients',      value: '0', icon: Users,        color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { label: 'Doctors on Duty',     value: '0', icon: UserCog,      color: 'text-green-600',  bg: 'bg-green-50'  },
  { label: "Today's Appointments",value: '0', icon: CalendarDays, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Queue Waiting',       value: '0', icon: ListOrdered,  color: 'text-orange-600', bg: 'bg-orange-50' },
]

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Good morning, {user?.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Here is what is happening at your hospital today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick status cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Activity</h2>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No activity yet</p>
            <p className="text-xs text-slate-300 mt-1">Data will appear once you start adding patients</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Queue Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Waiting',       value: 0, icon: Clock,         color: 'text-orange-500' },
              { label: 'In Progress',   value: 0, icon: AlertCircle,   color: 'text-blue-500'   },
              { label: 'Completed',     value: 0, icon: CheckCircle,   color: 'text-green-500'  },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Setup checklist — shows until hospital has data */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-blue-800 mb-3">🚀 Setup checklist</h2>
        <div className="space-y-2">
          {[
            { label: 'Add your first department', href: '/departments' },
            { label: 'Add doctors to your hospital', href: '/doctors' },
            { label: 'Register your first patient', href: '/patients/new' },
            { label: 'Book an appointment', href: '/appointments/new' },
          ].map(item => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
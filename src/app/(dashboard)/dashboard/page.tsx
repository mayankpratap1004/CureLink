'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import {
  Users, UserCog, CalendarDays, ListOrdered,
  TrendingUp, Clock, CheckCircle, AlertCircle,
  Building2, ArrowRight,
} from 'lucide-react'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Stats {
  patients: number
  doctors: number
  todayAppointments: number
  queueWaiting: number
  queueInProgress: number
  queueCompleted: number
  recentPatients: {
    id: string
    full_name: string
    patient_code: string
    phone: string
    created_at: string
  }[]
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: patients },
      { count: doctors },
      { count: todayAppointments },
      { count: queueWaiting },
      { count: queueInProgress },
      { count: queueCompleted },
      { data: recentPatients },
    ] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).is('deleted_at', null),
      supabase.from('doctors').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('is_active', true).is('deleted_at', null),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('appointment_date', today).is('deleted_at', null),
      supabase.from('queue_entries').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('queue_date', today).eq('status', 'waiting'),
      supabase.from('queue_entries').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('queue_date', today).eq('status', 'in_progress'),
      supabase.from('queue_entries').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('queue_date', today).eq('status', 'completed'),
      supabase.from('patients').select('id, full_name, patient_code, phone, created_at')
        .eq('tenant_id', user.tenant_id).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(5),
    ])

    setStats({
      patients: patients ?? 0,
      doctors: doctors ?? 0,
      todayAppointments: todayAppointments ?? 0,
      queueWaiting: queueWaiting ?? 0,
      queueInProgress: queueInProgress ?? 0,
      queueCompleted: queueCompleted ?? 0,
      recentPatients: recentPatients ?? [],
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) fetchStats()
  }, [user, fetchStats])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [user, fetchStats])

  if (userLoading) return null

  const statCards = [
    { label: 'Total Patients', value: stats?.patients ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/patients' },
    { label: 'Active Doctors', value: stats?.doctors ?? 0, icon: UserCog, color: 'text-green-600', bg: 'bg-green-50', href: '/doctors' },
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: CalendarDays, color: 'text-purple-600', bg: 'bg-purple-50', href: '/appointments' },
    { label: 'Queue Waiting', value: stats?.queueWaiting ?? 0, icon: ListOrdered, color: 'text-orange-600', bg: 'bg-orange-50', href: '/queue' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Good {getGreeting()}, {user?.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50"
        >
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : statCards.map(stat => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href}
                className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              </Link>
            )
          })
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Patients */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Recent Patients</h2>
            <Link href="/patients" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-32" />
                    <div className="h-2.5 bg-slate-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No patients yet</p>
              <Link href="/patients/new" className="mt-2 text-xs text-blue-600 font-medium">
                Register first patient →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.recentPatients.map(patient => (
                <Link key={patient.id} href={`/patients/${patient.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-700">
                      {patient.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{patient.full_name}</p>
                    <p className="text-xs text-slate-400">{patient.patient_code} · {patient.phone}</p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(patient.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Queue Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Today's Queue</h2>
            <Link href="/queue" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Waiting', value: stats?.queueWaiting ?? 0, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'In Progress', value: stats?.queueInProgress ?? 0, icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Completed', value: stats?.queueCompleted ?? 0, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg ${item.bg}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </div>
                    <span className={`text-lg font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total today</span>
              <span className="font-semibold text-slate-700">
                {(stats?.queueWaiting ?? 0) + (stats?.queueInProgress ?? 0) + (stats?.queueCompleted ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Register Patient', href: '/patients/new', icon: Users, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: 'Book Appointment', href: '/appointments/new', icon: CalendarDays, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            { label: 'Add Doctor', href: '/doctors', icon: UserCog, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: 'View Queue', href: '/queue', icon: ListOrdered, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
          ].map(action => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${action.color}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {action.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

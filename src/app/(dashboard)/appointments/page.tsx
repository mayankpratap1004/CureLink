'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Calendar, Filter,
  Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react'
import { PageHeader }      from '@/components/shared/page-header'
import { EmptyState }      from '@/components/shared/empty-state'
import { StatusBadge }     from '@/components/shared/status-badge'
import { TableSkeleton }   from '@/components/shared/loading-skeleton'
import { useCurrentUser }  from '@/hooks/use-current-user'
import { createClient }    from '@/lib/supabase/client'
import { formatTime, cn }  from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any }> = {
  scheduled:       { label: 'Scheduled',       variant: 'info',    icon: Calendar },
  confirmed:       { label: 'Confirmed',        variant: 'info',    icon: CheckCircle2 },
  checked_in:      { label: 'Checked In',       variant: 'warning', icon: Clock },
  in_consultation: { label: 'In Consultation',  variant: 'purple',  icon: AlertCircle },
  completed:       { label: 'Completed',        variant: 'success', icon: CheckCircle2 },
  cancelled:       { label: 'Cancelled',        variant: 'error',   icon: XCircle },
  no_show:         { label: 'No Show',          variant: 'neutral', icon: XCircle },
}

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-blue-50 text-blue-700',
  follow_up:    'bg-purple-50 text-purple-700',
  emergency:    'bg-red-50 text-red-700',
  procedure:    'bg-amber-50 text-amber-700',
}

const PAGE_SIZE = 15

interface Appointment {
  id: string
  appointment_date: string
  slot_start: string
  slot_end: string
  status: string
  type: string
  token_number: number | null
  patient_name: string
  patient_code: string
  patient_phone: string
  doctor_name: string
  doctor_specialization: string
  department_name: string | null
}

export default function AppointmentsPage() {
  const router       = useRouter()
  const { user }     = useCurrentUser()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter]     = useState(
    new Date().toISOString().split('T')[0]
  )
  const [page, setPage]   = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, scheduled: 0, completed: 0, cancelled: 0 })

  const fetchAppointments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('appointments')
      .select(`
        id, appointment_date, slot_start, slot_end,
        status, type, token_number,
        patients!appointments_patient_id_fkey(full_name, patient_code, phone),
        doctors!appointments_doctor_id_fkey(
          specialization,
          users!doctors_user_id_fkey(full_name)
        ),
        departments(name)
      `, { count: 'exact' })
      .eq('tenant_id', user.tenant_id)
      .is('deleted_at', null)
      .order('slot_start', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (dateFilter)   query = query.eq('appointment_date', dateFilter)
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search)       query = query.ilike('patients.full_name', `%${search}%`)

    const { data, count } = await query

    setAppointments(
      (data ?? []).map((a: any) => ({
        ...a,
        patient_name:          a.patients?.full_name ?? '',
        patient_code:          a.patients?.patient_code ?? '',
        patient_phone:         a.patients?.phone ?? '',
        doctor_name:           a.doctors?.users?.full_name ?? '',
        doctor_specialization: a.doctors?.specialization ?? '',
        department_name:       a.departments?.name ?? null,
      }))
    )
    setTotal(count ?? 0)
    setLoading(false)
  }, [user, page, dateFilter, statusFilter, search])

  const fetchStats = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: total },
      { count: scheduled },
      { count: completed },
      { count: cancelled },
    ] = await Promise.all([
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('appointment_date', today).is('deleted_at', null),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('appointment_date', today)
        .in('status', ['scheduled','confirmed','checked_in']).is('deleted_at', null),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('appointment_date', today)
        .eq('status', 'completed').is('deleted_at', null),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('appointment_date', today)
        .eq('status', 'cancelled').is('deleted_at', null),
    ])

    setStats({
      total:     total ?? 0,
      scheduled: scheduled ?? 0,
      completed: completed ?? 0,
      cancelled: cancelled ?? 0,
    })
  }, [user])

  useEffect(() => {
    if (user) { fetchAppointments(); fetchStats() }
  }, [user, fetchAppointments, fetchStats])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Manage and track all patient appointments"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Appointments' }]}
        action={
          <Link href="/appointments/new"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Book Appointment
          </Link>
        }
      />

      {/* Today's stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Today's Total",  value: stats.total,     color: 'text-slate-700',  bg: 'bg-slate-50'  },
          { label: 'Scheduled',      value: stats.scheduled, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Completed',      value: stats.completed, color: 'text-emerald-600',bg: 'bg-emerald-50'},
          { label: 'Cancelled',      value: stats.cancelled, color: 'text-red-600',    bg: 'bg-red-50'    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search patient name..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
            />
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1) }}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 bg-white"
          />

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 bg-white"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <button
            onClick={() => { fetchAppointments(); fetchStats() }}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description={
              dateFilter
                ? `No appointments on ${new Date(dateFilter).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Book your first appointment to get started.'
            }
            action={
              <Link href="/appointments/new"
                className="flex items-center gap-2 bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                <Plus className="w-4 h-4" /> Book Appointment
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Token','Patient','Doctor','Time','Type','Status',''].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {appointments.map(appt => {
                    const statusCfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.scheduled
                    return (
                      <tr key={appt.id}
                        onClick={() => router.push(`/appointments/${appt.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-cyan-600">
                              {appt.token_number ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-slate-800">{appt.patient_name}</p>
                          <p className="text-xs text-slate-400">{appt.patient_code} · {appt.patient_phone}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-slate-700">{appt.doctor_name}</p>
                          <p className="text-xs text-slate-400">{appt.doctor_specialization}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-slate-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatTime(appt.slot_start)}
                          </p>
                          <p className="text-xs text-slate-400 ml-5">→ {formatTime(appt.slot_end)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-lg capitalize', TYPE_COLORS[appt.type])}>
                            {appt.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge label={statusCfg.label} variant={statusCfg.variant} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {appointments.map(appt => {
                const statusCfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.scheduled
                return (
                  <div key={appt.id}
                    onClick={() => router.push(`/appointments/${appt.id}`)}
                    className="p-4 flex items-start gap-3 active:bg-slate-50">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-cyan-600">{appt.token_number ?? '—'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{appt.patient_name}</p>
                        <StatusBadge label={statusCfg.label} variant={statusCfg.variant} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{appt.doctor_name} · {formatTime(appt.slot_start)}</p>
                      <p className="text-xs text-slate-400">{appt.patient_code}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-600 px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
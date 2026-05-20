'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useRealtimeQueue } from '@/hooks/use-realtime-queue'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import {
  Clock, CheckCircle2, SkipForward, AlertCircle,
  Users, Monitor, RefreshCw, Zap, Timer,
  ChevronRight, Phone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTime, cn } from '@/lib/utils'
import Link from 'next/link'

const STATUS_CONFIG = {
  waiting:     { label: 'Waiting',      variant: 'warning' as const, color: 'bg-amber-50  border-amber-200'  },
  in_progress: { label: 'In Progress',  variant: 'info'    as const, color: 'bg-blue-50   border-blue-200'   },
  completed:   { label: 'Completed',    variant: 'success' as const, color: 'bg-emerald-50 border-emerald-200'},
  skipped:     { label: 'Skipped',      variant: 'neutral' as const, color: 'bg-slate-50  border-slate-200'  },
  called:      { label: 'Called',       variant: 'purple'  as const, color: 'bg-purple-50  border-purple-200' },
}

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-blue-50 text-blue-700',
  follow_up:    'bg-purple-50 text-purple-700',
  emergency:    'bg-red-50 text-red-700 font-bold',
  procedure:    'bg-amber-50 text-amber-700',
}

export default function QueuePage() {
  const { user } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'completed'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const {
    queue, waiting, inProgress, completed,
    currentToken, loading, stats, getETA, refetch,
  } = useRealtimeQueue(user?.tenant_id ?? '')

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function updateQueueStatus(
    entryId: string,
    appointmentId: string,
    newStatus: string
  ) {
    if (!user) return
    setUpdatingId(entryId)
    const supabase = createClient()

    // Update queue entry
    const updateData: any = { status: newStatus }
    if (newStatus === 'in_progress') {
      updateData.called_at  = new Date().toISOString()
      updateData.started_at = new Date().toISOString()
    }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('queue_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('tenant_id', user.tenant_id)

    if (error) {
      showToast(error.message, 'error')
      setUpdatingId(null)
      return
    }

    // Sync appointment status
    const apptStatusMap: Record<string, string> = {
      in_progress: 'in_consultation',
      completed:   'completed',
      skipped:     'no_show',
    }

    if (apptStatusMap[newStatus]) {
      await fetch('/api/appointments/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          status:         apptStatusMap[newStatus],
          tenant_id:      user.tenant_id,
        }),
      })
    }

    showToast('Queue updated', 'success')
    setUpdatingId(null)
    refetch()
  }

  const displayQueue = activeTab === 'waiting'
    ? [...inProgress, ...waiting]
    : activeTab === 'completed'
    ? completed
    : queue

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Queue Management"
        description="Real-time patient queue — updates automatically"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Queue' }]}
        action={
          <div className="flex items-center gap-2">
            <Link href="/queue/display"
              target="_blank"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <Monitor className="w-4 h-4" /> Display Screen
            </Link>
            <button onClick={refetch}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-emerald-600">Live — updates in real time</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Today',  value: stats.total,      icon: Users,        color: 'text-slate-700',   bg: 'bg-white'        },
          { label: 'Waiting',      value: stats.waiting,    icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50'     },
          { label: 'In Progress',  value: stats.inProgress, icon: AlertCircle,  color: 'text-blue-600',    bg: 'bg-blue-50'      },
          { label: 'Completed',    value: stats.completed,  icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50'   },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-200 p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Now serving banner */}
      {currentToken && (
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-5 mb-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">
                Now Serving
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold">{currentToken.token_number}</span>
                </div>
                <div>
                  <p className="text-lg font-bold">{currentToken.patient_name}</p>
                  <p className="text-sm opacity-80">{currentToken.doctor_name}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 mb-1">Started at</p>
              <p className="text-lg font-bold">
                {currentToken.started_at
                  ? new Date(currentToken.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : '—'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit">
        {[
          { key: 'all',       label: `All (${stats.total})`           },
          { key: 'waiting',   label: `Active (${stats.waiting + stats.inProgress})` },
          { key: 'completed', label: `Done (${stats.completed})`      },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
              activeTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue list */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : displayQueue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No patients in queue</p>
          <p className="text-xs text-slate-400 mt-1">
            Patients appear here when they check in for their appointment
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayQueue.map((entry, index) => {
            const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting
            const eta = entry.status === 'waiting' ? getETA(entry.token_number) : null
            const isEmergency = entry.priority >= 999
            const isUpdating = updatingId === entry.id

            return (
              <div
                key={entry.id}
                className={cn(
                  'bg-white rounded-2xl border p-4 transition-all',
                  isEmergency ? 'border-red-300 bg-red-50/30' : 'border-slate-200',
                  entry.status === 'in_progress' && 'border-blue-300 bg-blue-50/20 shadow-sm shadow-blue-100'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Token */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border',
                    entry.status === 'in_progress'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : entry.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : entry.status === 'skipped'
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : isEmergency
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  )}>
                    {isEmergency && <Zap className="w-3 h-3 mb-0.5" />}
                    <span className="text-lg font-bold leading-none">{entry.token_number}</span>
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{entry.patient_name}</p>
                      {isEmergency && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-lg font-bold">
                          EMERGENCY
                        </span>
                      )}
                      <StatusBadge label={statusCfg.label} variant={statusCfg.variant} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{entry.patient_phone}
                      </p>
                      <p className="text-xs text-slate-400">{entry.patient_code}</p>
                      {entry.slot_start && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatTime(entry.slot_start)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.doctor_name}</p>
                  </div>

                  {/* ETA + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {eta !== null && eta > 0 && (
                      <div className="text-right mr-2 hidden sm:block">
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Timer className="w-3 h-3" /> ETA
                        </p>
                        <p className="text-sm font-bold text-amber-600">~{eta}m</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {entry.status === 'waiting' && (
                      <button
                        onClick={() => updateQueueStatus(entry.id, entry.appointment_id, 'in_progress')}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
                      >
                        {isUpdating ? '...' : (<><ChevronRight className="w-3.5 h-3.5" /> Call</>)}
                      </button>
                    )}

                    {entry.status === 'in_progress' && (
                      <button
                        onClick={() => updateQueueStatus(entry.id, entry.appointment_id, 'completed')}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
                      >
                        {isUpdating ? '...' : (<><CheckCircle2 className="w-3.5 h-3.5" /> Done</>)}
                      </button>
                    )}

                    {entry.status === 'waiting' && (
                      <button
                        onClick={() => updateQueueStatus(entry.id, entry.appointment_id, 'skipped')}
                        disabled={isUpdating}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        title="Skip"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
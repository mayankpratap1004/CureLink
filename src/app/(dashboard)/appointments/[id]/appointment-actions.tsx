'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, UserCheck, Stethoscope,
  XCircle, SkipForward, Loader2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

interface Props {
  appointmentId: string
  currentStatus: string
  tenantId: string
}

const TRANSITIONS: Record<string, {
  label: string
  nextStatus: string
  icon: any
  color: string
  description: string
}[]> = {
  scheduled: [
    { label: 'Confirm',        nextStatus: 'confirmed',       icon: CheckCircle2, color: 'bg-blue-500 hover:bg-blue-600 text-white',        description: 'Confirm this appointment' },
    { label: 'Cancel',         nextStatus: 'cancelled',       icon: XCircle,      color: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200', description: 'Cancel this appointment' },
  ],
  confirmed: [
    { label: 'Check In',       nextStatus: 'checked_in',      icon: UserCheck,    color: 'bg-amber-500 hover:bg-amber-600 text-white',       description: 'Patient has arrived and checked in' },
    { label: 'Cancel',         nextStatus: 'cancelled',       icon: XCircle,      color: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200', description: 'Cancel this appointment' },
  ],
  checked_in: [
    { label: 'Start Consult',  nextStatus: 'in_consultation', icon: Stethoscope,  color: 'bg-cyan-500 hover:bg-cyan-600 text-white',         description: 'Doctor has started the consultation' },
  ],
  in_consultation: [
    { label: 'Complete',       nextStatus: 'completed',       icon: CheckCircle2, color: 'bg-emerald-500 hover:bg-emerald-600 text-white',   description: 'Mark consultation as completed' },
  ],
  confirmed_no_show: [
    { label: 'No Show',        nextStatus: 'no_show',         icon: SkipForward,  color: 'bg-slate-100 hover:bg-slate-200 text-slate-600',   description: 'Patient did not show up' },
  ],
}

export function AppointmentActions({ appointmentId, currentStatus, tenantId }: Props) {
  const router  = useRouter()
  const [loading, setLoading]         = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<typeof TRANSITIONS[string][0] | null>(null)
  const [cancelReason, setCancelReason]   = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const actions = [
    ...(TRANSITIONS[currentStatus] ?? []),
    ...((['confirmed','checked_in'].includes(currentStatus))
      ? [{ label: 'No Show', nextStatus: 'no_show', icon: SkipForward,
           color: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
           description: 'Patient did not show up' }]
      : []
    ),
  ]

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAction(action: typeof actions[0]) {
    setLoading(action.nextStatus)

    const res = await fetch('/api/appointments/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id:      appointmentId,
        status:              action.nextStatus,
        cancellation_reason: action.nextStatus === 'cancelled' ? cancelReason : undefined,
        tenant_id:           tenantId,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      showToast(data.error || 'Failed to update status', 'error')
    } else {
      showToast(`Status updated to ${action.label}`, 'success')
      router.refresh()
    }

    setLoading(null)
    setConfirmAction(null)
    setCancelReason('')
  }

  if (['completed','cancelled','no_show'].includes(currentStatus)) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
        <p className="text-sm text-slate-400">This appointment is {currentStatus}. No further actions available.</p>
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Actions</h3>
        <div className="flex flex-wrap gap-2">
          {actions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.nextStatus}
                onClick={() => setConfirmAction(action)}
                disabled={!!loading}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 ${action.color}`}
              >
                {loading === action.nextStatus
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Icon className="w-4 h-4" />
                }
                {action.label}
              </button>
            )
          })}
        </div>

        {/* Cancel reason input */}
        {confirmAction?.nextStatus === 'cancelled' && (
          <div className="mt-4 space-y-2">
            <label className="text-xs font-semibold text-slate-600">
              Cancellation reason (optional)
            </label>
            <input
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400/30"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction && confirmAction.nextStatus !== 'cancelled'}
        title={`${confirmAction?.label} Appointment`}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.label}
        variant={confirmAction?.nextStatus === 'no_show' ? 'warning' : 'danger'}
        onConfirm={() => confirmAction ? handleAction(confirmAction) : Promise.resolve()}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Direct action for cancel (no confirm dialog needed, has reason input) */}
      {confirmAction?.nextStatus === 'cancelled' && (
        <div className="bg-white rounded-2xl border border-red-200 p-5 mt-4">
          <p className="text-sm font-semibold text-red-700 mb-3">Confirm Cancellation</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmAction(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">
              Go Back
            </button>
            <button onClick={() => handleAction(confirmAction)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2">
              {loading === 'cancelled' && <Loader2 className="w-4 h-4 animate-spin" />}
              Cancel Appointment
            </button>
          </div>
        </div>
      )}
    </>
  )
}
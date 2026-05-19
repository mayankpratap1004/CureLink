import { getCurrentUser }      from '@/services/auth.service'
import { getAppointmentById }  from '@/services/appointment.service'
import { notFound }            from 'next/navigation'
import { PageHeader }          from '@/components/shared/page-header'
import { StatusBadge }         from '@/components/shared/status-badge'
import { AppointmentActions }  from './appointment-actions'
import { formatTime, formatDate, formatCurrency } from '@/lib/utils'
import {
  User, UserCog, Calendar, Clock,
  Phone, FileText, Building2, Hash,
} from 'lucide-react'

const STATUS_MAP: Record<string, any> = {
  scheduled:       { label: 'Scheduled',       variant: 'info'    },
  confirmed:       { label: 'Confirmed',        variant: 'info'    },
  checked_in:      { label: 'Checked In',       variant: 'warning' },
  in_consultation: { label: 'In Consultation',  variant: 'purple'  },
  completed:       { label: 'Completed',        variant: 'success' },
  cancelled:       { label: 'Cancelled',        variant: 'error'   },
  no_show:         { label: 'No Show',          variant: 'neutral' },
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return null

  const appt = await getAppointmentById(id, user.tenant_id)
  if (!appt) notFound()

  const statusCfg = STATUS_MAP[appt.status] ?? STATUS_MAP.scheduled

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Appointment #${appt.token_number ?? '—'}`}
        breadcrumbs={[
          { label: 'Dashboard',     href: '/dashboard'     },
          { label: 'Appointments',  href: '/appointments'  },
          { label: `#${appt.token_number ?? appt.id.slice(0,8)}` },
        ]}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge label={statusCfg.label} variant={statusCfg.variant} />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left */}
        <div className="space-y-4">
          {/* Patient */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Patient
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-600">
                  {appt.patients?.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{appt.patients?.full_name}</p>
                <p className="text-xs text-slate-400">{appt.patients?.patient_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {appt.patients?.phone}
            </div>
          </div>

          {/* Doctor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5" /> Doctor
            </h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600">
                  {appt.doctors?.users?.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{appt.doctors?.users?.full_name}</p>
                <p className="text-xs text-slate-400">{appt.doctors?.specialization}</p>
              </div>
            </div>
            {appt.departments && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {appt.departments.name}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Consultation Fee</span>
              <span className="text-sm font-bold text-slate-700">
                {formatCurrency(appt.doctors?.consultation_fee ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="md:col-span-2 space-y-4">
          {/* Appointment details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
              Appointment Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Token Number', value: `#${appt.token_number ?? '—'}`,              icon: Hash     },
                { label: 'Type',         value: appt.type.replace('_', ' '),                 icon: FileText },
                { label: 'Date',         value: formatDate(appt.appointment_date),            icon: Calendar },
                { label: 'Time',         value: `${formatTime(appt.slot_start)} → ${formatTime(appt.slot_end)}`, icon: Clock },
              ].map(item => (
                <div key={item.label} className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                    <item.icon className="w-3 h-3" /> {item.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            {appt.notes && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-amber-800">{appt.notes}</p>
              </div>
            )}

            {appt.cancellation_reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs font-semibold text-red-700 mb-1">Cancellation Reason</p>
                <p className="text-sm text-red-800">{appt.cancellation_reason}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <AppointmentActions
            appointmentId={appt.id}
            currentStatus={appt.status}
            tenantId={user.tenant_id}
          />
        </div>
      </div>
    </div>
  )
}
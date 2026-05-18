import { getCurrentUser } from '@/services/auth.service'
import { getPatientById } from '@/services/patient.service'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import { Phone, Mail, MapPin, Heart, AlertCircle, Calendar, User } from 'lucide-react'
import Link from 'next/link'

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return null

  const patient = await getPatientById(params.id, user.tenant_id)
  if (!patient) notFound()

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={patient.full_name}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients', href: '/patients' },
          { label: patient.full_name },
        ]}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge label={patient.is_active ? 'Active' : 'Inactive'} variant={patient.is_active ? 'success' : 'neutral'} />
            <Link href={`/appointments/new?patient_id=${patient.id}`}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
              Book Appointment
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Profile */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-semibold text-slate-600">
                {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-800">{patient.full_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{patient.patient_code}</span>
            </p>
            {patient.blood_group && (
              <span className="inline-block mt-2 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                {patient.blood_group}
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</h3>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />{patient.phone}
            </div>
            {patient.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />{patient.email}
              </div>
            )}
            {patient.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />{patient.address}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Gender', value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—', icon: User },
                { label: 'Age', value: age ? `${age} years` : '—', icon: Calendar },
                { label: 'Date of Birth', value: patient.date_of_birth ? formatDate(patient.date_of_birth) : '—', icon: Calendar },
                { label: 'Blood Group', value: patient.blood_group ?? '—', icon: Heart },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-medium text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {(patient.emergency_contact || patient.emergency_phone) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-orange-500" /> Emergency Contact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Contact Name</p>
                  <p className="text-sm font-medium text-slate-700">{patient.emergency_contact ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-slate-700">{patient.emergency_phone ?? '—'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Appointment History</h3>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No appointments yet</p>
              <Link href={`/appointments/new?patient_id=${patient.id}`}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Book first appointment →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
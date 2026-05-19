'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, Clock, User,
  UserCog, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/page-header'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient }   from '@/lib/supabase/client'
import { formatTime, cn } from '@/lib/utils'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  patient_id:       z.string().min(1, 'Patient is required'),
  doctor_id:        z.string().min(1, 'Doctor is required'),
  appointment_date: z.string().min(1, 'Date is required'),
  type:             z.enum(['consultation','follow_up','emergency','procedure']),
  notes:            z.string().optional(),
})
type FormInput = z.infer<typeof schema>

interface Patient { id: string; full_name: string; patient_code: string; phone: string }
interface Doctor  { id: string; full_name: string; specialization: string; consultation_fee: number; department_name: string | null }
interface Slot    { start: string; end: string; available: boolean }

function NewAppointmentForm() {
  const router         = useRouter()
  const searchParams   = useSearchParams()
  const { user }       = useCurrentUser()
  const [patients, setPatients]     = useState<Patient[]>([])
  const [doctors, setDoctors]       = useState<Doctor[]>([])
  const [slots, setSlots]           = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [patientSearch, setPatientSearch] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      appointment_date: new Date().toISOString().split('T')[0],
      type: 'consultation',
    },
  })

  const watchDoctorId = watch('doctor_id')
  const watchDate     = watch('appointment_date')
  const watchPatientId = watch('patient_id')

  // Pre-fill patient from query param
  useEffect(() => {
    const pid = searchParams.get('patient_id')
    if (pid) setValue('patient_id', pid)
  }, [searchParams, setValue])

  // Load patients + doctors
  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    supabase.from('patients').select('id, full_name, patient_code, phone')
      .eq('tenant_id', user.tenant_id).is('deleted_at', null)
      .order('full_name').limit(100)
      .then(({ data }: any) => setPatients(data ?? []))

    supabase.from('doctors').select(`
      id, specialization, consultation_fee,
      users!doctors_user_id_fkey(full_name),
      departments(name)
    `).eq('tenant_id', user.tenant_id).eq('is_active', true).is('deleted_at', null)
      .then(({ data }: any) => setDoctors(
        (data ?? []).map((d: any) => ({
          id: d.id,
          full_name: d.users?.full_name ?? '',
          specialization: d.specialization,
          consultation_fee: d.consultation_fee,
          department_name: d.departments?.name ?? null,
        }))
      ))
  }, [user])

  // Load slots when doctor + date changes
  useEffect(() => {
    if (!watchDoctorId || !watchDate || !user) return
    setLoadingSlots(true)
    setSelectedSlot(null)

    fetch(`/api/appointments/slots?doctor_id=${watchDoctorId}&date=${watchDate}&tenant_id=${user.tenant_id}`)
      .then(r => r.json())
      .then(data => { setSlots(data.slots ?? []); setLoadingSlots(false) })
      .catch(() => setLoadingSlots(false))
  }, [watchDoctorId, watchDate, user])

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_code.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone.includes(patientSearch)
  )

  const selectedPatient = patients.find(p => p.id === watchPatientId)
  const selectedDoctor  = doctors.find(d => d.id === watchDoctorId)

  async function onSubmit(values: FormInput) {
    if (!selectedSlot) { setError('Please select a time slot'); return }
    if (!user) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/appointments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        slot_start:  selectedSlot.start,
        slot_end:    selectedSlot.end,
        tenant_id:   user.tenant_id,
        created_by:  user.id,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to book appointment')
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/appointments'), 1500)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Appointment Booked!</h2>
        <p className="text-slate-500 text-sm mt-1">Redirecting to appointments...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Book Appointment"
        description="Schedule a new patient appointment"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Appointments', href: '/appointments' },
          { label: 'New Appointment' },
        ]}
      />

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Patient selection */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-500" /> Select Patient
              </h3>

              <input
                type="text"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                placeholder="Search by name, code, or phone..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 mb-3"
              />

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredPatients.slice(0, 20).map(patient => (
                  <label key={patient.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      watchPatientId === patient.id
                        ? 'border-cyan-400 bg-cyan-50'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    )}>
                    <input
                      type="radio"
                      value={patient.id}
                      {...register('patient_id')}
                      className="sr-only"
                    />
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-600">
                        {patient.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{patient.full_name}</p>
                      <p className="text-xs text-slate-400">{patient.patient_code} · {patient.phone}</p>
                    </div>
                    {watchPatientId === patient.id && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    )}
                  </label>
                ))}
                {filteredPatients.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No patients found</p>
                )}
              </div>
              {errors.patient_id && (
                <p className="text-xs text-red-500 mt-2">{errors.patient_id.message}</p>
              )}

              <Link href="/patients/new"
                className="flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 mt-3 font-medium">
                + Register new patient
              </Link>
            </div>

            {/* Doctor selection */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-cyan-500" /> Select Doctor
              </h3>
              <div className="space-y-2">
                {doctors.map(doctor => (
                  <label key={doctor.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      watchDoctorId === doctor.id
                        ? 'border-cyan-400 bg-cyan-50'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    )}>
                    <input
                      type="radio"
                      value={doctor.id}
                      {...register('doctor_id')}
                      className="sr-only"
                    />
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600">
                        {doctor.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{doctor.full_name}</p>
                      <p className="text-xs text-slate-400">
                        {doctor.specialization}
                        {doctor.department_name && ` · ${doctor.department_name}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      ₹{(doctor.consultation_fee / 100).toLocaleString('en-IN')}
                    </span>
                    {watchDoctorId === doctor.id && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                    )}
                  </label>
                ))}
              </div>
              {errors.doctor_id && (
                <p className="text-xs text-red-500 mt-2">{errors.doctor_id.message}</p>
              )}
            </div>

            {/* Date + Type */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" /> Date & Type
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    {...register('appointment_date')}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
                  />
                  {errors.appointment_date && (
                    <p className="text-xs text-red-500">{errors.appointment_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Appointment Type
                  </label>
                  <select {...register('type')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 bg-white">
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="emergency">Emergency</option>
                    <option value="procedure">Procedure</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Notes (optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Any special instructions or notes..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            {/* Time slots */}
            {watchDoctorId && watchDate && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-500" /> Available Slots
                </h3>

                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading slots...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No slots available for this date.</p>
                    <p className="text-xs text-slate-300 mt-1">Doctor may be on leave or has no schedule set.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'px-3 py-2 text-xs font-semibold rounded-xl border transition-all',
                          !slot.available
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                            : selectedSlot?.start === slot.start
                            ? 'bg-cyan-500 text-white border-cyan-500 shadow-md shadow-cyan-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50'
                        )}
                      >
                        {formatTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Booking Summary</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Patient</p>
                    {selectedPatient ? (
                      <p className="text-sm font-semibold text-slate-800">{selectedPatient.full_name}</p>
                    ) : (
                      <p className="text-sm text-slate-400">Not selected</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <UserCog className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Doctor</p>
                    {selectedDoctor ? (
                      <>
                        <p className="text-sm font-semibold text-slate-800">{selectedDoctor.full_name}</p>
                        <p className="text-xs text-slate-400">{selectedDoctor.specialization}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">Not selected</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Date & Time</p>
                    {watchDate ? (
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(watchDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">Not selected</p>
                    )}
                    {selectedSlot ? (
                      <p className="text-xs text-cyan-600 font-semibold">
                        {formatTime(selectedSlot.start)} → {formatTime(selectedSlot.end)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">No slot selected</p>
                    )}
                  </div>
                </div>

                {selectedDoctor && (
                  <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                    <span className="text-sm font-medium text-cyan-700">Consultation Fee</span>
                    <span className="text-sm font-bold text-cyan-700">
                      ₹{(selectedDoctor.consultation_fee / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="submit"
                  disabled={saving || !selectedSlot || !watchPatientId || !watchDoctorId}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-200 disabled:text-slate-400
                             text-white font-semibold py-3 px-4 rounded-xl text-sm
                             flex items-center justify-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Booking...' : 'Confirm Booking'}
                </button>

                <Link href="/appointments"
                  className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 py-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <NewAppointmentForm />
    </Suspense>
  )
}
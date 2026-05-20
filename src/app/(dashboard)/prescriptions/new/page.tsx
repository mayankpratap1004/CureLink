'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Trash2, ArrowLeft, Loader2,
  FileText, User, Stethoscope,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/page-header'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient }   from '@/lib/supabase/client'

interface Medicine {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  quantity: string
}

interface Appointment {
  id: string
  appointment_date: string
  type: string
  patient_id: string
  doctor_id: string
  patient_name: string
  doctor_name: string
}

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Three times daily',
  'Four times daily', 'Every 6 hours', 'Every 8 hours',
  'At bedtime', 'As needed', 'Once weekly',
]

const DURATIONS = [
  '3 days', '5 days', '7 days', '10 days',
  '14 days', '1 month', '2 months', '3 months', 'Ongoing',
]

function NewPrescriptionForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user }     = useCurrentUser()

  const [appointments, setAppointments]       = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState('')
  const [diagnosis, setDiagnosis]             = useState('')
  const [medicines, setMedicines]             = useState<Medicine[]>([
    { name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '', quantity: '' },
  ])
  const [instructions, setInstructions]       = useState('')
  const [followUpDate, setFollowUpDate]       = useState('')
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    supabase.from('appointments').select(`
      id, appointment_date, type, patient_id, doctor_id,
      patients!appointments_patient_id_fkey(full_name),
      doctors!appointments_doctor_id_fkey(
        users!doctors_user_id_fkey(full_name)
      )
    `)
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('appointment_date', { ascending: false })
      .limit(20)
      .then(({ data }: any) => {
        setAppointments(
          (data ?? []).map((a: any) => ({
            id: a.id,
            appointment_date: a.appointment_date,
            type: a.type,
            patient_id: a.patient_id,
            doctor_id: a.doctor_id,
            patient_name: a.patients?.full_name ?? '',
            doctor_name: a.doctors?.users?.full_name ?? '',
          }))
        )
      })

    const aid = searchParams.get('appointment_id')
    if (aid) setSelectedAppointment(aid)
  }, [user, searchParams])

  function addMedicine() {
    setMedicines(prev => [
      ...prev,
      { name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '', quantity: '' },
    ])
  }

  function removeMedicine(index: number) {
    setMedicines(prev => prev.filter((_, i) => i !== index))
  }

  function updateMedicine(index: number, field: keyof Medicine, value: string) {
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const selectedAppt = appointments.find(a => a.id === selectedAppointment)

  async function handleSubmit() {
    if (!selectedAppointment) { setError('Please select an appointment'); return }
    if (!diagnosis) { setError('Diagnosis is required'); return }
    if (medicines.some(m => !m.name || !m.dosage)) { setError('All medicines need name and dosage'); return }
    if (!user) return

    setSaving(true)
    setError('')

    const res = await fetch('/api/prescriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: selectedAppointment,
        patient_id:     selectedAppt?.patient_id,
        doctor_id:      selectedAppt?.doctor_id,
        diagnosis,
        medicines,
        instructions:   instructions || undefined,
        follow_up_date: followUpDate || undefined,
        tenant_id:      user.tenant_id,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to create prescription')
      setSaving(false)
      return
    }

    router.push('/prescriptions')
    router.refresh()
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New Prescription"
        description="Write a prescription for a completed consultation"
        breadcrumbs={[
          { label: 'Dashboard',     href: '/dashboard'     },
          { label: 'Prescriptions', href: '/prescriptions' },
          { label: 'New' },
        ]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Appointment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-500" /> Select Appointment
          </h3>
          <select
            value={selectedAppointment}
            onChange={e => setSelectedAppointment(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
          >
            <option value="">Select a completed appointment</option>
            {appointments.map(a => (
              <option key={a.id} value={a.id}>
                {a.appointment_date} — {a.patient_name} (Dr. {a.doctor_name})
              </option>
            ))}
          </select>

          {selectedAppt && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-cyan-50 rounded-xl border border-cyan-100">
              <User className="w-4 h-4 text-cyan-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{selectedAppt.patient_name}</p>
                <p className="text-xs text-slate-500">Dr. {selectedAppt.doctor_name} · {selectedAppt.appointment_date}</p>
              </div>
            </div>
          )}
        </div>

        {/* Diagnosis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" /> Diagnosis
          </h3>
          <textarea
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            rows={3}
            placeholder="Enter diagnosis..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
          />
        </div>

        {/* Medicines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              💊 Medicines
            </h3>
            <button type="button" onClick={addMedicine}
              className="flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 font-semibold">
              <Plus className="w-3.5 h-3.5" /> Add Medicine
            </button>
          </div>

          <div className="space-y-4">
            {medicines.map((med, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600">Medicine {i + 1}</p>
                  {medicines.length > 1 && (
                    <button type="button" onClick={() => removeMedicine(i)}
                      className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Medicine Name *</label>
                    <input
                      value={med.name}
                      onChange={e => updateMedicine(i, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Dosage *</label>
                    <input
                      value={med.dosage}
                      onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                      placeholder="e.g. 1 tablet"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Quantity</label>
                    <input
                      value={med.quantity}
                      onChange={e => updateMedicine(i, 'quantity', e.target.value)}
                      placeholder="e.g. 10 tablets"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Frequency *</label>
                    <select
                      value={med.frequency}
                      onChange={e => updateMedicine(i, 'frequency', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                    >
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Duration *</label>
                    <select
                      value={med.duration}
                      onChange={e => updateMedicine(i, 'duration', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                    >
                      {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Special Instructions</label>
                    <input
                      value={med.instructions}
                      onChange={e => updateMedicine(i, 'instructions', e.target.value)}
                      placeholder="e.g. Take after meals"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">General Instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                placeholder="Diet restrictions, rest, exercise advice..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/prescriptions"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Link>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <NewPrescriptionForm />
    </Suspense>
  )
}
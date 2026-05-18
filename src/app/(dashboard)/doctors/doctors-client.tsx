'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, UserCog, Phone, Mail, Building2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { formatCurrency } from '@/lib/utils'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DoctorWithDetails } from '@/services/doctor.service'
import type { Department } from '@/types/app'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone'),
  specialization: z.string().min(2, 'Required'),
  license_number: z.string().min(3, 'Required'),
  qualification: z.string().optional(),
  experience_years: z.coerce.number().min(0).default(0),
  consultation_fee: z.coerce.number().min(0),
  avg_consultation_min: z.coerce.number().min(5).default(15),
  department_id: z.string().optional(),
  bio: z.string().optional(),
})

type FormInput = {
  full_name: string
  email: string
  phone: string
  specialization: string
  license_number: string
  qualification?: string
  experience_years: number
  consultation_fee: number
  avg_consultation_min: number
  department_id?: string
  bio?: string
}
interface Props {
  doctors: DoctorWithDetails[]
  departments: Department[]
  tenantId: string
}

export function DoctorsClient({ doctors: initialDoctors, departments, tenantId }: Props) {
  const router = useRouter()
  const [doctors, setDoctors] = useState(initialDoctors)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: { avg_consultation_min: 15, experience_years: 0 },
  })

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = doctors.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization.toLowerCase().includes(search.toLowerCase()) ||
    d.department_name?.toLowerCase().includes(search.toLowerCase())
  )

  async function onSubmit(values: FormInput) {
    setSaving(true)
    const res = await fetch('/api/doctors/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, tenant_id: tenantId }),
    })
    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || 'Failed to create doctor', 'error')
    } else {
      showToast('Doctor added successfully', 'success')
      setShowForm(false)
      reset()
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Doctors"
        description="Manage your hospital's medical staff"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Doctors' }]}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, specialization, department..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Add Doctor Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-4">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Add New Doctor</h2>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'full_name', placeholder: 'Dr. Arjun Sharma', col: 2 },
                  { label: 'Email', key: 'email', placeholder: 'doctor@hospital.com', type: 'email' },
                  { label: 'Phone', key: 'phone', placeholder: '9876543210' },
                  { label: 'Specialization', key: 'specialization', placeholder: 'Cardiologist' },
                  { label: 'License Number', key: 'license_number', placeholder: 'MCI-12345' },
                  { label: 'Qualification', key: 'qualification', placeholder: 'MBBS, MD' },
                ].map(field => (
                  <div key={field.key} className={`space-y-1.5 ${field.col === 2 ? 'col-span-2' : ''}`}>
                    <label className="text-sm font-medium text-slate-700">{field.label}</label>
                    <input
                      {...register(field.key as keyof FormInput)}
                      type={field.type ?? 'text'}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors[field.key as keyof FormInput] && (
                      <p className="text-xs text-red-500">{errors[field.key as keyof FormInput]?.message}</p>
                    )}
                  </div>
                ))}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Experience (years)</label>
                  <input
                    {...register('experience_years')}
                    type="number" min="0"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Consultation Fee (₹)</label>
                  <input
                    {...register('consultation_fee')}
                    type="number" min="0"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.consultation_fee && <p className="text-xs text-red-500">{errors.consultation_fee.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Avg. Consultation (min)</label>
                  <input
                    {...register('avg_consultation_min')}
                    type="number" min="5"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Department</label>
                  <select
                    {...register('department_id')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-slate-700">Bio (optional)</label>
                  <textarea
                    {...register('bio')}
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={UserCog}
            title="No doctors found"
            description={search ? 'Try a different search term.' : 'Add your first doctor to get started.'}
            action={!search ? (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                <Plus className="w-4 h-4" /> Add Doctor
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doctor => (
            <div key={doctor.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/doctors/${doctor.id}`)}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-700">
                  {doctor.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{doctor.full_name}</p>
                  <StatusBadge label={doctor.is_active ? 'Active' : 'Inactive'} variant={doctor.is_active ? 'success' : 'neutral'} />
                </div>
                <p className="text-xs text-slate-500">{doctor.specialization}
                  {doctor.department_name && ` · ${doctor.department_name}`}
                  {doctor.experience_years > 0 && ` · ${doctor.experience_years}y exp`}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{doctor.email}</span>
                {doctor.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{doctor.phone}</span>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-800">{formatCurrency(doctor.consultation_fee)}</p>
                <p className="text-xs text-slate-400">{doctor.avg_consultation_min} min/patient</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
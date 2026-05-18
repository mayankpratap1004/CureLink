'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  blood_group: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional(),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
})

type FormInput = z.infer<typeof schema>

export default function NewPatientPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormInput) {
    if (!user) return
    setSaving(true)
    setError('')

    const supabase = createClient()

    // Generate patient code
    const { data: codeData } = await supabase
      .rpc('generate_patient_code', { p_tenant_id: user.tenant_id })

    const { error: insertError } = await supabase
      .from('patients')
      .insert({
        ...values,
        tenant_id: user.tenant_id,
        patient_code: codeData ?? `PT-${Date.now()}`,
        email: values.email || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        blood_group: values.blood_group || null,
        address: values.address || null,
        emergency_contact: values.emergency_contact || null,
        emergency_phone: values.emergency_phone || null,
      })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push('/patients')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Register New Patient"
        description="Add a new patient to the system"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients', href: '/patients' },
          { label: 'New Patient' },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Full Name *</label>
                <input {...register('full_name')} placeholder="Ramesh Kumar"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Phone *</label>
                <input {...register('phone')} placeholder="9876543210"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input {...register('email')} type="email" placeholder="patient@email.com"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                <input {...register('date_of_birth')} type="date"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Gender</label>
                <select {...register('gender')}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Blood Group</label>
                <select {...register('blood_group')}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select blood group</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Address</label>
                <textarea {...register('address')} rows={2} placeholder="Full address..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Contact Name</label>
                <input {...register('emergency_contact')} placeholder="Contact person name"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Contact Phone</label>
                <input {...register('emergency_phone')} placeholder="Emergency phone"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Link href="/patients"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Link>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Register Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
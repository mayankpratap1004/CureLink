'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, FileText,
  Calendar, ChevronRight, RefreshCw,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/page-header'
import { EmptyState }     from '@/components/shared/empty-state'
import { TableSkeleton }  from '@/components/shared/loading-skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient }   from '@/lib/supabase/client'
import { formatDate }     from '@/lib/utils'

interface Prescription {
  id: string
  diagnosis: string
  medicines: any[]
  issued_at: string
  follow_up_date: string | null
  patient_name: string
  patient_code: string
  doctor_name: string
  appointment_date: string
}

const PAGE_SIZE = 15

export default function PrescriptionsPage() {
  const router   = useRouter()
  const { user } = useCurrentUser()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [page, setPage]                   = useState(1)
  const [total, setTotal]                 = useState(0)

  const fetchPrescriptions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    const { data, count } = await (supabase
      .from('prescriptions')
      .select(`
        id, diagnosis, medicines, issued_at, follow_up_date,
        patients!prescriptions_patient_id_fkey(full_name, patient_code),
        doctors!prescriptions_doctor_id_fkey(
          users!doctors_user_id_fkey(full_name)
        ),
        appointments!prescriptions_appointment_id_fkey(appointment_date)
      `, { count: 'exact' })
      .eq('tenant_id', user.tenant_id)
      .is('deleted_at', null)
      .order('issued_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1) as any)

    setPrescriptions(
      (data ?? []).map((p: any) => ({
        ...p,
        patient_name:     p.patients?.full_name ?? '',
        patient_code:     p.patients?.patient_code ?? '',
        doctor_name:      p.doctors?.users?.full_name ?? '',
        appointment_date: p.appointments?.appointment_date ?? '',
      }))
    )
    setTotal(count ?? 0)
    setLoading(false)
  }, [user, page])

  useEffect(() => {
    if (user) fetchPrescriptions()
  }, [user, fetchPrescriptions])

  const filtered = prescriptions.filter(p =>
    p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        description="View and manage all prescriptions"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Prescriptions' }]}
        action={
          <Link href="/prescriptions/new"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" /> New Prescription
          </Link>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient, doctor, or diagnosis..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
            />
          </div>
          <button onClick={fetchPrescriptions}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={FileText}
            title="No prescriptions yet"
            description="Prescriptions are created after completing a consultation."
            action={
              <Link href="/prescriptions/new"
                className="flex items-center gap-2 bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                <Plus className="w-4 h-4" /> New Prescription
              </Link>
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(rx => (
              <div key={rx.id}
                onClick={() => router.push(`/prescriptions/${rx.id}`)}
                className="flex items-start gap-4 p-4 hover:bg-slate-50/80 cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{rx.patient_name}</p>
                    <p className="text-xs text-slate-400 flex-shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(rx.issued_at)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium">{rx.diagnosis}</span>
                    {' · '}{rx.medicines?.length ?? 0} medicine(s)
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dr. {rx.doctor_name}
                    {rx.follow_up_date && ` · Follow up: ${formatDate(rx.follow_up_date)}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, Phone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface Patient {
  id: string
  patient_code: string
  full_name: string
  phone: string
  email: string | null
  gender: string | null
  date_of_birth: string | null
  blood_group: string | null
  is_active: boolean
  created_at: string
}

const PAGE_SIZE = 15

export default function PatientsPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchPatients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('tenant_id', user.tenant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,patient_code.ilike.%${search}%`)
    }

    const { data, count } = await query
    setPatients(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [user, page, search])

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300)
    return () => clearTimeout(timer)
  }, [fetchPatients])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function getAge(dob: string | null) {
    if (!dob) return null
    const age = new Date().getFullYear() - new Date(dob).getFullYear()
    return `${age}y`
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        description={`${total} total patients`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients' }]}
        action={
          <Link
            href="/patients/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Register Patient
          </Link>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, phone, or patient code..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={Users}
            title="No patients found"
            description={search ? 'No patients match your search.' : 'Register your first patient to get started.'}
            action={!search ? (
              <Link href="/patients/new"
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
                <Plus className="w-4 h-4" /> Register Patient
              </Link>
            ) : undefined}
          />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Code</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden sm:table-cell">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Details</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.map(patient => (
                  <tr
                    key={patient.id}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-slate-600">
                            {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{patient.full_name}</p>
                          <p className="text-xs text-slate-400 capitalize">
                            {patient.gender ?? 'Unknown'}
                            {patient.date_of_birth && ` · ${getAge(patient.date_of_birth)}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {patient.patient_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{patient.phone}
                      </p>
                      {patient.email && (
                        <p className="text-xs text-slate-400 mt-0.5">{patient.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {patient.blood_group && (
                          <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                            {patient.blood_group}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={patient.is_active ? 'Active' : 'Inactive'}
                        variant={patient.is_active ? 'success' : 'neutral'}
                      />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(patient.created_at)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
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

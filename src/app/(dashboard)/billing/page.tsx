'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Receipt, CheckCircle2,
  Clock, XCircle, ChevronLeft, ChevronRight,
  TrendingUp, RefreshCw, IndianRupee,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/page-header'
import { EmptyState }     from '@/components/shared/empty-state'
import { StatusBadge }    from '@/components/shared/status-badge'
import { TableSkeleton }  from '@/components/shared/loading-skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient }   from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
  draft:          { label: 'Draft',          variant: 'neutral' },
  sent:           { label: 'Sent',           variant: 'info'    },
  paid:           { label: 'Paid',           variant: 'success' },
  partially_paid: { label: 'Partial',        variant: 'warning' },
  overdue:        { label: 'Overdue',        variant: 'error'   },
  cancelled:      { label: 'Cancelled',      variant: 'neutral' },
}

const PAGE_SIZE = 15

interface Invoice {
  id: string
  invoice_number: string
  patient_name: string
  patient_code: string
  total: number
  status: string
  payment_method: string | null
  created_at: string
  paid_at: string | null
  due_date: string | null
}

export default function BillingPage() {
  const router      = useRouter()
  const { user }    = useCurrentUser()
  const [invoices, setInvoices]       = useState<Invoice[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]               = useState(1)
  const [total, setTotal]             = useState(0)
  const [stats, setStats]             = useState({
    total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0,
  })

  const fetchInvoices = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('billing_invoices')
      .select(`
        id, invoice_number, total, status,
        payment_method, created_at, paid_at, due_date,
        patients!billing_invoices_patient_id_fkey(full_name, patient_code)
      `, { count: 'exact' })
      .eq('tenant_id', user.tenant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (statusFilter) query = query.eq('status', statusFilter)
    if (search)       query = query.ilike('invoice_number', `%${search}%`)

    const { data, count } = await (query as any)
    setInvoices(
      (data ?? []).map((inv: any) => ({
        ...inv,
        patient_name: inv.patients?.full_name ?? '',
        patient_code: inv.patients?.patient_code ?? '',
      }))
    )
    setTotal(count ?? 0)
    setLoading(false)
  }, [user, page, statusFilter, search])

  const fetchStats = useCallback(async () => {
    if (!user) return
    const supabase = createClient()

    const [
      { count: total },
      { count: paid },
      { count: pending },
      { count: overdue },
    ] = await Promise.all([
      supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).is('deleted_at', null),
      supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('status', 'paid').is('deleted_at', null),
      supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).in('status', ['draft', 'sent']).is('deleted_at', null),
      supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenant_id).eq('status', 'overdue').is('deleted_at', null),
    ])

    const { data: revenueData } = await supabase
      .from('billing_invoices')
      .select('total')
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'paid')
      .is('deleted_at', null)

    const totalRevenue = (revenueData ?? []).reduce(
      (sum: number, inv: any) => sum + (inv.total ?? 0), 0
    )

    setStats({
      total:        total ?? 0,
      paid:         paid ?? 0,
      pending:      pending ?? 0,
      overdue:      overdue ?? 0,
      totalRevenue,
    })
  }, [user])

  useEffect(() => {
    if (user) { fetchInvoices(); fetchStats() }
  }, [user, fetchInvoices, fetchStats])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage invoices and payments"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Billing' }]}
        action={
          <Link href="/billing/new"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Paid',          value: stats.paid,                          icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending',       value: stats.pending,                       icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Overdue',       value: stats.overdue,                       icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50'     },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-white p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search invoice number..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => { fetchInvoices(); fetchStats() }}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create your first invoice to start tracking payments."
            action={
              <Link href="/billing/new"
                className="flex items-center gap-2 bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                <Plus className="w-4 h-4" /> New Invoice
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Invoice #', 'Patient', 'Amount', 'Status', 'Payment', 'Date', ''].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.map(inv => (
                    <tr key={inv.id}
                      onClick={() => router.push(`/billing/${inv.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-mono font-semibold text-slate-700">
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800">{inv.patient_name}</p>
                        <p className="text-xs text-slate-400">{inv.patient_code}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          label={STATUS_CONFIG[inv.status]?.label ?? inv.status}
                          variant={STATUS_CONFIG[inv.status]?.variant ?? 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-slate-500 capitalize">
                          {inv.payment_method?.replace('_', ' ') ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-slate-500">{formatDate(inv.created_at)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {invoices.map(inv => (
                <div key={inv.id}
                  onClick={() => router.push(`/billing/${inv.id}`)}
                  className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{inv.patient_name}</p>
                      <StatusBadge
                        label={STATUS_CONFIG[inv.status]?.label ?? inv.status}
                        variant={STATUS_CONFIG[inv.status]?.variant ?? 'neutral'}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{inv.invoice_number} · {formatCurrency(inv.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-600 px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
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
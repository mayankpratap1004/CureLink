import { getCurrentUser }    from '@/services/auth.service'
import { getInvoiceById }    from '@/services/billing.service'
import { notFound }          from 'next/navigation'
import { PageHeader }        from '@/components/shared/page-header'
import { StatusBadge }       from '@/components/shared/status-badge'
import { InvoiceActions }    from './invoice-actions'
import { formatDate, formatCurrency } from '@/lib/utils'
import { User, Calendar, FileText, CreditCard } from 'lucide-react'

const STATUS_MAP: Record<string, any> = {
  draft:          { label: 'Draft',     variant: 'neutral' },
  sent:           { label: 'Sent',      variant: 'info'    },
  paid:           { label: 'Paid',      variant: 'success' },
  partially_paid: { label: 'Partial',   variant: 'warning' },
  overdue:        { label: 'Overdue',   variant: 'error'   },
  cancelled:      { label: 'Cancelled', variant: 'neutral' },
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user   = await getCurrentUser()
  if (!user) return null

  const invoice = await getInvoiceById(id, user.tenant_id)
  if (!invoice) notFound()

  const statusCfg = STATUS_MAP[invoice.status] ?? STATUS_MAP.draft
  const lineItems = invoice.line_items as any[]

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={invoice.invoice_number}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Billing',   href: '/billing'   },
          { label: invoice.invoice_number },
        ]}
        action={
          <StatusBadge label={statusCfg.label} variant={statusCfg.variant} />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Patient
            </h3>
            <p className="text-sm font-bold text-slate-800">{invoice.patients?.full_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{invoice.patients?.patient_code}</p>
            <p className="text-xs text-slate-400">{invoice.patients?.phone}</p>
          </div>

          {invoice.appointments && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Appointment
              </h3>
              <p className="text-sm font-semibold text-slate-800">
                {formatDate(invoice.appointments.appointment_date)}
              </p>
              <p className="text-xs text-slate-400 capitalize mt-0.5">
                {invoice.appointments.type?.replace('_', ' ')}
              </p>
              <p className="text-xs text-slate-400">
                {invoice.appointments.doctors?.users?.full_name}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Method</span>
                <span className="font-semibold text-slate-700 capitalize">
                  {invoice.payment_method?.replace('_', ' ') ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Paid on</span>
                <span className="font-semibold text-slate-700">
                  {invoice.paid_at ? formatDate(invoice.paid_at) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Due date</span>
                <span className="font-semibold text-slate-700">
                  {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="md:col-span-2 space-y-4">
          {/* Line items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Line Items
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-semibold text-slate-400 px-1 pb-2 border-b border-slate-100">
                <span className="col-span-6">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>
              {lineItems.map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-12 text-sm py-2 border-b border-slate-50 last:border-0">
                  <span className="col-span-6 text-slate-700">{item.description}</span>
                  <span className="col-span-2 text-right text-slate-500">{item.quantity}</span>
                  <span className="col-span-2 text-right text-slate-500">
                    {formatCurrency(item.unit_price)}
                  </span>
                  <span className="col-span-2 text-right font-semibold text-slate-800">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>− {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span className="text-cyan-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <InvoiceActions
            invoiceId={invoice.id}
            currentStatus={invoice.status}
            tenantId={user.tenant_id}
          />
        </div>
      </div>
    </div>
  )
}
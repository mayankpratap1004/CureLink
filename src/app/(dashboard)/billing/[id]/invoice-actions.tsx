'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'cash',        label: 'Cash'        },
  { value: 'upi',         label: 'UPI'         },
  { value: 'card',        label: 'Card'        },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'insurance',   label: 'Insurance'   },
]

interface Props {
  invoiceId: string
  currentStatus: string
  tenantId: string
}

export function InvoiceActions({ invoiceId, currentStatus, tenantId }: Props) {
  const router = useRouter()
  const [loading, setLoading]           = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function updateStatus(status: string, method?: string) {
    setLoading(true)
    const res = await fetch('/api/billing/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_id:     invoiceId,
        status,
        payment_method: method,
        tenant_id:      tenantId,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      showToast(data.error || 'Failed to update', 'error')
    } else {
      showToast('Invoice updated', 'success')
      router.refresh()
    }
    setLoading(false)
  }

  if (['paid', 'cancelled'].includes(currentStatus)) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
        <p className="text-sm text-slate-400">
          This invoice is {currentStatus}. No further actions available.
        </p>
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
          Mark as Paid
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('paid', paymentMethod)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark as Paid
            </button>

            <button
              onClick={() => updateStatus('cancelled')}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-xl border border-red-200 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
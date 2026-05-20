'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Trash2, ArrowLeft,
  Loader2, IndianRupee, User,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/page-header'
import { useCurrentUser } from '@/hooks/use-current-user'
import { createClient }   from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Patient {
  id: string
  full_name: string
  patient_code: string
  phone: string
}

interface Appointment {
  id: string
  appointment_date: string
  type: string
  slot_start: string
  doctor_name: string
  consultation_fee: number
}

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'upi',           label: 'UPI' },
  { value: 'card',          label: 'Card' },
  { value: 'net_banking',   label: 'Net Banking' },
  { value: 'insurance',     label: 'Insurance' },
]

const COMMON_ITEMS = [
  { description: 'Consultation Fee',    unit_price: 50000 },
  { description: 'Follow-up Fee',       unit_price: 30000 },
  { description: 'ECG',                 unit_price: 25000 },
  { description: 'Blood Test',          unit_price: 50000 },
  { description: 'X-Ray',               unit_price: 80000 },
  { description: 'Dressing/Procedure',  unit_price: 20000 },
]

function NewInvoiceForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user }     = useCurrentUser()

  const [patients, setPatients]       = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedPatient, setSelectedPatient]     = useState<string>('')
  const [selectedAppointment, setSelectedAppointment] = useState<string>('')
  const [lineItems, setLineItems]     = useState<LineItem[]>([
    { description: 'Consultation Fee', quantity: 1, unit_price: 50000, total: 50000 },
  ])
  const [discount, setDiscount]       = useState(0)
  const [tax, setTax]                 = useState(0)
  const [notes, setNotes]             = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [patientSearch, setPatientSearch] = useState('')

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    supabase.from('patients').select('id, full_name, patient_code, phone')
      .eq('tenant_id', user.tenant_id).is('deleted_at', null)
      .order('full_name').limit(100)
      .then(({ data }: any) => setPatients(data ?? []))

    const pid = searchParams.get('patient_id')
    if (pid) setSelectedPatient(pid)
  }, [user, searchParams])

  // Load appointments when patient selected
  useEffect(() => {
    if (!selectedPatient || !user) return
    const supabase = createClient()

    supabase.from('appointments').select(`
      id, appointment_date, type, slot_start,
      doctors!appointments_doctor_id_fkey(
        consultation_fee,
        users!doctors_user_id_fkey(full_name)
      )
    `)
      .eq('patient_id', selectedPatient)
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('appointment_date', { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        setAppointments(
          (data ?? []).map((a: any) => ({
            id: a.id,
            appointment_date: a.appointment_date,
            type: a.type,
            slot_start: a.slot_start,
            doctor_name: a.doctors?.users?.full_name ?? '',
            consultation_fee: a.doctors?.consultation_fee ?? 0,
          }))
        )
      })
  }, [selectedPatient, user])

  // Auto-fill line item when appointment selected
  useEffect(() => {
    if (!selectedAppointment) return
    const appt = appointments.find(a => a.id === selectedAppointment)
    if (!appt) return
    setLineItems([{
      description: `Consultation Fee — ${appt.doctor_name}`,
      quantity: 1,
      unit_price: appt.consultation_fee,
      total: appt.consultation_fee,
    }])
  }, [selectedAppointment, appointments])

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const grandTotal = subtotal - discount + tax

  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
  }

  function addCommonItem(item: typeof COMMON_ITEMS[0]) {
    setLineItems(prev => [...prev, {
      description: item.description,
      quantity: 1,
      unit_price: item.unit_price,
      total: item.unit_price,
    }])
  }

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patient_code.toLowerCase().includes(patientSearch.toLowerCase())
  )

  const patientObj = patients.find(p => p.id === selectedPatient)

  async function handleSubmit() {
    if (!selectedPatient) { setError('Please select a patient'); return }
    if (lineItems.some(item => !item.description)) { setError('All items need a description'); return }
    if (!user) return

    setSaving(true)
    setError('')

    const res = await fetch('/api/billing/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id:     selectedPatient,
        appointment_id: selectedAppointment || undefined,
        line_items:     lineItems,
        discount,
        tax,
        notes:          notes || undefined,
        payment_method: paymentMethod || undefined,
        tenant_id:      user.tenant_id,
        created_by:     user.id,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to create invoice')
      setSaving(false)
      return
    }

    router.push('/billing')
    router.refresh()
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New Invoice"
        description="Create a billing invoice for a patient"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Billing',   href: '/billing'   },
          { label: 'New Invoice' },
        ]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Patient */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-500" /> Select Patient
            </h3>
            <input
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              placeholder="Search patient..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 mb-3"
            />
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {filteredPatients.slice(0, 10).map(p => (
                <button key={p.id} type="button"
                  onClick={() => setSelectedPatient(p.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedPatient === p.id
                      ? 'border-cyan-400 bg-cyan-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600">
                      {p.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.full_name}</p>
                    <p className="text-xs text-slate-400">{p.patient_code} · {p.phone}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Link to appointment */}
            {selectedPatient && appointments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Link to Appointment (optional)
                </label>
                <select
                  value={selectedAppointment}
                  onChange={e => setSelectedAppointment(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
                >
                  <option value="">Select appointment</option>
                  {appointments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.appointment_date} — {a.doctor_name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-cyan-500" /> Line Items
              </h3>
            </div>

            {/* Common items */}
            <div className="flex flex-wrap gap-2 mb-4">
              {COMMON_ITEMS.map(item => (
                <button key={item.description} type="button"
                  onClick={() => addCommonItem(item)}
                  className="text-xs bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                  + {item.description}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 px-1 hidden sm:grid">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-3 text-right">Unit Price (₹)</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>

              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.description}
                    onChange={e => updateLineItem(i, 'description', e.target.value)}
                    placeholder="Item description"
                    className="col-span-12 sm:col-span-5 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                  <input
                    type="number" min="1"
                    value={item.quantity}
                    onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))}
                    className="col-span-4 sm:col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 text-right"
                  />
                  <input
                    type="number" min="0"
                    value={item.unit_price / 100}
                    onChange={e => updateLineItem(i, 'unit_price', Number(e.target.value) * 100)}
                    placeholder="0"
                    className="col-span-6 sm:col-span-3 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 text-right"
                  />
                  <p className="col-span-1 text-xs font-semibold text-slate-700 text-right hidden sm:block">
                    {formatCurrency(item.total)}
                  </p>
                  <button type="button" onClick={() => removeLineItem(i)}
                    className="col-span-2 sm:col-span-1 p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addLineItem}
              className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 mt-4 font-medium">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Notes (optional)</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
            />
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Invoice Summary</h3>

            {patientObj && (
              <div className="p-3 bg-slate-50 rounded-xl mb-4">
                <p className="text-xs text-slate-400 mb-1">Patient</p>
                <p className="text-sm font-semibold text-slate-800">{patientObj.full_name}</p>
                <p className="text-xs text-slate-400">{patientObj.patient_code}</p>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount (₹)</span>
                <input
                  type="number" min="0"
                  value={discount / 100}
                  onChange={e => setDiscount(Number(e.target.value) * 100)}
                  className="w-24 px-2 py-1 text-sm text-right border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tax (₹)</span>
                <input
                  type="number" min="0"
                  value={tax / 100}
                  onChange={e => setTax(Number(e.target.value) * 100)}
                  className="w-24 px-2 py-1 text-sm text-right border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-800">Total</span>
                <span className="text-lg font-black text-cyan-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-600">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 bg-white"
              >
                <option value="">Mark as unpaid</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {paymentMethod ? 'Invoice will be marked as Paid' : 'Invoice will be marked as Sent'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSubmit}
                disabled={saving || !selectedPatient || lineItems.length === 0}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
              <Link href="/billing"
                className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 py-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-2xl" />}>
      <NewInvoiceForm />
    </Suspense>
  )
}
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface InvoiceWithDetails {
  id: string
  tenant_id: string
  patient_id: string
  appointment_id: string | null
  invoice_number: string
  line_items: any[]
  subtotal: number
  discount: number
  tax: number
  total: number
  status: string
  payment_method: string | null
  notes: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
  patient_name: string
  patient_code: string
  patient_phone: string
}

export async function getInvoices(
  tenantId: string,
  options: { status?: string; page?: number; pageSize?: number; search?: string } = {}
) {
  const { status, page = 1, pageSize = 20, search = '' } = options
  const supabase = await createClient()

  let query = supabase
    .from('billing_invoices')
    .select(`
      *,
      patients!billing_invoices_patient_id_fkey(full_name, patient_code, phone)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('invoice_number', `%${search}%`)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data: (data ?? []).map((inv: any) => ({
      ...inv,
      patient_name:  inv.patients?.full_name ?? '',
      patient_code:  inv.patients?.patient_code ?? '',
      patient_phone: inv.patients?.phone ?? '',
    })) as InvoiceWithDetails[],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getInvoiceById(id: string, tenantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      patients!billing_invoices_patient_id_fkey(full_name, patient_code, phone, email, address),
      appointments!billing_invoices_appointment_id_fkey(
        appointment_date, slot_start, type,
        doctors!appointments_doctor_id_fkey(
          users!doctors_user_id_fkey(full_name)
        )
      )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return null
  return data as any
}

export async function getBillingStats(tenantId: string) {
  const supabase = await createClient()

  const [
    { count: total },
    { count: paid },
    { count: pending },
    { count: overdue },
  ] = await Promise.all([
    supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'paid').is('deleted_at', null),
    supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).in('status', ['draft', 'sent']).is('deleted_at', null),
    supabase.from('billing_invoices').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'overdue').is('deleted_at', null),
  ])

  // Total revenue from paid invoices
  const { data: revenueData } = await supabase
    .from('billing_invoices')
    .select('total')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .is('deleted_at', null)

  const totalRevenue = (revenueData ?? []).reduce((sum: number, inv: any) => sum + (inv.total ?? 0), 0)

  return {
    total:        total ?? 0,
    paid:         paid ?? 0,
    pending:      pending ?? 0,
    overdue:      overdue ?? 0,
    totalRevenue,
  }
}
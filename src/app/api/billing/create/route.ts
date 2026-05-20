import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const lineItemSchema = z.object({
  description: z.string(),
  quantity:    z.coerce.number().min(1),
  unit_price:  z.coerce.number().min(0),
  total:       z.coerce.number().min(0),
})

const schema = z.object({
  patient_id:     z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
  line_items:     z.array(lineItemSchema).min(1),
  discount:       z.coerce.number().min(0).default(0),
  tax:            z.coerce.number().min(0).default(0),
  notes:          z.string().optional(),
  due_date:       z.string().optional(),
  payment_method: z.string().optional(),
  tenant_id:      z.string().uuid(),
  created_by:     z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { tenant_id, created_by, line_items, discount, tax, ...rest } = parsed.data

    // Calculate totals (amounts in paise)
    const subtotal = line_items.reduce((sum, item) => sum + item.total, 0)
    const total    = subtotal - discount + tax

    // Generate invoice number
    const supabase = await createClient()
    const { data: invNum } = await supabase.rpc('generate_invoice_number', {
      p_tenant_id: tenant_id,
    })

    const { data, error } = await supabase
      .from('billing_invoices')
      .insert({
        ...rest,
        tenant_id,
        created_by,
        line_items,
        subtotal,
        discount,
        tax,
        total,
        invoice_number: invNum ?? `INV-${Date.now()}`,
        status: rest.payment_method ? 'paid' : 'sent',
        paid_at: rest.payment_method ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
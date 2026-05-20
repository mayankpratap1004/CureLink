import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  invoice_id:     z.string().uuid(),
  status:         z.enum(['draft','sent','paid','partially_paid','overdue','cancelled']),
  payment_method: z.string().optional(),
  tenant_id:      z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { invoice_id, status, payment_method, tenant_id } = parsed.data
    const supabase = await createClient()

    const updateData: any = { status }
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
      if (payment_method) updateData.payment_method = payment_method
    }

    const { error } = await supabase
      .from('billing_invoices')
      .update(updateData)
      .eq('id', invoice_id)
      .eq('tenant_id', tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  patient_id:       z.string().uuid(),
  doctor_id:        z.string().uuid(),
  department_id:    z.string().uuid().optional(),
  appointment_date: z.string(),
  slot_start:       z.string(),
  slot_end:         z.string(),
  type:             z.enum(['consultation','follow_up','emergency','procedure']).default('consultation'),
  notes:            z.string().optional(),
  tenant_id:        z.string().uuid(),
  created_by:       z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { tenant_id, ...rest } = parsed.data

    // Check for slot conflict
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', rest.doctor_id)
      .eq('appointment_date', rest.appointment_date)
      .eq('slot_start', rest.slot_start)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","no_show")')
      .single()

    if (conflict) {
      return NextResponse.json(
        { error: 'This slot is already booked. Please choose another slot.' },
        { status: 409 }
      )
    }

    // Get next token number for this doctor+date
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', rest.doctor_id)
      .eq('appointment_date', rest.appointment_date)
      .is('deleted_at', null)

    const token_number = (count ?? 0) + 1

    const { data, error } = await supabase
      .from('appointments')
      .insert({ ...rest, tenant_id, token_number })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
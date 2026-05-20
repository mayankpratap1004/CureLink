import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const medicineSchema = z.object({
  name:         z.string(),
  dosage:       z.string(),
  frequency:    z.string(),
  duration:     z.string(),
  instructions: z.string().optional(),
  quantity:     z.string().optional(),
})

const schema = z.object({
  appointment_id: z.string().uuid(),
  patient_id:     z.string().uuid(),
  doctor_id:      z.string().uuid(),
  diagnosis:      z.string().min(1),
  medicines:      z.array(medicineSchema).min(1),
  instructions:   z.string().optional(),
  follow_up_date: z.string().optional(),
  tenant_id:      z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        ...parsed.data,
        follow_up_date: parsed.data.follow_up_date || null,
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
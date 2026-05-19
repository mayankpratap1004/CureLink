import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  appointment_id:      z.string().uuid(),
  status:              z.enum(['scheduled','confirmed','checked_in','in_consultation','completed','cancelled','no_show']),
  cancellation_reason: z.string().optional(),
  tenant_id:           z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { appointment_id, status, cancellation_reason, tenant_id } = parsed.data
    const supabase = await createClient()

    const updateData: any = { status }
    if (cancellation_reason) updateData.cancellation_reason = cancellation_reason

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointment_id)
      .eq('tenant_id', tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // If checked_in → auto create queue entry
  // If checked_in → create queue entry
if (status === 'checked_in') {
  const { data: appt } = await supabase
    .from('appointments')
    .select('doctor_id, patient_id, token_number, type')
    .eq('id', appointment_id)
    .single()

  if (appt) {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', appt.doctor_id)
      .eq('queue_date', today)

    await supabase.from('queue_entries').insert({
      tenant_id,
      appointment_id,
      patient_id:   appt.patient_id,
      doctor_id:    appt.doctor_id,
      queue_date:   today,
      token_number: appt.token_number ?? (count ?? 0) + 1,
      status:       'waiting',
      priority:     appt.type === 'emergency' ? 999 : 0,
      checked_in_at: new Date().toISOString(),
    })
  }
}

// If in_consultation → update queue entry to in_progress
if (status === 'in_consultation') {
  await supabase
    .from('queue_entries')
    .update({ 
      status: 'in_progress',
      called_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    })
    .eq('appointment_id', appointment_id)
    .eq('tenant_id', tenant_id)
}

// If completed → update queue entry to completed
if (status === 'completed') {
  const now = new Date().toISOString()
  
  // Get queue entry to calculate wait time
  const { data: queueEntry } = await supabase
    .from('queue_entries')
    .select('checked_in_at')
    .eq('appointment_id', appointment_id)
    .single()

  const waitMinutes = queueEntry?.checked_in_at
    ? Math.round((Date.now() - new Date(queueEntry.checked_in_at).getTime()) / 60000)
    : null

  await supabase
    .from('queue_entries')
    .update({ 
      status: 'completed',
      completed_at: now,
      wait_minutes: waitMinutes,
    })
    .eq('appointment_id', appointment_id)
    .eq('tenant_id', tenant_id)
}

// If cancelled or no_show → update queue entry to skipped
if (status === 'cancelled' || status === 'no_show') {
  await supabase
    .from('queue_entries')
    .update({ status: 'skipped' })
    .eq('appointment_id', appointment_id)
    .eq('tenant_id', tenant_id)
}

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/services/appointment.service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const doctorId  = searchParams.get('doctor_id')
  const date      = searchParams.get('date')
  const tenantId  = searchParams.get('tenant_id')

  if (!doctorId || !date || !tenantId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    const slots = await getAvailableSlots(doctorId, tenantId, date)
    return NextResponse.json({ slots })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
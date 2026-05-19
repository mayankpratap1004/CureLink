import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface AppointmentWithDetails {
  id: string
  tenant_id: string
  patient_id: string
  doctor_id: string
  department_id: string | null
  appointment_date: string
  slot_start: string
  slot_end: string
  status: string
  type: string
  token_number: number | null
  notes: string | null
  cancellation_reason: string | null
  created_at: string
  // joined
  patient_name: string
  patient_code: string
  patient_phone: string
  doctor_name: string
  doctor_specialization: string
  department_name: string | null
}

export async function getAppointments(
  tenantId: string,
  options: {
    date?: string
    doctorId?: string
    status?: string
    page?: number
    pageSize?: number
  } = {}
) {
  const { date, doctorId, status, page = 1, pageSize = 20 } = options
  const supabase = await createClient()

  let query = supabase
    .from('appointments')
    .select(`
      *,
      patients!appointments_patient_id_fkey(full_name, patient_code, phone),
      doctors!appointments_doctor_id_fkey(
        specialization,
        users!doctors_user_id_fkey(full_name)
      ),
      departments(name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('appointment_date', { ascending: false })
    .order('slot_start', { ascending: true })

  if (date)     query = query.eq('appointment_date', date)
  if (doctorId) query = query.eq('doctor_id', doctorId)
  if (status)   query = query.eq('status', status)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const mapped = (data ?? []).map((a: any) => ({
    ...a,
    patient_name:          a.patients?.full_name ?? '',
    patient_code:          a.patients?.patient_code ?? '',
    patient_phone:         a.patients?.phone ?? '',
    doctor_name:           a.doctors?.users?.full_name ?? '',
    doctor_specialization: a.doctors?.specialization ?? '',
    department_name:       a.departments?.name ?? null,
  }))

  return {
    data: mapped as AppointmentWithDetails[],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getAppointmentById(id: string, tenantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients!appointments_patient_id_fkey(full_name, patient_code, phone, gender, date_of_birth, blood_group),
      doctors!appointments_doctor_id_fkey(
        specialization, consultation_fee,
        users!doctors_user_id_fkey(full_name, email, phone)
      ),
      departments(name, color)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return null
  return data as any
}

export async function getAvailableSlots(
  doctorId: string,
  tenantId: string,
  date: string
): Promise<{ start: string; end: string; available: boolean }[]> {
  const supabase = await createClient()

  // Get day of week (0=Sun)
  const dayOfWeek = new Date(date).getDay()

  // Get doctor schedule for that day
  const { data: schedule } = await supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('tenant_id', tenantId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  if (!schedule) return []

  // Check for leave
  const { data: leave } = await supabase
    .from('doctor_leaves')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('leave_date', date)
    .single()

  if (leave) return []

  // Get existing appointments for that day
  const { data: booked } = await supabase
    .from('appointments')
    .select('slot_start, slot_end')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .is('deleted_at', null)
    .not('status', 'in', '("cancelled","no_show")')

  const bookedSlots = new Set(
    (booked ?? []).map((b: any) => b.slot_start)
  )

  // Generate slots
  const slots: { start: string; end: string; available: boolean }[] = []
  const [startH, startM] = schedule.start_time.split(':').map(Number)
  const [endH, endM]     = schedule.end_time.split(':').map(Number)
  const duration         = schedule.slot_duration_min

  let current = startH * 60 + startM
  const end   = endH * 60 + endM

  while (current + duration <= end) {
    const h  = Math.floor(current / 60)
    const m  = current % 60
    const eh = Math.floor((current + duration) / 60)
    const em = (current + duration) % 60

    const startStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
    const endStr   = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:00`

    slots.push({
      start:     startStr,
      end:       endStr,
      available: !bookedSlots.has(startStr),
    })

    current += duration
  }

  return slots
}

export async function getTodayStats(tenantId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: total },
    { count: scheduled },
    { count: completed },
    { count: cancelled },
  ] = await Promise.all([
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('appointment_date', today).is('deleted_at', null),
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('appointment_date', today)
      .in('status', ['scheduled','confirmed','checked_in']).is('deleted_at', null),
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('appointment_date', today)
      .eq('status', 'completed').is('deleted_at', null),
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('appointment_date', today)
      .eq('status', 'cancelled').is('deleted_at', null),
  ])

  return {
    total:     total ?? 0,
    scheduled: scheduled ?? 0,
    completed: completed ?? 0,
    cancelled: cancelled ?? 0,
  }
}
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface PrescriptionWithDetails {
  id: string
  tenant_id: string
  appointment_id: string
  doctor_id: string
  patient_id: string
  diagnosis: string
  medicines: any[]
  instructions: string | null
  follow_up_date: string | null
  issued_at: string
  patient_name: string
  patient_code: string
  doctor_name: string
  appointment_date: string
}

export async function getPrescriptions(
  tenantId: string,
  options: { doctorId?: string; patientId?: string; page?: number; pageSize?: number } = {}
) {
  const { doctorId, patientId, page = 1, pageSize = 20 } = options
  const supabase = await createClient()

  let query = supabase
    .from('prescriptions')
    .select(`
      *,
      patients!prescriptions_patient_id_fkey(full_name, patient_code),
      doctors!prescriptions_doctor_id_fkey(
        users!doctors_user_id_fkey(full_name)
      ),
      appointments!prescriptions_appointment_id_fkey(appointment_date)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('issued_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (doctorId)  query = query.eq('doctor_id', doctorId)
  if (patientId) query = query.eq('patient_id', patientId)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data: (data ?? []).map((p: any) => ({
      ...p,
      patient_name:     p.patients?.full_name ?? '',
      patient_code:     p.patients?.patient_code ?? '',
      doctor_name:      p.doctors?.users?.full_name ?? '',
      appointment_date: p.appointments?.appointment_date ?? '',
    })) as PrescriptionWithDetails[],
    count:      count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getPrescriptionById(id: string, tenantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patients!prescriptions_patient_id_fkey(full_name, patient_code, phone, date_of_birth, gender, blood_group),
      doctors!prescriptions_doctor_id_fkey(
        specialization, license_number,
        users!doctors_user_id_fkey(full_name, email)
      ),
      appointments!prescriptions_appointment_id_fkey(appointment_date, type)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return null
  return data as any
}
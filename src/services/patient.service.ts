import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Patient, PaginatedResult } from '@/types/app'
import type { CreatePatientInput } from '@/lib/validations/patient'

export async function getPatients(
  tenantId: string,
  options: { page?: number; pageSize?: number; search?: string } = {}
): Promise<PaginatedResult<Patient>> {
  const { page = 1, pageSize = 20, search = '' } = options
  const supabase = await createClient()

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,patient_code.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw new Error(error.message)

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getPatientById(id: string, tenantId: string): Promise<Patient | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return null
  return data
}

export async function createPatient(
  tenantId: string,
  input: CreatePatientInput
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  const supabase = await createClient()

  // Generate patient code
  const { data: seqData } = await supabase.rpc('generate_patient_code', {
    p_tenant_id: tenantId,
  })

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...input,
      tenant_id: tenantId,
      patient_code: seqData ?? `PT-${Date.now()}`,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function updatePatient(
  id: string,
  tenantId: string,
  input: Partial<CreatePatientInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('patients')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deletePatient(id: string, tenantId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function getPatientStats(tenantId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  return { total: count ?? 0 }
}
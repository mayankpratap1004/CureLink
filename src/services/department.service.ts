import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Department } from '@/types/app'
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/lib/validations/department'

export async function getDepartments(tenantId: string): Promise<Department[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createDepartment(
  tenantId: string,
  input: CreateDepartmentInput
): Promise<Department> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .insert({ ...input, tenant_id: tenantId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateDepartment(
  id: string,
  tenantId: string,
  input: UpdateDepartmentInput
): Promise<Department> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteDepartment(id: string, tenantId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('departments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function toggleDepartmentStatus(
  id: string,
  tenantId: string,
  isActive: boolean
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('departments')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}
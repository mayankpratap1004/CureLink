import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface DoctorWithDetails {
  id: string
  tenant_id: string
  user_id: string
  department_id: string | null
  specialization: string
  license_number: string
  qualification: string | null
  experience_years: number
  consultation_fee: number
  avg_consultation_min: number
  bio: string | null
  is_active: boolean
  created_at: string
  full_name: string
  email: string
  phone: string | null
  department_name: string | null
  department_color: string | null
}

export async function getDoctors(tenantId: string): Promise<DoctorWithDetails[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      users!doctors_user_id_fkey(full_name, email, phone),
      departments(name, color)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((d: any) => ({
    ...d,
    full_name: d.users?.full_name ?? '',
    email: d.users?.email ?? '',
    phone: d.users?.phone ?? null,
    department_name: d.departments?.name ?? null,
    department_color: d.departments?.color ?? null,
  }))
}

export async function getDoctorById(id: string, tenantId: string): Promise<DoctorWithDetails | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      users!doctors_user_id_fkey(full_name, email, phone),
      departments(name, color)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return null

  return {
    ...(data as any),
    full_name: (data as any).users?.full_name ?? '',
    email: (data as any).users?.email ?? '',
    phone: (data as any).users?.phone ?? null,
    department_name: (data as any).departments?.name ?? null,
    department_color: (data as any).departments?.color ?? null,
  }
}

export async function createDoctor(
  tenantId: string,
  input: {
    full_name: string
    email: string
    phone: string
    specialization: string
    license_number: string
    qualification?: string
    experience_years: number
    consultation_fee: number
    avg_consultation_min: number
    department_id?: string
    bio?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create auth user via admin client
    const adminClient = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    ) as any

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: Math.random().toString(36).slice(-10) + 'A1!',
      email_confirm: true,
    })

    if (authError) return { success: false, error: authError.message }

    const userId = authData.user.id

    // Create user profile
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenantId,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
      })

    if (userError) return { success: false, error: userError.message }

    // Get doctor role
    const { data: roleData } = await adminClient
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', 'doctor')
      .single()

    // Assign doctor role
    if (roleData) {
      await adminClient.from('user_roles').insert({
        user_id: userId,
        role_id: roleData.id,
        tenant_id: tenantId,
      })
    }

    // Create doctor record
    const { error: doctorError } = await adminClient
      .from('doctors')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        department_id: input.department_id || null,
        specialization: input.specialization,
        license_number: input.license_number,
        qualification: input.qualification || null,
        experience_years: input.experience_years,
        consultation_fee: input.consultation_fee * 100, // store in paise
        avg_consultation_min: input.avg_consultation_min,
        bio: input.bio || null,
      })

    if (doctorError) return { success: false, error: doctorError.message }

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create doctor' }
  }
}

export async function toggleDoctorStatus(
  id: string,
  tenantId: string,
  isActive: boolean
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('doctors')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}
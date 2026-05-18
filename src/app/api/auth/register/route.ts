import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
) as any

const schema = z.object({
  hospital_name: z.string().min(3),
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
})

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { hospital_name, full_name, email, phone, password } = parsed.data

    // 1. Create tenant
    const slug = slugify(hospital_name) + '-' + Date.now().toString(36)

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({ name: hospital_name, slug, plan: 'starter' })
      .select()
      .single()

    if (tenantError || !tenant) {
      throw new Error(tenantError?.message ?? 'Failed to create tenant')
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin
      .auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      throw new Error(authError?.message ?? 'Failed to create user')
    }

    const userId = authData.user.id

    // 3. Create user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenant.id,
        full_name,
        email,
        phone,
      })

    if (userError) throw new Error(userError.message)

    // 4. Seed default roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .insert([
        { tenant_id: tenant.id, name: 'admin',        permissions: { all: true } },
        { tenant_id: tenant.id, name: 'doctor',       permissions: { patients: true, appointments: true, prescriptions: true, records: true } },
        { tenant_id: tenant.id, name: 'receptionist', permissions: { patients: true, appointments: true, queue: true, billing: true } },
        { tenant_id: tenant.id, name: 'patient',      permissions: { own_records: true } },
      ])
      .select()

    if (rolesError || !roles) throw new Error(rolesError?.message ?? 'Failed to create roles')

    // 5. Assign admin role
    const adminRole = (roles as { id: string; name: string }[]).find(r => r.name === 'admin')
    if (adminRole) {
      await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        role_id: adminRole.id,
        tenant_id: tenant.id,
      })
    }

    // 6. Seed default departments
    await supabaseAdmin.from('departments').insert([
      { tenant_id: tenant.id, name: 'General Medicine', color: '#6366f1' },
      { tenant_id: tenant.id, name: 'Cardiology',       color: '#ef4444' },
      { tenant_id: tenant.id, name: 'Paediatrics',      color: '#f59e0b' },
      { tenant_id: tenant.id, name: 'Orthopaedics',     color: '#10b981' },
    ])

    return NextResponse.json({ success: true, tenant_id: tenant.id })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
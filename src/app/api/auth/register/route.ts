import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

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
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { hospital_name, full_name, email, phone, password } = parsed.data

    // 1. Create tenant
    const slug = slugify(hospital_name) + '-' + Date.now().toString(36)

    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({ name: hospital_name, slug, plan: 'starter' })
      .select()
      .single()

    if (tenantError) throw new Error(tenantError.message)

    // 2. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      // Rollback tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id)
      throw new Error(authError.message)
    }

    const userId = authData.user.id

    // 3. Create user profile
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenant.id,
        full_name,
        email,
        phone,
      })

    if (userError) throw new Error(userError.message)

    // 4. Seed default roles for this tenant
    const { data: roles, error: rolesError } = await adminClient
      .from('roles')
      .insert([
        { tenant_id: tenant.id, name: 'admin',        permissions: { all: true } },
        { tenant_id: tenant.id, name: 'doctor',       permissions: { patients: true, appointments: true, prescriptions: true, records: true } },
        { tenant_id: tenant.id, name: 'receptionist', permissions: { patients: true, appointments: true, queue: true, billing: true } },
        { tenant_id: tenant.id, name: 'patient',      permissions: { own_records: true } },
      ])
      .select()

    if (rolesError) throw new Error(rolesError.message)

    // 5. Assign admin role to this user
    const adminRole = roles.find(r => r.name === 'admin')
    if (adminRole) {
      await adminClient.from('user_roles').insert({
        user_id: userId,
        role_id: adminRole.id,
        tenant_id: tenant.id,
      })
    }

    // 6. Seed default departments
    await adminClient.from('departments').insert([
      { tenant_id: tenant.id, name: 'General Medicine', color: '#6366f1' },
      { tenant_id: tenant.id, name: 'Cardiology',       color: '#ef4444' },
      { tenant_id: tenant.id, name: 'Paediatrics',      color: '#f59e0b' },
      { tenant_id: tenant.id, name: 'Orthopaedics',     color: '#10b981' },
    ])

    // 7. Sign in the user and return session
    const { data: signInData, error: signInError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (signInError) throw new Error(signInError.message)

    return NextResponse.json({ success: true, tenant_id: tenant.id })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
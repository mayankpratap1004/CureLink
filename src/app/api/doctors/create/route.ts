import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  specialization: z.string().min(2),
  license_number: z.string().min(3),
  qualification: z.string().optional(),
  experience_years: z.coerce.number().default(0),
  consultation_fee: z.coerce.number().min(0),
  avg_consultation_min: z.coerce.number().default(15),
  department_id: z.string().optional(),
  bio: z.string().optional(),
  tenant_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { tenant_id, full_name, email, phone, consultation_fee, department_id, ...rest } = parsed.data

    const admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    ) as any

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8) + 'A1!',
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id

    // Create user profile
    await admin.from('users').insert({ id: userId, tenant_id, full_name, email, phone })

    // Assign doctor role
    const { data: role } = await admin
      .from('roles').select('id').eq('tenant_id', tenant_id).eq('name', 'doctor').single()
    if (role) {
      await admin.from('user_roles').insert({ user_id: userId, role_id: role.id, tenant_id })
    }

    // Create doctor record
    const { error: doctorError } = await admin.from('doctors').insert({
      tenant_id,
      user_id: userId,
      department_id: department_id || null,
      consultation_fee: consultation_fee * 100,
      ...rest,
    })

    if (doctorError) return NextResponse.json({ error: doctorError.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
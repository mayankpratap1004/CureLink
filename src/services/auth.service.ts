import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CurrentUser } from '@/types/app'

interface UserProfile {
  tenant_id: string
  full_name: string
  email: string
  avatar_url: string | null
  user_roles: {
    roles: {
      name: string
      permissions: Record<string, boolean>
    } | null
  }[]
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data, error: profileError } = await supabase
    .from('users')
    .select('tenant_id, full_name, email, avatar_url, user_roles(roles(name, permissions))')
    .eq('id', user.id)
    .single()


  const profile = data as unknown as UserProfile | null

  if (!profile) return null

  const roleData = profile.user_roles?.[0]?.roles

  return {
    id: user.id,
    tenant_id: profile.tenant_id,
    full_name: profile.full_name,
    email: profile.email,
    avatar_url: profile.avatar_url,
    role: (roleData?.name ?? 'patient') as CurrentUser['role'],
    permissions: roleData?.permissions ?? {},
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
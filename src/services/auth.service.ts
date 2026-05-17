import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CurrentUser } from '@/types/app'

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*, user_roles(role_id, roles(name, permissions))')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const roleData = profile.user_roles?.[0]?.roles as { name: string; permissions: Record<string, boolean> } | undefined

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
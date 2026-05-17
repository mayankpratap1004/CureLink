'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CurrentUser } from '@/types/app'

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*, user_roles(role_id, roles(name, permissions))')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        const roleData = profile.user_roles?.[0]?.roles as
          { name: string; permissions: Record<string, boolean> } | undefined

        setUser({
          id: authUser.id,
          tenant_id: profile.tenant_id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          role: (roleData?.name ?? 'patient') as CurrentUser['role'],
          permissions: roleData?.permissions ?? {},
        })
      }

      setLoading(false)
    }

    load()
  }, [])

  return { user, loading }
}
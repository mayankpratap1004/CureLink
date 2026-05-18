'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

      const { data } = await supabase
        .from('users')
        .select('tenant_id, full_name, email, avatar_url, user_roles(roles(name, permissions))')
        .eq('id', authUser.id)
        .single()

      const profile = data as unknown as UserProfile | null

      if (profile) {
        const roleData = profile.user_roles?.[0]?.roles

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
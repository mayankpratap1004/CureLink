'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface QueueEntry {
  id: string
  appointment_id: string
  patient_id: string
  doctor_id: string
  queue_date: string
  token_number: number
  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'skipped'
  priority: number
  checked_in_at: string | null
  called_at: string | null
  started_at: string | null
  completed_at: string | null
  wait_minutes: number | null
  // joined
  patient_name: string
  patient_phone: string
  patient_code: string
  doctor_name: string
  appointment_type: string
  slot_start: string
}

export function useRealtimeQueue(tenantId: string, doctorId?: string, date?: string) {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)

  const today = date ?? new Date().toISOString().split('T')[0]

  const fetchQueue = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('queue_entries')
      .select(`
        *,
        patients!queue_entries_patient_id_fkey(full_name, phone, patient_code),
        doctors!queue_entries_doctor_id_fkey(
          users!doctors_user_id_fkey(full_name)
        ),
        appointments!queue_entries_appointment_id_fkey(type, slot_start)
      `)
      .eq('tenant_id', tenantId)
      .eq('queue_date', today)
      .order('priority', { ascending: false })
      .order('token_number', { ascending: true })

    if (doctorId) query = query.eq('doctor_id', doctorId)

    const { data } = await query

    setQueue(
      (data ?? []).map((q: any) => ({
        ...q,
        patient_name:     q.patients?.full_name ?? '',
        patient_phone:    q.patients?.phone ?? '',
        patient_code:     q.patients?.patient_code ?? '',
        doctor_name:      q.doctors?.users?.full_name ?? '',
        appointment_type: q.appointments?.type ?? 'consultation',
        slot_start:       q.appointments?.slot_start ?? '',
      }))
    )
    setLoading(false)
  }, [tenantId, doctorId, today])

  useEffect(() => {
    if (!tenantId) return
    fetchQueue()

    // Supabase realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`queue:${tenantId}:${doctorId ?? 'all'}:${today}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Refetch on any change
          fetchQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, doctorId, today, fetchQueue])

  // Stats
  const waiting    = queue.filter(q => q.status === 'waiting')
  const inProgress = queue.filter(q => q.status === 'in_progress')
  const completed  = queue.filter(q => q.status === 'completed')
  const skipped    = queue.filter(q => q.status === 'skipped')

  // Current token being served
  const currentToken = inProgress[0] ?? null

  // ETA calculation
  function getETA(tokenNumber: number, avgMinutes = 15): number {
    const tokensAhead = waiting.filter(q => q.token_number < tokenNumber).length
    const currentOvertime = currentToken
      ? Math.max(0, (Date.now() - new Date(currentToken.started_at ?? Date.now()).getTime()) / 60000 - avgMinutes)
      : 0
    return Math.round(tokensAhead * avgMinutes + currentOvertime)
  }

  return {
    queue,
    waiting,
    inProgress,
    completed,
    skipped,
    currentToken,
    loading,
    refetch: fetchQueue,
    getETA,
    stats: {
      total:     queue.length,
      waiting:   waiting.length,
      inProgress: inProgress.length,
      completed: completed.length,
      skipped:   skipped.length,
    },
  }
}
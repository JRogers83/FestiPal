'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ConnectionWithUser } from '@/types'

export function useConnections(userId: string) {
  return useQuery<ConnectionWithUser[]>({
    queryKey: ['connections', userId],
    queryFn: async () => {
      const res = await fetch(`/api/connections/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch connections')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useRemoveConnection(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await fetch(`/api/connections/${connectionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove connection')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections', userId] }),
  })
}

export function useAddDirectConnection(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { targetUserId?: string; token?: string }): Promise<{ nickname: string }> => {
      const res = await fetch('/api/connections/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to connect')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections', userId] }),
  })
}

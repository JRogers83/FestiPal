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

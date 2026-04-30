'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User, UserWithSelections } from '@/types'

export function useUser(userId: string) {
  return useQuery<UserWithSelections | null>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error('User not found')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useEnsureUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      })
      if (!res.ok && res.status !== 409) throw new Error('Failed to create user')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  })
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { nickname?: string; colour?: string }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update user')
      return res.json() as Promise<User>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  })
}

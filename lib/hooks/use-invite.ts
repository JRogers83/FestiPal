'use client'

import { useMutation } from '@tanstack/react-query'

export function useCreateInvite() {
  return useMutation({
    mutationFn: async (createdBy: string): Promise<string> => {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdBy }),
      })
      if (!res.ok) throw new Error('Failed to create invite')
      const { token } = await res.json()
      return `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${token}`
    },
  })
}

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useToggleSelection(userId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ actId, selected }: { actId: string; selected: boolean }) => {
      const res = await fetch('/api/selections', {
        method: selected ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, actId }),
      })
      if (!res.ok) throw new Error('Failed to toggle selection')
    },
    onMutate: async ({ actId, selected }) => {
      await qc.cancelQueries({ queryKey: ['user', userId] })
      const prev = qc.getQueryData<{ selections: string[] }>(['user', userId])
      qc.setQueryData(['user', userId], (old: { selections: string[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          selections: selected
            ? old.selections.filter((id: string) => id !== actId)
            : [...old.selections, actId],
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user', userId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user', userId] }),
  })
}

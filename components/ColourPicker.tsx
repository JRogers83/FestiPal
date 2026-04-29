'use client'

import { useState } from 'react'
import { USER_COLOURS } from '@/constants/colours'

type Props = {
  value: string
  onChange: (hex: string) => void
}

export function ColourPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full border-2 hover:border-white transition-colors"
        style={{ backgroundColor: value, borderColor: 'var(--colour-border)' }}
        aria-label="Pick colour"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className="absolute top-9 left-0 z-30 p-2 rounded grid grid-cols-4 gap-1"
            style={{ backgroundColor: 'var(--colour-surface)', border: '1px solid var(--colour-border)' }}
          >
            {USER_COLOURS.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.hex); setOpen(false) }}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c.hex,
                  borderColor: value === c.hex ? '#fff' : 'transparent',
                  transform: value === c.hex ? 'scale(1.15)' : 'scale(1)',
                }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

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
            className="absolute top-9 left-0 z-30 rounded"
            style={{
              backgroundColor: 'var(--colour-surface)',
              border: '1px solid var(--colour-border)',
              padding: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 32px)',
              gap: 4,
            }}
          >
            {USER_COLOURS.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.hex); setOpen(false) }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: c.hex,
                  border: `${value === c.hex ? 3 : 2}px solid ${value === c.hex ? '#fff' : 'transparent'}`,
                  outline: value === c.hex ? '2px solid rgba(255,255,255,0.25)' : 'none',
                  outlineOffset: 1,
                  transform: value === c.hex ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.1s, border-color 0.1s',
                  cursor: 'pointer',
                  flexShrink: 0,
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

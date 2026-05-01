import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActCard } from '../ActCard'
import type { Act } from '@/types'

const baseAct: Act = {
  id: 'act-1',
  name: 'Sleep Token',
  stageId: 'main-stage',
  festivalDayId: 'friday',
  date: '2026-06-12',
  startTime: '15:30',
  endTime: '16:30',
  headliner: false,
}

describe('ActCard', () => {
  const defaultProps = {
    act: baseAct,
    top: 200,
    height: 120,
    isSelected: false,
    userColour: '#3b82f6',
    selectedByOthers: [],
    isClashing: false,
    clashColour: undefined as string | undefined,
    onToggle: vi.fn(),
  }

  it('renders the act name', () => {
    render(<ActCard {...defaultProps} />)
    expect(screen.getByText('Sleep Token')).toBeInTheDocument()
  })

  it('renders start time', () => {
    render(<ActCard {...defaultProps} />)
    expect(screen.getByText('15:30')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<ActCard {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows colour dots for others who selected this act', () => {
    const props = {
      ...defaultProps,
      selectedByOthers: [
        { userId: 'u1', colour: '#22c55e', nickname: 'Alice' },
        { userId: 'u2', colour: '#ec4899', nickname: 'Bob' },
      ],
    }
    render(<ActCard {...props} />)
    const dots = document.querySelectorAll('[data-testid="user-dot"]')
    expect(dots).toHaveLength(2)
  })

  it('applies minimum height of 120px for headliner acts', () => {
    const props = { ...defaultProps, act: { ...baseAct, headliner: true }, height: 40 }
    render(<ActCard {...props} />)
    const card = screen.getByRole('button')
    expect(card).toHaveStyle({ minHeight: '120px' })
  })
})

export const USER_COLOURS = [
  { id: 'blue',   hex: '#3b82f6', label: 'Blue'   },
  { id: 'cyan',   hex: '#06b6d4', label: 'Cyan'   },
  { id: 'teal',   hex: '#14b8a6', label: 'Teal'   },
  { id: 'green',  hex: '#22c55e', label: 'Green'  },
  { id: 'lime',   hex: '#a3e635', label: 'Lime'   },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'amber',  hex: '#f97316', label: 'Amber'  },
  { id: 'pink',   hex: '#ec4899', label: 'Pink'   },
  { id: 'rose',   hex: '#f43f5e', label: 'Rose'   },
  { id: 'purple', hex: '#8b5cf6', label: 'Purple' },
  { id: 'violet', hex: '#a855f7', label: 'Violet' },
  { id: 'white',  hex: '#e5e5e5', label: 'White'  },
] as const

export type UserColour = (typeof USER_COLOURS)[number]

export const DEFAULT_COLOUR = USER_COLOURS[0].hex

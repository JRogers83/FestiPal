export type FestivalDay = {
  id: string
  label: string
  date: string      // "YYYY-MM-DD"
  ordinal: number
}

export type Stage = {
  id: string
  name: string
  ordinal: number
}

export type Act = {
  id: string
  name: string
  stageId: string
  festivalDayId: string
  date: string       // "YYYY-MM-DD" — physical calendar date the act starts
  startTime: string  // "HH:MM"
  endTime: string    // "HH:MM" — if < startTime the act spans midnight
  headliner: boolean
}

export type Lineup = {
  stages: Stage[]
  festivalDays: FestivalDay[]
  acts: Act[]
}

export type User = {
  id: string
  nickname: string
  colour: string
  createdAt: string
  lastSeen: string
}

export type UserWithSelections = User & {
  selections: string[]  // actId[]
}

export type ClashPair = {
  personA: { userId: string; nickname: string; colour: string; act: Act }
  personB: { userId: string; nickname: string; colour: string; act: Act }
}

export type InviteToken = {
  token: string
  createdBy: string
  createdAt: string
  expiresAt: string | null   // null = never expires
}

export type ConnectionWithUser = {
  connectionId: string
  user: User
  selections: string[]
}

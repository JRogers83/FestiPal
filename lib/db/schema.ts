import {
  pgTable,
  text,
  date,
  time,
  boolean,
  smallint,
  uuid,
  timestamp,
  unique,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const festivalDays = pgTable('festival_days', {
  id:      text('id').primaryKey(),
  label:   text('label').notNull(),
  date:    date('date').notNull(),
  ordinal: smallint('ordinal').notNull(),
})

export const stages = pgTable('stages', {
  id:      text('id').primaryKey(),
  name:    text('name').notNull(),
  ordinal: smallint('ordinal').notNull(),
  zone:    text('zone').notNull().default('arena'),
})

export const acts = pgTable('acts', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  stageId:       text('stage_id').notNull().references(() => stages.id),
  festivalDayId: text('festival_day_id').notNull().references(() => festivalDays.id),
  date:          date('date').notNull(),
  startTime:     time('start_time').notNull(),
  endTime:       time('end_time').notNull(),
  headliner:     boolean('headliner').notNull().default(false),
})

export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  nickname:  text('nickname').notNull().default('Anonymous'),
  colour:    text('colour').notNull().default('#3b82f6'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeen:  timestamp('last_seen', { withTimezone: true }).notNull().defaultNow(),
})

export const selections = pgTable('selections', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actId:     text('act_id').notNull().references(() => acts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  uniq: unique().on(t.userId, t.actId),
}))

export const inviteTokens = pgTable('invite_tokens', {
  token:     uuid('token').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

export const connections = pgTable('connections', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userA:     uuid('user_a').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userB:     uuid('user_b').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  uniq:  unique().on(t.userA, t.userB),
  order: check('user_a_lt_user_b', sql`${t.userA} < ${t.userB}`),
}))

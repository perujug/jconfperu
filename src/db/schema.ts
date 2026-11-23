import { sql } from 'drizzle-orm';
import { bigint, boolean, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const admins = pgTable('admins', {
  githubId: bigint('github_id', { mode: 'number' }).primaryKey(),
  label: text('label').notNull(),
  githubLogin: text('github_login'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const certificateYears = pgTable('certificate_years', {
  year: integer('year').primaryKey(),
  open: boolean('open').notNull().default(false),
  registrationToken: text('registration_token'),
  onlineCode: text('online_code'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attendees = pgTable(
  'attendees',
  {
    id: text('id').primaryKey(),
    year: integer('year').notNull(),
    email: text('email'),
    phone: text('phone'),
    paymentStatus: text('payment_status').notNull().default('unpaid'),
    role: text('role').notNull(),
    suggestedName: text('suggested_name').notNull(),
    givenName: text('given_name'),
    familyName: text('family_name'),
    githubId: bigint('github_id', { mode: 'number' }),
    githubLogin: text('github_login'),
    publicCode: text('public_code').notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    displayName: text('display_name'),
    certificateTitle: text('certificate_title'),
    recognitionText: text('recognition_text'),
    editionDateLabel: text('edition_date_label'),
    venueLine: text('venue_line'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('attendees_year_email').on(table.year, table.email),
    uniqueIndex('attendees_public_code').on(table.publicCode),
    uniqueIndex('attendees_year_github')
      .on(table.year, table.githubId)
      .where(sql`${table.githubId} is not null`),
  ],
);

export type AttendeeRow = typeof attendees.$inferSelect;

export const atrilSpeakers = pgTable('atril_speakers', {
  id: text('id').primaryKey(),
  year: integer('year').notNull(),
  name: text('name').notNull(),
  role: text('role'),
  company: text('company'),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  linkedin: text('linkedin'),
  website: text('website'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const atrilSessions = pgTable('atril_sessions', {
  id: text('id').primaryKey(),
  year: integer('year').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  track: text('track'),
  format: text('format').notNull().default('charla'),
  room: text('room'),
  delivery: text('delivery'),
  liveUrl: text('live_url'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status').notNull().default('publicada'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const atrilSessionSpeakers = pgTable(
  'atril_session_speakers',
  {
    sessionId: text('session_id').notNull(),
    speakerId: text('speaker_id').notNull(),
    position: integer('position').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.speakerId] })],
);

export type AtrilSpeakerRow = typeof atrilSpeakers.$inferSelect;
export type AtrilSessionRow = typeof atrilSessions.$inferSelect;

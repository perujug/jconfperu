import { sql } from 'drizzle-orm';
import { bigint, boolean, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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

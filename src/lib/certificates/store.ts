import { and, eq, isNull, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { admins, attendees, certificateYears, type AttendeeRow } from '@/db/schema';
import { mergeCsv, parseCertificateCsv, type CsvIssue, type RosterEntry } from '@lib/certificates/csv';
import { classifyClaim, type ClaimOutcome } from '@lib/certificates/eligibility';
import { normalizeEmail } from '@lib/certificates/names';
import { certificateTitle, parseRole, type Role } from '@lib/certificates/roles';
import { applyOnlineCode, canDownload, paymentStatus, registrationAllowed, type PaymentStatus } from '@lib/certificates/registration';
import { certificateClaimOpen } from '@lib/certificates/release';
import { freezeCertificate, recognitionParagraph, type EditionFacts, type FrozenCertificate } from '@lib/certificates/snapshot';
import { bootstrapAdminIds } from '@lib/config';
import { resolveGithubAccount } from '@lib/auth/github';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && (error as { code?: unknown }).code === '23505') return true;
  if ('cause' in error) return isUniqueViolation(error.cause);
  return false;
}

function newPublicCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toRoster(row: AttendeeRow): RosterEntry | null {
  if (!row.email) return null;
  return {
    id: row.id,
    year: row.year,
    email: row.email,
    role: parseRole(row.role) ?? 'participante',
    suggestedName: row.suggestedName,
    githubId: row.githubId,
    givenName: row.givenName,
    familyName: row.familyName,
    publicCode: row.publicCode,
    revoked: row.revokedAt != null,
    issued: row.issuedAt != null,
    displayName: row.displayName,
    certificateTitle: row.certificateTitle,
    recognitionText: row.recognitionText,
    editionDateLabel: row.editionDateLabel,
    venueLine: row.venueLine,
  };
}

export async function seedAdmins(): Promise<void> {
  const ids = bootstrapAdminIds();
  if (ids.length === 0) return;
  const db = await getDb();
  for (const githubId of ids) {
    await db.insert(admins).values({ githubId, label: `GitHub ${githubId}` }).onConflictDoNothing();
  }
}

export async function isAdmin(githubId: number): Promise<boolean> {
  if (bootstrapAdminIds().includes(githubId)) return true;
  const db = await getDb();
  const rows = await db.select({ githubId: admins.githubId }).from(admins).where(eq(admins.githubId, githubId)).limit(1);
  return rows.length > 0;
}

export async function listAdmins(known?: { githubId: number; login: string }): Promise<Array<{ githubId: number; label: string; login: string | null }>> {
  await seedAdmins();
  const db = await getDb();
  const rows = await db.select().from(admins);
  for (const row of rows) {
    if (row.githubLogin) continue;
    const login = known?.githubId === row.githubId ? known.login : (await resolveGithubAccount(String(row.githubId)))?.login;
    if (!login) continue;
    const label = row.label === `GitHub ${row.githubId}` ? login : row.label;
    await db.update(admins).set({ githubLogin: login, label }).where(eq(admins.githubId, row.githubId));
    row.githubLogin = login;
    row.label = label;
  }
  return rows.map((row) => ({ githubId: row.githubId, label: row.label, login: row.githubLogin }));
}

export async function addAdmin(githubId: number, label: string, login: string): Promise<void> {
  const db = await getDb();
  await db.insert(admins).values({ githubId, label: label || login, githubLogin: login }).onConflictDoUpdate({
    target: admins.githubId,
    set: { label: label || login, githubLogin: login },
  });
}

export async function removeAdmin(githubId: number): Promise<void> {
  if (bootstrapAdminIds().includes(githubId)) return;
  const db = await getDb();
  await db.delete(admins).where(eq(admins.githubId, githubId));
}

export async function yearIsOpen(year: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select().from(certificateYears).where(eq(certificateYears.year, year)).limit(1);
  return rows[0]?.open === true;
}

export async function listYearFlags(): Promise<Map<number, boolean>> {
  const db = await getDb();
  const rows = await db.select().from(certificateYears);
  return new Map(rows.map((row) => [row.year, row.open]));
}

export async function setYearOpen(year: number, open: boolean): Promise<void> {
  const db = await getDb();
  await db.insert(certificateYears).values({ year, open }).onConflictDoUpdate({
    target: certificateYears.year,
    set: { open, updatedAt: new Date() },
  });
  if (open) await ensureRegistrationToken(year);
}

export async function yearAccess(year: number): Promise<{ open: boolean; token: string | null; onlineCode: string | null }> {
  const db = await getDb();
  const rows = await db.select().from(certificateYears).where(eq(certificateYears.year, year)).limit(1);
  return {
    open: rows[0]?.open === true,
    token: rows[0]?.registrationToken ?? null,
    onlineCode: rows[0]?.onlineCode ?? null,
  };
}

export async function ensureRegistrationToken(year: number): Promise<string> {
  const db = await getDb();
  const rows = await db.select().from(certificateYears).where(eq(certificateYears.year, year)).limit(1);
  if (rows[0]?.registrationToken) return rows[0].registrationToken;
  const token = newPublicCode();
  if (!rows[0]) {
    await db.insert(certificateYears).values({ year, open: false, registrationToken: token });
    return token;
  }
  await db
    .update(certificateYears)
    .set({ registrationToken: token, updatedAt: new Date() })
    .where(eq(certificateYears.year, year));
  return token;
}

export async function rotateRegistrationToken(year: number): Promise<string> {
  const db = await getDb();
  const token = newPublicCode();
  await db.insert(certificateYears).values({ year, open: false, registrationToken: token }).onConflictDoUpdate({
    target: certificateYears.year,
    set: { registrationToken: token, updatedAt: new Date() },
  });
  return token;
}

export async function setOnlineCode(year: number, code: string): Promise<void> {
  const db = await getDb();
  const onlineCode = code.trim() || null;
  await db.insert(certificateYears).values({ year, open: false, onlineCode }).onConflictDoUpdate({
    target: certificateYears.year,
    set: { onlineCode, updatedAt: new Date() },
  });
}

export async function yearHasAttendees(year: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ id: attendees.id }).from(attendees).where(eq(attendees.year, year)).limit(1);
  return rows.length > 0;
}

export async function listAttendees(year: number): Promise<AttendeeRow[]> {
  const db = await getDb();
  return db.select().from(attendees).where(eq(attendees.year, year));
}

export async function listAttendeesForGithub(githubId: number): Promise<AttendeeRow[]> {
  const db = await getDb();
  return db.select().from(attendees).where(eq(attendees.githubId, githubId));
}

export async function findAttendeeByGithub(year: number, githubId: number): Promise<AttendeeRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.year, year), eq(attendees.githubId, githubId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findAttendeeByCode(code: string): Promise<AttendeeRow | null> {
  const db = await getDb();
  const rows = await db.select().from(attendees).where(eq(attendees.publicCode, code)).limit(1);
  return rows[0] ?? null;
}

export async function importAttendees(
  year: number,
  text: string,
): Promise<{ added: number; updated: number; unchanged: number; errors: CsvIssue[] }> {
  const parsed = parseCertificateCsv(text);
  if (parsed.rows.length === 0 && parsed.errors.length > 0) {
    return { added: 0, updated: 0, unchanged: 0, errors: parsed.errors };
  }
  const db = await getDb();
  const existing = await db.select().from(attendees).where(eq(attendees.year, year));
  const roster = existing.flatMap((row) => {
    const entry = toRoster(row);
    return entry ? [entry] : [];
  });
  const merged = mergeCsv(roster, parsed.rows, year, {
    id: () => crypto.randomUUID(),
    code: newPublicCode,
  });
  const previous = new Map(existing.flatMap((row) => (row.email ? [[row.email, row] as const] : [])));

  await db.transaction(async (tx) => {
    for (const entry of merged.entries) {
      const current = previous.get(entry.email);
      if (!current) {
        await tx.insert(attendees).values({
          id: entry.id,
          year,
          email: entry.email,
          role: entry.role,
          suggestedName: entry.suggestedName,
          publicCode: entry.publicCode,
          paymentStatus: 'paid',
        });
        continue;
      }
      if (current.suggestedName === entry.suggestedName && current.role === entry.role) continue;
      await tx
        .update(attendees)
        .set({ suggestedName: entry.suggestedName, role: entry.role, updatedAt: new Date() })
        .where(eq(attendees.id, current.id));
    }
  });

  return { added: merged.added, updated: merged.updated, unchanged: merged.unchanged, errors: parsed.errors };
}

export async function claimEmail(input: {
  year: number;
  email: string;
  githubId: number;
  githubLogin: string;
}): Promise<ClaimOutcome> {
  const email = normalizeEmail(input.email);
  if (!email) return 'missing';
  const open = certificateClaimOpen(input.year, await yearIsOpen(input.year));
  const db = await getDb();
  const rows = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.year, input.year), eq(attendees.email, email)))
    .limit(1);
  const row = rows[0] ?? null;
  const outcome = classifyClaim({
    yearOpen: open,
    attendee: row ? { githubId: row.githubId, revoked: row.revokedAt != null } : null,
    githubId: input.githubId,
  });
  if (!row || outcome !== 'ready') return outcome === 'ready' ? 'missing' : outcome;

  const linked = await db
    .update(attendees)
    .set({ githubId: input.githubId, githubLogin: input.githubLogin, updatedAt: new Date() })
    .where(and(eq(attendees.id, row.id), isNull(attendees.githubId)))
    .returning({ id: attendees.id });

  if (linked.length > 0) return 'linked';
  const again = await findAttendeeByGithub(input.year, input.githubId);
  return again?.email === email ? 'linked' : 'taken';
}

export async function issueForGithub(input: {
  year: number;
  githubId: number;
  givenName: string;
  familyName: string;
  edition: EditionFacts;
}): Promise<FrozenCertificate | null> {
  const row = await findAttendeeByGithub(input.year, input.githubId);
  if (!row || row.revokedAt || row.issuedAt) return null;
  const role = parseRole(row.role) ?? 'participante';
  if (!canDownload(paymentStatus(row.paymentStatus), role)) return null;
  const frozen = freezeCertificate({
    givenName: input.givenName,
    familyName: input.familyName,
    role,
    edition: input.edition,
  });
  const db = await getDb();
  const saved = await db
    .update(attendees)
    .set({
      givenName: input.givenName,
      familyName: input.familyName,
      displayName: frozen.displayName,
      certificateTitle: frozen.certificateTitle,
      recognitionText: frozen.recognitionText,
      editionDateLabel: frozen.editionDateLabel,
      venueLine: frozen.venueLine,
      issuedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(attendees.id, row.id), eq(attendees.githubId, input.githubId), isNull(attendees.issuedAt), isNull(attendees.revokedAt)))
    .returning({ id: attendees.id });
  return saved.length > 0 ? frozen : null;
}

export async function addManualAttendee(input: {
  year: number;
  email: string;
  suggestedName: string;
  role: Role;
  githubId: number | null;
  githubLogin: string | null;
  phone?: string | null;
}): Promise<'added' | 'updated' | 'taken' | 'invalid'> {
  const email = normalizeEmail(input.email);
  const suggestedName = input.suggestedName.replace(/\s+/g, ' ').trim();
  if (!email || !suggestedName) return 'invalid';
  const db = await getDb();
  const rows = await db
    .select()
    .from(attendees)
    .where(and(eq(attendees.year, input.year), eq(attendees.email, email)))
    .limit(1);
  const current = rows[0];

  try {
    if (!current) {
      await db.insert(attendees).values({
        id: crypto.randomUUID(),
        year: input.year,
        email,
        role: input.role,
        suggestedName,
        publicCode: newPublicCode(),
        paymentStatus: 'paid',
        phone: input.phone ?? null,
        githubId: input.githubId,
        githubLogin: input.githubLogin,
      });
      return 'added';
    }

    if (input.githubId != null && current.githubId != null && current.githubId !== input.githubId) return 'taken';
    await db
      .update(attendees)
      .set({
        suggestedName,
        role: input.role,
        githubId: input.githubId ?? current.githubId,
        githubLogin: input.githubLogin ?? current.githubLogin,
        phone: input.phone ?? current.phone,
        updatedAt: new Date(),
      })
      .where(eq(attendees.id, current.id));
    return 'updated';
  } catch (error) {
    if (isUniqueViolation(error)) return 'taken';
    throw error;
  }
}

export type RegisterResult = 'created' | 'updated' | 'locked' | 'closed' | 'taken';

export async function registerSelf(input: {
  year: number;
  token: string;
  githubId: number;
  githubLogin: string;
  givenName: string;
  familyName: string;
  email: string | null;
  phone: string | null;
}): Promise<RegisterResult> {
  const access = await yearAccess(input.year);
  const db = await getDb();
  const displayName = `${input.givenName} ${input.familyName}`;
  const existing = await findAttendeeByGithub(input.year, input.githubId);
  if (!existing && !registrationAllowed({ yearOpen: access.open, token: input.token, expected: access.token })) return 'closed';
  if (existing && !access.open && !existing.issuedAt) return 'closed';

  if (input.email) {
    const rows = await db
      .select()
      .from(attendees)
      .where(and(eq(attendees.year, input.year), eq(attendees.email, input.email)))
      .limit(1);
    if (rows[0] && rows[0].githubId !== input.githubId) return 'taken';
  }

  if (!existing) {
    await db.insert(attendees).values({
      id: crypto.randomUUID(),
      year: input.year,
      email: input.email,
      phone: input.phone,
      paymentStatus: 'unpaid',
      role: 'participante',
      suggestedName: displayName,
      givenName: input.givenName,
      familyName: input.familyName,
      githubId: input.githubId,
      githubLogin: input.githubLogin,
      publicCode: newPublicCode(),
    });
    return 'created';
  }

  if (existing.issuedAt || canDownload(paymentStatus(existing.paymentStatus), existing.role)) return 'locked';
  await db
    .update(attendees)
    .set({
      email: input.email,
      phone: input.phone,
      suggestedName: displayName,
      givenName: input.givenName,
      familyName: input.familyName,
      githubLogin: input.githubLogin,
      updatedAt: new Date(),
    })
    .where(eq(attendees.id, existing.id));
  return 'updated';
}

export async function submitOnlineCode(year: number, githubId: number, code: string): Promise<'online' | 'invalid' | 'missing' | 'unchanged'> {
  const access = await yearAccess(year);
  const row = await findAttendeeByGithub(year, githubId);
  if (!row || row.revokedAt) return 'missing';
  const next = applyOnlineCode({ status: paymentStatus(row.paymentStatus), code, expected: access.onlineCode });
  if (next === row.paymentStatus) return next === 'unpaid' ? 'invalid' : 'unchanged';
  if (next !== 'online') return 'invalid';
  const db = await getDb();
  await db.update(attendees).set({ paymentStatus: 'online', updatedAt: new Date() }).where(eq(attendees.id, row.id));
  return 'online';
}

export async function setRosterKind(id: string, kind: 'paid' | 'speaker' | 'organizer' | 'volunteer', facts: EditionFacts | null): Promise<void> {
  const role: Role = kind === 'speaker' ? 'conferencista' : kind === 'organizer' ? 'organizador' : kind === 'volunteer' ? 'voluntario' : 'participante';
  const db = await getDb();
  const rows = await db.select().from(attendees).where(eq(attendees.id, id)).limit(1);
  const row = rows[0];
  if (!row) return;
  await db
    .update(attendees)
    .set({
      role,
      paymentStatus: kind === 'paid' ? 'paid' : row.paymentStatus,
      certificateTitle: row.issuedAt ? certificateTitle(role) : row.certificateTitle,
      recognitionText: row.issuedAt && facts ? recognitionParagraph(facts, role) : row.recognitionText,
      updatedAt: new Date(),
    })
    .where(eq(attendees.id, id));
}

export async function updateAttendeeEmail(id: string, raw: string): Promise<'updated' | 'invalid' | 'taken' | 'missing'> {
  const email = normalizeEmail(raw);
  if (!email) return 'invalid';
  const db = await getDb();
  const rows = await db.select().from(attendees).where(eq(attendees.id, id)).limit(1);
  const row = rows[0];
  if (!row) return 'missing';
  if (row.email === email) return 'updated';
  const clash = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(and(eq(attendees.year, row.year), eq(attendees.email, email), ne(attendees.id, id)))
    .limit(1);
  if (clash.length > 0) return 'taken';
  try {
    await db.update(attendees).set({ email, updatedAt: new Date() }).where(eq(attendees.id, id));
    return 'updated';
  } catch (error) {
    if (isUniqueViolation(error)) return 'taken';
    throw error;
  }
}

export async function setPaymentStatus(id: string, status: Extract<PaymentStatus, 'paid' | 'unpaid'>): Promise<void> {
  const db = await getDb();
  await db.update(attendees).set({ paymentStatus: status, updatedAt: new Date() }).where(eq(attendees.id, id));
}

export async function setRevoked(id: string, revoked: boolean): Promise<void> {
  const db = await getDb();
  await db
    .update(attendees)
    .set({ revokedAt: revoked ? new Date() : null, updatedAt: new Date() })
    .where(eq(attendees.id, id));
}

export async function unlinkGithub(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(attendees)
    .set({ githubId: null, githubLogin: null, updatedAt: new Date() })
    .where(and(eq(attendees.id, id), isNull(attendees.issuedAt)));
}

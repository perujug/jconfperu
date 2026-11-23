import { and, asc, eq, inArray } from 'drizzle-orm';
import { atrilSessionSpeakers, atrilSessions, atrilSpeakers } from '@/db/schema';
import { getDb } from '@/db';
import type { AtrilSessionDraft, AtrilSpeakerDraft } from './sessionize';

export type ProgramSpeaker = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  photoUrl: string | null;
  linkedin: string | null;
  website: string | null;
};

export type ProgramSession = {
  id: string;
  data: {
    order: number;
    startTime: string;
    endTime: string;
    room: string | null;
    title: string;
    delivery?: string | null;
    liveUrl?: string | null;
    speakerNames: string[];
    speakerProfiles: { name: string; url?: string | null }[];
  };
};

export type PublishedProgram = {
  speakers: ProgramSpeaker[];
  sessions: ProgramSession[];
};

const empty: PublishedProgram = { speakers: [], sessions: [] };

function clock(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Lima',
  }).format(value);
}

export async function replaceProgram(
  year: number,
  speakers: AtrilSpeakerDraft[],
  sessions: AtrilSessionDraft[],
): Promise<{ speakers: number; sessions: number }> {
  const db = await getDb();
  const existing = await db.select({ id: atrilSessions.id }).from(atrilSessions).where(eq(atrilSessions.year, year));
  if (existing.length > 0) {
    await db.delete(atrilSessionSpeakers).where(
      inArray(
        atrilSessionSpeakers.sessionId,
        existing.map((row) => row.id),
      ),
    );
  }
  await db.delete(atrilSessions).where(eq(atrilSessions.year, year));
  await db.delete(atrilSpeakers).where(eq(atrilSpeakers.year, year));

  if (speakers.length > 0) {
    await db.insert(atrilSpeakers).values(
      speakers.map((speaker) => ({
        id: speaker.id,
        year,
        name: speaker.name,
        role: speaker.role,
        company: speaker.company,
        bio: speaker.bio,
        photoUrl: speaker.photoUrl,
        linkedin: speaker.linkedin,
        website: speaker.website,
      })),
    );
  }
  if (sessions.length > 0) {
    await db.insert(atrilSessions).values(
      sessions.map((session) => ({
        id: session.id,
        year,
        title: session.title,
        summary: session.summary,
        track: session.track,
        format: session.format,
        room: session.room,
        delivery: session.delivery,
        liveUrl: session.liveUrl,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        sortOrder: session.sortOrder,
        status: session.status,
      })),
    );
    const links = sessions.flatMap((session) =>
      session.speakerIds.map((speakerId, position) => ({
        sessionId: session.id,
        speakerId,
        position,
      })),
    );
    if (links.length > 0) await db.insert(atrilSessionSpeakers).values(links);
  }
  return { speakers: speakers.length, sessions: sessions.length };
}

export async function publishedProgram(year: number): Promise<PublishedProgram> {
  try {
    const db = await getDb();
    const speakers = await db
      .select()
      .from(atrilSpeakers)
      .where(eq(atrilSpeakers.year, year))
      .orderBy(asc(atrilSpeakers.name));
    const sessions = await db
      .select()
      .from(atrilSessions)
      .where(and(eq(atrilSessions.year, year), eq(atrilSessions.status, 'publicada')))
      .orderBy(asc(atrilSessions.sortOrder), asc(atrilSessions.startsAt));
    if (speakers.length === 0 && sessions.length === 0) return empty;
    const links =
      sessions.length === 0
        ? []
        : await db
            .select()
            .from(atrilSessionSpeakers)
            .where(
              inArray(
                atrilSessionSpeakers.sessionId,
                sessions.map((session) => session.id),
              ),
            );
    const byId = new Map(speakers.map((speaker) => [speaker.id, speaker]));
    return {
      speakers: speakers.map((speaker) => ({
        id: speaker.id,
        name: speaker.name,
        role: speaker.role,
        company: speaker.company,
        photoUrl: speaker.photoUrl,
        linkedin: speaker.linkedin,
        website: speaker.website,
      })),
      sessions: sessions.map((session) => {
        const people = links
          .filter((link) => link.sessionId === session.id)
          .sort((left, right) => left.position - right.position)
          .map((link) => byId.get(link.speakerId))
          .filter((speaker) => speaker != null);
        return {
          id: session.id,
          data: {
            order: session.sortOrder,
            startTime: clock(session.startsAt),
            endTime: clock(session.endsAt),
            room: session.room,
            title: session.title,
            delivery: session.delivery,
            liveUrl: session.liveUrl,
            speakerNames: people.map((speaker) => speaker.name),
            speakerProfiles: people.map((speaker) => ({
              name: speaker.name,
              url: speaker.linkedin || speaker.website,
            })),
          },
        };
      }),
    };
  } catch {
    return empty;
  }
}

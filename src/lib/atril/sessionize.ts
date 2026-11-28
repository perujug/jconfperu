export type AtrilFormat = 'charla' | 'keynote' | 'taller' | 'pausa';

export type AtrilSpeakerDraft = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedin: string | null;
  website: string | null;
};

export type AtrilSessionDraft = {
  id: string;
  title: string;
  summary: string | null;
  track: string | null;
  format: AtrilFormat;
  room: string | null;
  delivery: 'presencial' | 'online' | 'ambas' | null;
  liveUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  sortOrder: number;
  status: 'publicada' | 'aceptada';
  speakerIds: string[];
};

type Category = { name?: string; categoryItems?: { name?: string }[] };
type Link = { linkType?: string; title?: string; url?: string };

export type SessionizeSpeakerJson = {
  id: string;
  fullName?: string;
  tagLine?: string;
  bio?: string;
  profilePicture?: string;
  links?: Link[];
};

export type SessionizeSessionJson = {
  id: number | string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  room?: string;
  status?: string;
  isServiceSession?: boolean;
  categories?: Category[];
  speakers?: { id?: string; name?: string }[];
};

const LIMA_OFFSET = '-05:00';

export function splitTagLine(tagLine: string | undefined): { role: string | null; company: string | null } {
  const value = tagLine?.replace(/\s+/g, ' ').trim() ?? '';
  if (!value) return { role: null, company: null };
  const at = value.search(/\s+at\s+/i);
  if (at > 0) {
    return {
      role: value.slice(0, at).trim(),
      company: value.slice(at).replace(/^\s+at\s+/i, '').trim() || null,
    };
  }
  const dash = value.indexOf(' - ');
  if (dash > 0) {
    return {
      company: value.slice(0, dash).trim() || null,
      role: value.slice(dash + 3).trim() || null,
    };
  }
  return { role: value, company: null };
}

export function sessionFormat(input: { isServiceSession?: boolean; categories?: Category[] }): AtrilFormat {
  if (input.isServiceSession) return 'pausa';
  const type = categoryNames(input.categories, 'Type')[0] ?? '';
  if (/workshop|taller/i.test(type)) return 'taller';
  if (/keynote/i.test(type)) return 'keynote';
  if (/break|pausa|service/i.test(type)) return 'pausa';
  return 'charla';
}

export function limaDate(value: string | undefined): Date | null {
  if (!value) return null;
  const stamp = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}${LIMA_OFFSET}`;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const RIVERSIDE_URL = 'https://riverside.com/';

export function sessionDelivery(categories: Category[] | undefined): 'presencial' | 'online' | 'ambas' | null {
  const options = categoryNames(categories, 'Option').map((name) => name.toLowerCase());
  const online = options.some((name) => name.includes('virtual') || name.includes('online'));
  const presencial = options.some((name) => name.includes('presencial'));
  if (online && presencial) return 'ambas';
  if (online) return 'online';
  if (presencial) return 'presencial';
  return null;
}

function categoryNames(categories: Category[] | undefined, name: string): string[] {
  const group = (categories ?? []).find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return (group?.categoryItems ?? []).map((item) => item.name?.trim() ?? '').filter(Boolean);
}

function linkUrl(links: Link[] | undefined, kind: string): string | null {
  const hit = (links ?? []).find((link) => `${link.linkType ?? ''} ${link.title ?? ''}`.toLowerCase().includes(kind));
  return hit?.url?.trim() || null;
}

export function mapSessionizeProgram(
  speakers: SessionizeSpeakerJson[],
  sessions: SessionizeSessionJson[],
): { speakers: AtrilSpeakerDraft[]; sessions: AtrilSessionDraft[] } {
  const speakerDrafts = new Map<string, AtrilSpeakerDraft>();
  for (const speaker of speakers) {
    if (!speaker.id || !speaker.fullName?.trim()) continue;
    const tag = splitTagLine(speaker.tagLine);
    speakerDrafts.set(speaker.id, {
      id: speaker.id,
      name: speaker.fullName.trim(),
      role: tag.role,
      company: tag.company,
      bio: speaker.bio?.trim() || null,
      photoUrl: speaker.profilePicture?.trim() || null,
      linkedin: linkUrl(speaker.links, 'linkedin'),
      website: linkUrl(speaker.links, 'web') ?? linkUrl(speaker.links, 'blog') ?? linkUrl(speaker.links, 'company'),
    });
  }

  const sorted = [...sessions].sort((left, right) => (left.startsAt ?? '').localeCompare(right.startsAt ?? ''));
  const sessionDrafts: AtrilSessionDraft[] = [];
  sorted.forEach((session, index) => {
    const startsAt = limaDate(session.startsAt);
    const endsAt = limaDate(session.endsAt);
    const title = session.title?.trim();
    if (!startsAt || !endsAt || !title) return;
    const speakerIds: string[] = [];
    for (const person of session.speakers ?? []) {
      const id = person.id?.trim() || `name:${person.name?.trim().toLowerCase()}`;
      if (!person.name?.trim() && !person.id) continue;
      if (!speakerDrafts.has(id)) {
        speakerDrafts.set(id, {
          id,
          name: person.name?.trim() || 'Conferencista',
          role: null,
          company: null,
          bio: null,
          photoUrl: null,
          linkedin: null,
          website: null,
        });
      }
      speakerIds.push(id);
    }
    const accepted = !session.status || /accepted|informed/i.test(session.status);
    const delivery = session.isServiceSession ? null : sessionDelivery(session.categories);
    sessionDrafts.push({
      id: String(session.id),
      title,
      summary: session.description?.trim() || null,
      track: categoryNames(session.categories, 'Track').join(', ') || null,
      format: sessionFormat(session),
      room: session.room?.trim() || null,
      delivery,
      liveUrl: delivery === 'online' || delivery === 'ambas' ? RIVERSIDE_URL : null,
      startsAt,
      endsAt,
      sortOrder: index,
      status: accepted ? 'publicada' : 'aceptada',
      speakerIds,
    });
  });

  return { speakers: [...speakerDrafts.values()], sessions: sessionDrafts };
}

export function sessionsFromView(payload: unknown): SessionizeSessionJson[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((group) => (Array.isArray(group?.sessions) ? group.sessions : []));
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { sessions?: unknown }).sessions)) {
    return sessionsFromView((payload as { sessions: unknown }).sessions);
  }
  return [];
}

type GridRoom = { name?: string; sessions?: SessionizeSessionJson[] };
type GridDay = { rooms?: GridRoom[] };

/** La grilla incluye pausas y bloques que el listado de charlas no publica. */
export function sessionsFromGrid(payload: unknown): SessionizeSessionJson[] {
  const days = Array.isArray(payload) ? (payload as GridDay[]) : [];
  const sessions: SessionizeSessionJson[] = [];
  for (const day of days) {
    for (const room of day.rooms ?? []) {
      for (const session of room.sessions ?? []) {
        sessions.push({ ...session, room: session.room?.trim() || room.name });
      }
    }
  }
  return sessions;
}

export type WallSpeaker = {
  id: string;
  fullName: string;
  tagLine?: string;
  bio?: string;
  profilePicture?: string;
  linkedin?: string;
  company?: string;
};

function wallText(value: string | undefined): string {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** El muro público lista conferencistas que el JSON de charlas todavía no incluye. */
export function parseSpeakerWall(html: string): WallSpeaker[] {
  return html
    .split('<li id="sz-speaker-')
    .slice(1)
    .map((chunk) => {
      const id = chunk.split('"', 1)[0]?.trim() ?? '';
      const fullName = wallText(chunk.match(/sz-speaker__name">([\s\S]*?)<\/h3>/)?.[1]);
      const tagLine = wallText(chunk.match(/sz-speaker__tagline">([\s\S]*?)<\/h4>/)?.[1]);
      const bio = wallText(chunk.match(/sz-speaker__bio">([\s\S]*?)<\/p>/)?.[1]);
      const profilePicture = chunk.match(/src="(https:\/\/cdn\.sessionize\.com[^"]+)"/)?.[1];
      const linkedin = chunk.match(/href="(https:\/\/www\.linkedin\.com[^"]+)"/)?.[1];
      const company = wallText(chunk.match(/Company <\/dt>\s*<dd[^>]*>\s*([^<]+)/)?.[1]);
      return {
        id,
        fullName,
        tagLine: tagLine || undefined,
        bio: bio || undefined,
        profilePicture,
        linkedin,
        company: company && company.toLowerCase() !== 'company' ? company : undefined,
      };
    })
    .filter((speaker) => speaker.id && speaker.fullName);
}

export function addWallSpeakers(
  program: { speakers: AtrilSpeakerDraft[]; sessions: AtrilSessionDraft[] },
  wall: WallSpeaker[],
): { speakers: AtrilSpeakerDraft[]; sessions: AtrilSessionDraft[] } {
  const known = new Set(program.speakers.map((speaker) => speaker.name.toLowerCase()));
  const speakers = [...program.speakers];
  for (const person of wall) {
    if (known.has(person.fullName.toLowerCase())) continue;
    const tag = splitTagLine(person.tagLine);
    speakers.push({
      id: person.id,
      name: person.fullName,
      role: tag.role,
      company: person.company ?? tag.company,
      bio: person.bio?.trim() || null,
      photoUrl: person.profilePicture?.trim() || null,
      linkedin: person.linkedin?.trim() || null,
      website: null,
    });
    known.add(person.fullName.toLowerCase());
  }
  return { speakers, sessions: program.sessions };
}

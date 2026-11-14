/**
 * Sessionize.
 * La agenda usa el embed HTML (document.write, script clásico).
 * Los speakers usan el endpoint JSON principal, el mismo que está en producción.
 */

export interface SessionizeSpeaker {
  id: string;
  fullName: string;
  tagLine?: string;
  profilePicture?: string;
}

export const sessionizeViews = ['GridSmart', 'Speakers', 'Sessions', 'SpeakerWall'] as const;

export type SessionizeView = (typeof sessionizeViews)[number];

const EVENT_ID = /^[A-Za-z0-9]+$/;

export function sessionizeEmbedSrc(eventId: string, view: SessionizeView): string {
  if (!EVENT_ID.test(eventId)) {
    throw new Error(`sessionizeEventId inválido: ${eventId}`);
  }
  return `https://sessionize.com/api/v2/${eventId}/view/${view}`;
}

const TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T | null> {
  if (typeof fetch === 'undefined') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'jconfperu-build (+https://jconfperu.com)',
      },
    });
    if (!res.ok) {
      console.warn(`[sessionize] ${url} respondió ${res.status}`);
      return null;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      console.warn(`[sessionize] ${url} no devolvió JSON`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn('[sessionize] error consultando', url, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Speakers del endpoint JSON principal (el que usa producción). */
export async function fetchSpeakers(eventId: string): Promise<SessionizeSpeaker[]> {
  if (!EVENT_ID.test(eventId)) {
    throw new Error(`sessionizeEventId inválido: ${eventId}`);
  }
  const data = await fetchJson<SessionizeSpeaker[]>(
    `https://sessionize.com/api/v2/${eventId}/view/Speakers`,
  );
  return data ?? [];
}

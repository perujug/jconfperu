/**
 * Cliente de Sessionize que se ejecuta en build time.
 * Sólo se llama desde rutas estáticas; los datos se "congelan" en HTML.
 */

export interface SessionizeSpeaker {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  bio?: string;
  tagLine?: string;
  profilePicture?: string;
  links?: Array<{ title: string; url: string; linkType: string }>;
  sessions?: Array<{ id: string | number; name: string }>;
}

export interface SessionizeSession {
  id: string;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  speakers: Array<{ id: string; name: string }>;
  room?: string;
}

export interface SessionizeGridSlot {
  slotStart: string;
  rooms: Array<{
    id: number;
    name: string;
    session: SessionizeSession;
  }>;
}

export interface SessionizeGridDay {
  date: string;
  rooms: Array<{ id: number; name: string }>;
  timeSlots: SessionizeGridSlot[];
}

const TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T | null> {
  if (typeof fetch === 'undefined') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'jconfperu-build (+https://jconfperu.com)' },
    });
    if (!res.ok) {
      console.warn(`[sessionize] ${url} respondió ${res.status}`);
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

/** Lista de speakers para un eventId (formato "view/Speakers"). */
export async function fetchSpeakers(eventId: string): Promise<SessionizeSpeaker[]> {
  const data = await fetchJson<SessionizeSpeaker[]>(
    `https://sessionize.com/api/v2/${eventId}/view/Speakers`,
  );
  return data ?? [];
}

/** Grid horario completo (formato "view/GridSmart"). */
export async function fetchGrid(eventId: string): Promise<SessionizeGridDay[]> {
  const data = await fetchJson<SessionizeGridDay[]>(
    `https://sessionize.com/api/v2/${eventId}/view/GridSmart`,
  );
  return data ?? [];
}

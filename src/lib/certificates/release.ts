/** Hora de Lima en la que el certificado de esa edición se puede descargar. */
const RELEASE_AT: Record<number, string> = {
  2026: '2026-11-28T18:00:00-05:00',
};

export function certificateReleaseAt(year: number): Date | null {
  const value = RELEASE_AT[year];
  return value ? new Date(value) : null;
}

export function certificateReleased(year: number, now = new Date()): boolean {
  const releaseAt = certificateReleaseAt(year);
  return releaseAt == null || now.getTime() >= releaseAt.getTime();
}

/** Una edición ya publicada se reclama aunque el admin la haya cerrado. 2026 espera a su hora. */
export function certificateClaimOpen(year: number, yearOpen: boolean, now = new Date()): boolean {
  return yearOpen || certificateReleased(year, now);
}

export function certificatePendingCopy(year: number): string {
  const releaseAt = certificateReleaseAt(year);
  if (!releaseAt) return '';
  const parts = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZone: 'America/Lima',
  }).formatToParts(releaseAt);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const clock = `${pick('hour')}:${pick('minute')} ${pick('dayPeriod')}`.replace(/\s+/g, ' ').trim();
  return `Tu certificado estará disponible al terminar el evento, el ${pick('weekday')} ${pick('day')} de ${pick('month')} a las ${clock} (hora de Lima). Podrás descargarlo o compartirlo en LinkedIn.`;
}

export function linkedInShareUrl(pageUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
}

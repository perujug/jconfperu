import { certificateTitle, type Role } from './roles';

export const SIGNATORY = {
  name: 'PERU JUG',
  role: 'Peru Java User Group',
} as const;

export type EditionFacts = {
  eventTitle: string;
  tagline: string;
  dateLabel: string;
  venueLine: string;
};

export type EditionSource = {
  title: string;
  tagline: string;
  date: Date | null;
  dateLabel?: string;
  venue: {
    name: string;
    city?: string;
    country?: string;
  };
};

export type FrozenCertificate = {
  displayName: string;
  certificateTitle: string;
  recognitionText: string;
  editionDateLabel: string;
  venueLine: string;
};

const dateFormat = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Lima',
});

export function editionFacts(source: EditionSource): EditionFacts {
  const dateLabel = source.date ? dateFormat.format(source.date) : (source.dateLabel?.trim() || 'Fecha por confirmar');
  const venueLine = [source.venue.name, source.venue.city, source.venue.country].filter(Boolean).join(', ');
  return {
    eventTitle: source.title,
    tagline: source.tagline,
    dateLabel,
    venueLine,
  };
}

export function recognitionParagraph(facts: EditionFacts, role: Role = 'participante'): string {
  const tagline = facts.tagline.replace(/\.\s*$/, '').trim();
  const sentence = tagline ? `${tagline.charAt(0).toLowerCase()}${tagline.slice(1)}` : tagline;
  if (role === 'voluntario') {
    return `por su labor como voluntario en ${facts.eventTitle}, apoyando las transmisiones en línea, el soporte de las charlas y la atención de comida y bebidas, realizada el ${facts.dateLabel} en ${facts.venueLine}.`;
  }
  const as = role === 'conferencista' ? 'como speaker ' : role === 'organizador' ? 'como organizador ' : '';
  return `por su participación ${as}en ${facts.eventTitle}, ${sentence}, realizada el ${facts.dateLabel} en ${facts.venueLine}.`;
}

export function freezeCertificate(input: {
  givenName: string;
  familyName: string;
  role: Role;
  edition: EditionFacts;
}): FrozenCertificate {
  const facts = {
    eventTitle: input.edition.eventTitle,
    tagline: input.edition.tagline,
    dateLabel: input.edition.dateLabel,
    venueLine: input.edition.venueLine,
  };
  return {
    displayName: `${input.givenName} ${input.familyName}`,
    certificateTitle: certificateTitle(input.role),
    recognitionText: recognitionParagraph(facts, input.role),
    editionDateLabel: facts.dateLabel,
    venueLine: facts.venueLine,
  };
}

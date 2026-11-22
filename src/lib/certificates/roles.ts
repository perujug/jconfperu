export const ROLES = ['participante', 'conferencista', 'organizador'] as const;

export type Role = (typeof ROLES)[number];

const ROLE_ALIASES: Record<string, Role> = {
  participante: 'participante',
  participant: 'participante',
  conferencista: 'conferencista',
  conferencistas: 'conferencista',
  speaker: 'conferencista',
  speakers: 'conferencista',
  organizador: 'organizador',
  organizadores: 'organizador',
  organizer: 'organizador',
  organizers: 'organizador',
};

export function parseRole(value: string | undefined): Role | null {
  const role = value?.trim().toLowerCase() ?? '';
  if (!role) return 'participante';
  return ROLE_ALIASES[role] ?? null;
}

export function certificateTitle(role: Role): string {
  switch (role) {
    case 'conferencista':
      return 'Certificado de conferencista';
    case 'organizador':
      return 'Certificado de organización';
    default:
      return 'Certificado de participación';
  }
}

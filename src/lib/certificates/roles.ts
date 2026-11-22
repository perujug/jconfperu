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

export type CertificateKind = 'participante' | 'speaker' | 'organizador';

export function certificateKind(title: string): CertificateKind {
  const value = title.toLowerCase();
  if (value.includes('speaker') || value.includes('conferenc')) return 'speaker';
  if (value.includes('organiz')) return 'organizador';
  return 'participante';
}

export function certificateRoleWord(kind: CertificateKind): string {
  if (kind === 'speaker') return 'SPEAKER';
  if (kind === 'organizador') return 'ORGANIZADOR';
  return 'PARTICIPANTE';
}

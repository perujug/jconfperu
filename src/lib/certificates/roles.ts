export const ROLES = ['participante', 'conferencista', 'organizador'] as const;

export type Role = (typeof ROLES)[number];

export function parseRole(value: string | undefined): Role | null {
  const role = value?.trim().toLowerCase() ?? '';
  if (!role) return 'participante';
  return ROLES.includes(role as Role) ? (role as Role) : null;
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

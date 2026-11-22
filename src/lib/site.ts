/** Configuración de marca y enlaces canónicos del sitio. */
export const SITE = {
  name: 'JConf Perú',
  url: 'https://jconfperu.com',
  organization: 'Peru JUG',
  organizationUrl: 'https://perujug.org/',
  description:
    'JConf Perú — la conferencia anual sobre Java, Jakarta EE, Spring, GraalVM, cloud nativo y arquitectura organizada por Peru JUG.',
  keywords: ['java', 'jakarta ee', 'spring', 'conferencia', 'perú', 'lima', 'peru jug'],
  locale: 'es-PE',
  ogImage: '/og-cover.png',
  twitter: '@perujug',
} as const;

/** En local usa el origen del servidor. Publicado, siempre https://jconfperu.com. */
export function publicBase(dev: boolean, requestOrigin?: string): string {
  if (dev && requestOrigin) return requestOrigin.replace(/\/$/, '');
  return SITE.url;
}

export function publicUrl(path: string, requestOrigin?: string): string {
  return new URL(path, `${publicBase(import.meta.env.DEV, requestOrigin)}/`).toString();
}

export const SOCIAL = {
  facebook: 'https://www.facebook.com/groups/perujug/',
  twitter: 'https://twitter.com/perujug',
  linkedin: 'https://www.linkedin.com/company/perujug/',
  whatsapp: 'https://chat.whatsapp.com/JmKlWu7gZipAMDkKz3eulV',
  meetup: 'https://www.meetup.com/Peru-Java-User-Group/',
  google: 'https://groups.google.com/forum/?hl=en#!forum/itp_java',
} as const;

export const CONTACT_EMAILS = [
  { name: 'José Díaz', email: 'jose.diaz@joedayz.pe' },
  { name: 'Carlos Zela', email: 'c.zelabueno@gmail.com' },
  { name: 'Jhosep Luna', email: 'jhosep.dario@gmail.com' },
];

export const NAV_ITEMS = [
  { href: '/#about', label: 'Acerca de' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/organizadores', label: 'Organizadores' },
  { href: '/speakers', label: 'Conferencistas' },
  { href: '/anteriores', label: 'Anteriores' },
  { href: '/sponsors', label: 'Sponsors' },
  { href: '/media-partners', label: 'Media partners' },
  { href: '/comunidades-aliadas', label: 'Comunidades aliadas' },
  { href: '/contacto', label: 'Contacto' },
] as const;

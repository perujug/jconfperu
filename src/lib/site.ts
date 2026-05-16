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
  { href: '/', label: 'Inicio' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/speakers', label: 'Speakers' },
  { href: '/sponsors', label: 'Sponsors' },
  { href: '/organizadores', label: 'Organizadores' },
  { href: '/anteriores', label: 'Anteriores' },
  { href: '/contacto', label: 'Contacto' },
] as const;

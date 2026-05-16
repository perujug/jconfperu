import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';

/* ──────────────────────────────────────────────────────────────────────
 *  EDITIONS
 *  Una entrada por edición anual del evento.
 *  El año (en el filename, ej. 2026.md) es el `id` y la fuente de verdad.
 * ──────────────────────────────────────────────────────────────────── */
const editions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/editions' }),
  schema: ({ image }) =>
    z.object({
      year: z.number().int().min(2015).max(2099),
      title: z.string(),
      tagline: z.string(),
      // Fecha del evento. Si está pendiente puede ser null.
      date: z.coerce.date().nullable().default(null),
      // Texto humano para mostrar cuando la fecha aún no está confirmada.
      dateLabel: z.string().optional(),
      // Estado: upcoming = próxima edición destacada en home; past = ya ocurrió.
      status: z.enum(['upcoming', 'past']),
      // Si es la edición destacada en la home (debe haber exactamente una).
      featured: z.boolean().default(false),
      // Lugar.
      venue: z.object({
        name: z.string(),
        address: z.string().optional(),
        city: z.string().default('Lima'),
        country: z.string().default('Perú'),
        mapsQuery: z.string().optional(),
        mapsEmbedUrl: z.string().url().optional(),
        online: z.boolean().default(false),
      }),
      // Estadísticas mostradas en el About (counters).
      stats: z
        .object({
          hours: z.number().optional(),
          sessions: z.number().optional(),
          countries: z.number().optional(),
          speakers: z.number().optional(),
        })
        .optional(),
      // ID del evento en Sessionize (si aplica). Ej.: '512b45ok'.
      sessionizeEventId: z.string().optional(),
      // CTA principal del hero.
      cta: z
        .object({
          label: z.string(),
          href: z.string(),
          disabled: z.boolean().default(false),
          note: z.string().optional(),
        })
        .optional(),
      // Imagen banner opcional (para grids de "anteriores"). Procesada por Astro.
      cover: image().optional(),
      // Imágenes de galería.
      gallery: z.array(image()).default([]),
      // Banner único de speakers (para 2021/2022/2024 cuyas tarjetas individuales no se conservaron).
      speakersBanner: image().optional(),
      // Recap / resumen tras el evento.
      recap: z
        .object({
          videoUrl: z.string().url().optional(),
          notes: z.string().optional(),
        })
        .optional(),
    }),
});

/* ──────────────────────────────────────────────────────────────────────
 *  SPEAKERS
 *  Personas que dieron alguna charla. `editions` los relaciona con
 *  los años en los que participaron (un speaker puede repetir).
 * ──────────────────────────────────────────────────────────────────── */
const speakers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/speakers' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string().optional(),
      company: z.string().optional(),
      country: z.string().optional(),
      photo: image().optional(),
      website: z.string().url().optional(),
      twitter: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      youtube: z.string().url().optional(),
      editions: z.array(z.number().int()).default([]),
      featured: z.boolean().default(false),
    }),
});

/* ──────────────────────────────────────────────────────────────────────
 *  ORGANIZERS
 *  Equipo organizador. Pueden estar activos en varias ediciones.
 * ──────────────────────────────────────────────────────────────────── */
const organizers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/organizers' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      photo: image(),
      twitter: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      website: z.string().url().optional(),
      editions: z.array(z.number().int()).default([]),
      order: z.number().int().default(99),
    }),
});

/* ──────────────────────────────────────────────────────────────────────
 *  SPONSORS
 *  Marca patrocinadora. Tier define la sección donde aparece el logo.
 * ──────────────────────────────────────────────────────────────────── */
const sponsors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sponsors' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      tier: z.enum(['platinum', 'gold', 'silver', 'community']),
      logo: image(),
      website: z.string().url(),
      editions: z.array(z.number().int()),
    }),
});

/* ──────────────────────────────────────────────────────────────────────
 *  SESSIONS
 *  Charlas del agenda hardcodeado (ediciones pasadas). Para la edición
 *  vigente, el agenda se obtiene de Sessionize en build time.
 * ──────────────────────────────────────────────────────────────────── */
const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: z.object({
    edition: reference('editions'),
    title: z.string(),
    speakerNames: z.array(z.string()).default([]),
    speakerProfiles: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url().optional(),
        }),
      )
      .default([]),
    track: z.string().optional(),
    room: z.string().optional(),
    startTime: z.string().describe('HH:MM en hora de Lima (GMT-5)'),
    endTime: z.string().describe('HH:MM en hora de Lima (GMT-5)'),
    timezone: z.string().default('GMT-5'),
    order: z.number().int().default(0),
    youtubeUrl: z.string().url().optional(),
    facebookUrl: z.string().url().optional(),
    linkedinUrl: z.string().url().optional(),
    type: z.enum(['talk', 'break', 'keynote', 'panel', 'opening', 'closing']).default('talk'),
  }),
});

export const collections = {
  editions,
  speakers,
  organizers,
  sponsors,
  sessions,
};

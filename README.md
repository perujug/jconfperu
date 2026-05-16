# JConf Perú

Sitio oficial de **JConf Perú**, la conferencia anual organizada por
[Peru JUG](https://perujug.org/) sobre Java, Jakarta EE, Spring, GraalVM,
arquitecturas nativas en la nube y temas afines.

- 🌐 Producción: <https://jconfperu.com>
- 🛠️ Stack: [Astro 5](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com) + Content Collections + TypeScript estricto
- 🚀 Deploy: Vercel (Git Integration — preview deploys automáticos por PR)

---

## 🧭 Tabla de contenidos

- [Pre-requisitos](#-pre-requisitos)
- [Correr el sitio localmente](#-correr-el-sitio-localmente)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Cómo agregar una edición nueva](#-cómo-agregar-una-edición-nueva-ej-2027)
- [Cómo agregar un speaker](#-cómo-agregar-un-speaker)
- [Cómo agregar un sponsor](#-cómo-agregar-un-sponsor)
- [Cómo agregar una sesión / charla](#-cómo-agregar-una-sesión--charla)
- [Cómo agregar un organizador](#-cómo-agregar-un-organizador)
- [Comandos útiles](#-comandos-útiles)
- [Despliegue](#-despliegue)

---

## ✅ Pre-requisitos

- **Node.js** ≥ 20.19 (recomendado 22 LTS — está en `.nvmrc`)
- npm 10+ (viene con Node 22)

Si usas `fnm` o `nvm`:

```bash
fnm use   # o:  nvm use
```

## 🚀 Correr el sitio localmente

```bash
npm install
npm run dev
```

El servidor de desarrollo arranca en <http://localhost:4321> con HMR (recarga
en caliente al editar contenido o componentes).

## 🗂️ Estructura del proyecto

```
.
├── public/                    Activos servidos tal cual (favicon, robots.txt)
├── src/
│   ├── assets/images/         Imágenes procesadas (WebP/AVIF al build)
│   ├── components/            Componentes Astro (.astro) reutilizables
│   ├── content/               Contenido del sitio en Markdown / Frontmatter
│   │   ├── editions/          Una edición por archivo: 2023.md, 2024.md…
│   │   ├── speakers/          Speakers (uno por archivo)
│   │   ├── organizers/        Organizadores
│   │   ├── sponsors/          Sponsors
│   │   └── sessions/          Sesiones (charlas) por edición
│   ├── content.config.ts      Esquemas Zod de las collections
│   ├── layouts/Layout.astro   Layout base con SEO + JSON-LD
│   ├── lib/                   Helpers (editions, site, sessionize)
│   ├── pages/                 Rutas del sitio (index, /agenda, /speakers, …)
│   └── styles/global.css      Tokens de marca + Tailwind
├── astro.config.mjs           Config de Astro (sitemap, mdx, tailwind)
├── vercel.json                Config de Vercel + redirects de URLs antiguas
└── .github/workflows/ci.yml   CI: typecheck + build
```

## 🆕 Cómo agregar una edición nueva (ej. 2027)

> Esta es la operación más frecuente. Solo necesitas un archivo Markdown.

1. Copia `src/content/editions/2026.md` y renómbralo a `2027.md`.
2. Edita el _frontmatter_ con los datos del evento:

   ```yaml
   ---
   year: 2027
   title: JConf Perú 2027
   tagline: La conferencia para usuarios y desarrolladores Java.
   date: 2027-12-05T08:00:00-05:00   # null si aún no se confirma
   dateLabel: Fecha por anunciar     # se muestra solo si date == null
   status: upcoming                  # upcoming | past
   featured: true                    # SOLO una edición debe ser true
   venue:
     name: Centro de Convenciones Cronos
     address: Av. El Derby 055, Surco
     city: Lima
     country: Perú
     mapsQuery: Av. El Derby 055 Lima
   stats:
     hours: 10
     sessions: 14
     countries: 8
     speakers: 14
   sessionizeEventId: "abc123xyz"    # opcional, ID del evento en Sessionize
   cta:
     label: Comprar entradas
     href: https://...
   ---

   ## Sobre la edición 2027
   Texto Markdown libre que se renderiza en la home.
   ```

3. **Importante:** marca la edición anterior como histórica. En `2026.md`, cambia:

   ```yaml
   status: past
   featured: false
   ```

4. Eso es todo. Al hacer `npm run build`:
   - `/` muestra automáticamente la edición `featured: true` (la más nueva).
   - Las ediciones `status: past` aparecen en `/anteriores` con su propia
     página `/anteriores/<año>`.
   - Sitemap, JSON-LD `Event` y countdown se actualizan solos.

> Tip: Si no quieres copiar contenido viejo, usa `git mv` y deja el archivo
> antiguo intacto. Los archivos por año son independientes.

## 🎤 Cómo agregar un speaker

Crea un archivo en `src/content/speakers/<año>/<slug>.md`:

```markdown
---
name: Jane Doe
role: Senior Engineer
company: Acme Corp
country: Brasil
photo: ../../../assets/images/speakers/2027/jane-doe.jpg   # opcional
website: https://janedoe.dev
twitter: https://twitter.com/janedoe
linkedin: https://www.linkedin.com/in/janedoe/
github: https://github.com/janedoe
editions: [2027]
featured: false
---

Bio opcional en Markdown.
```

Coloca la foto en `src/assets/images/speakers/<año>/`. Astro la procesa
automáticamente a WebP/AVIF responsivos.

> Para la edición destacada, los speakers también pueden venir de **Sessionize**
> automáticamente si configuras `sessionizeEventId` en la edición. En ese caso
> los archivos locales son opcionales (sirven como respaldo si Sessionize falla).

## 💼 Cómo agregar un sponsor

Crea `src/content/sponsors/<slug>.md`:

```markdown
---
name: Acme Corp
tier: platinum            # platinum | gold | silver | community
logo: ../../assets/images/sponsors/acme.png
website: https://acme.com
editions: [2026, 2027]    # años en los que patrocinó
---
```

El logo aparecerá automáticamente en `/sponsors`, en el home (si la edición
es la destacada) y en la página histórica de cada año correspondiente.

## 📅 Cómo agregar una sesión / charla

Para ediciones donde mantenemos la agenda en el repo (ediciones pasadas),
crea `src/content/sessions/<año>/<orden>-<slug>.md`:

```markdown
---
edition: "2027"               # ⚠️ string, no número (es el id del archivo)
title: Domain-Driven Design en la práctica
speakerProfiles:
  - name: Jane Doe
    url: https://janedoe.dev
room: Sala A
startTime: "10:00"
endTime: "10:50"
order: 4                      # determina el orden en la grilla
type: talk                    # talk | break | keynote | panel | opening | closing
youtubeUrl: https://...
facebookUrl: https://...
linkedinUrl: https://...
---
```

> Para la edición vigente (con `sessionizeEventId`), la agenda se obtiene de
> Sessionize en build time. No es necesario crear `sessions/*.md` ese año.

## 👥 Cómo agregar un organizador

Crea `src/content/organizers/<slug>.md`:

```markdown
---
name: Pedro Pérez
role: Comunidad y partnerships
photo: ../../assets/images/organizers/pedro.jpg
linkedin: https://www.linkedin.com/in/pperez/
twitter: https://twitter.com/pperez
editions: [2026, 2027]
order: 5                      # orden ascendente; los más bajos van primero
---

Bio breve opcional.
```

## 🛠️ Comandos útiles

| Comando             | Para qué sirve                                       |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo en <http://localhost:4321>     |
| `npm run build`     | Genera el sitio estático en `dist/`                   |
| `npm run preview`   | Sirve `dist/` localmente para verificar producción    |
| `npm run check`     | `astro check` — typecheck + valida content collections |
| `npm run astro -- add <integración>` | Agrega integraciones de Astro          |

## 🚢 Despliegue

El sitio se despliega con la **Git Integration nativa de Vercel**, conectada a
este repositorio:

- **Producción**: cada merge a `master` despliega a <https://jconfperu.com>.
- **Preview deploys**: cada Pull Request recibe automáticamente una URL
  única (`*.vercel.app`) y un comentario en el PR con el enlace.

El workflow de GitHub Actions (`.github/workflows/ci.yml`) **solo** corre
typecheck + build como gate de calidad. **No** despliega — eso lo hace Vercel
de forma directa al detectar cambios en el repositorio.

### URLs antiguas

Los enlaces de versiones previas (`/2024.html`, `/agenda.html`,
`/payment-info.html`) están redirigidos vía `vercel.json` a sus equivalentes
modernos.

## 📜 Licencia

[MIT](./LICENSE) — © Peru JUG

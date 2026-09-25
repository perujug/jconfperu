# JConf Perú

Sitio oficial de **JConf Perú**, la conferencia anual organizada por
[Peru JUG](https://perujug.org/) sobre Java, Jakarta EE, Spring, GraalVM,
arquitecturas nativas en la nube y temas afines.

- 🌐 Producción: <https://jconfperu.com>
- 🛠️ Stack: [Astro 7](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com) + Content Collections + TypeScript estricto
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

- **Node.js 22 LTS** (mínimo 22.12; versión recomendada en `.mise.toml` y `.nvmrc`)
- npm 10+

Con `mise`:

```bash
mise install
```

También puedes usar `fnm` o `nvm` con `.nvmrc`.

## 🚀 Correr el sitio localmente

```bash
npm ci
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

> Para la edición vigente, `sessionizeEventId` debe ser el ID de un endpoint
> **JSON** creado en **API / Embed** de Sessionize, no el ID de un embed visual.
> La agenda se consulta durante el build y usa contenido local como respaldo.

### Archivar una edición de Sessionize

Cuando termine el evento:

1. Exporta speakers y agenda desde el endpoint JSON de Sessionize.
2. Crea los registros en `src/content/speakers/<año>/` y
   `src/content/sessions/<año>/`.
3. Elimina `sessionizeEventId` de la edición histórica para que el archivo no
   dependa de un servicio externo.
4. Cambia la edición a `status: past` y `featured: false`.
5. Instala Chromium una vez con `npx playwright install chromium`, ejecuta
   `npm test` y revisa `/anteriores/<año>` en el preview.

La edición 2025 ya está archivada localmente siguiendo este proceso.

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

| Comando | Para qué sirve |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en <http://localhost:4321> |
| `npm run check` | Typecheck y validación de Content Collections |
| `npm run build` | Genera activos sociales y el sitio estático en `dist/` |
| `npm run validate:site` | Valida enlaces, activos, metadata y redirects generados |
| `npm run test:site` | Smoke tests y Axe sobre el preview local |
| `npm test` | Ejecuta el gate local completo |
| `npm run audit` | Rechaza vulnerabilidades high/critical conocidas |

La primera ejecución de los tests de navegador requiere Chromium:

```bash
npx playwright install chromium
```

## 🚢 Despliegue

El sitio se despliega mediante la **Git Integration nativa de Vercel**:

- **Producción**: cada merge a `master` despliega a <https://jconfperu.com>.
- **Preview**: cada Pull Request debe recibir una URL `*.vercel.app`.
- **Build**: Vercel instala con `npm ci` y publica `dist/`.

GitHub Actions no despliega. Ejecuta auditoría, typecheck, build, validación del
sitio generado, pruebas de navegador y accesibilidad.

### Gate de aprobación

Antes de mergear una edición o rediseño:

1. CI debe estar completamente verde y sin vulnerabilidades high/critical no aceptadas.
2. Un maintainer técnico revisa navegación, responsive, tema y fallback de Sessionize.
3. Un organizador valida fecha, sede, agenda, speakers, sponsors, registro y textos.
4. Se prueban mobile y desktop, social cards y las rutas históricas en el preview.
5. La credencial antigua de Google Maps debe estar rotada o restringida por API y referrer.

### Verificación y rollback

Después del merge, verifica `/`, `/agenda`, `/speakers`, `/anteriores/2025`,
`sitemap-index.xml`, los redirects y la tarjeta social. Si falla un gate,
restaura inmediatamente el deployment anterior desde Vercel y revierte el merge.

### URLs antiguas

`/2024.html`, `/agenda.html`, `/payment-info.html` e `/index.html` se redirigen
permanentemente desde `vercel.json`.

## 📜 Licencia

[MIT](./LICENSE) — © Peru JUG

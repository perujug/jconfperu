# Design: JConf Peru modernization hardening

## Architecture decision

Retain PR #72’s Astro content architecture and static deployment model. Upgrade and harden it rather than returning to the legacy template or introducing a React SPA, server-rendered application, Java backend, database, or CMS.

## Runtime and dependencies

- Node.js 22 LTS, minimum 22.12.
- Astro 7 with static output.
- Tailwind CSS 4 through its Vite integration.
- TypeScript 5.9 until Astro’s ecosystem formally adopts a later stable major.
- Exact direct dependency versions in `package.json`; lockfile is authoritative.

## Content model

Astro Content Collections remain the source of truth:

- `editions`: annual event state and featured edition.
- `speakers`, `sessions`, `sponsors`, `organizers`: reusable structured records.
- Sessionize is queried only during builds for the active event.
- Completed events must be snapshotted into repository content so archives do not depend permanently on Sessionize.

A build-time invariant will fail when zero or multiple editions are marked `featured`.

## Public metadata

A generated 1200×630 PNG will be committed under `public/` for Open Graph and Twitter cards. A dedicated touch icon will replace the oversized favicon in metadata and structured data. Maps will use query-based Google Maps links rather than fabricated embed payloads or API credentials.

## Validation

A dependency-free Node script will inspect generated HTML and enforce:

- internal links resolve to generated files;
- referenced local images/assets exist;
- required canonical, Open Graph, Twitter, and JSON-LD metadata exists;
- the Open Graph image resolves locally.

Playwright will run Chromium smoke tests against Astro preview and Axe will reject serious or critical accessibility violations on representative pages.

## CI/CD

GitHub Actions will use current Node 24-compatible action versions, `npm ci`, Astro checks, build validation, Playwright Chromium, and artifact upload. Vercel Git Integration remains responsible for deployments; `vercel.json` uses `npm ci` and preserves legacy redirects.

## Security

No secrets are required by the application. Historical Google Maps credentials must be rotated or restricted outside the repository. Dependency audit findings must be reviewed after the Astro upgrade; production deployment is blocked by unreviewed critical or high findings.

## Rollout

1. Produce a Vercel preview.
2. Obtain technical and content-owner approval.
3. Verify mobile/desktop, navigation, current-event content, archives, social metadata, and Sessionize fallback.
4. Merge to `master` during a low-traffic window.
5. Verify production and retain the previous Vercel deployment for rollback.

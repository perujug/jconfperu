# Requirements: JConf Peru modernization hardening

## Objective

Prepare the Astro migration in PR #72 for safe review and production deployment while keeping JConf Peru fast, accessible, SEO-friendly, and maintainable by PeruJUG volunteers.

## User stories

### R1 — Supported static platform
As a maintainer, I want the site on a supported Astro and Node.js baseline so that security fixes and ecosystem integrations remain available.

**Acceptance criteria**
- Astro is pinned to the current supported major and all direct dependencies use exact versions.
- Node.js requirements are explicit and compatible locally, in CI, and on Vercel.
- Installation is reproducible with `npm ci`.

### R2 — Safe annual content lifecycle
As an organizer, I want each edition represented as validated content so that updating the conference does not require copying HTML.

**Acceptance criteria**
- Exactly one edition is featured.
- Upcoming editions may omit unconfirmed date and venue data without inventing information.
- Sessionize failures fall back to repository content or a clear “to be announced” state.
- Documentation explains how to snapshot completed events into local content.

### R3 — Correct metadata and public assets
As an attendee sharing the site, I want working previews and metadata so that JConf Peru is represented professionally.

**Acceptance criteria**
- Open Graph and Twitter images resolve in the production build.
- Organization metadata uses a suitable public logo.
- Legacy URLs redirect permanently to their modern equivalents.
- The 2025 location uses a trustworthy maps link without placeholder tokens or embedded API credentials.

### R4 — Automated quality gates
As a maintainer, I want focused automated checks so that broken routes, assets, metadata, and accessibility regressions cannot silently deploy.

**Acceptance criteria**
- Astro type/content checks and production build pass.
- Generated internal links and local assets are validated.
- Browser smoke tests cover the main routes, metadata, legacy redirects, and basic accessibility.
- CI uses current Node-compatible GitHub Actions and uploads the static build artifact.

### R5 — Safe deployment workflow
As an organizer, I want preview review and rollback guidance so that a full-site migration can be approved before production.

**Acceptance criteria**
- Vercel uses `npm ci`, builds `dist`, and relies on Git integration for previews and production.
- README documents technical review, content-owner review, preview QA, deployment verification, and rollback.
- No deployment credentials or API keys are committed.

## Constraints

- Preserve static output; do not add a backend or runtime database.
- Keep Spanish as the site’s primary language.
- Do not fabricate JConf 2026 dates, venue, registration, speakers, or sponsors.
- Keep JConf Peru focused on the conference and link to PeruJUG for broader community activity.

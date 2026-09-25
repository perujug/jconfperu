import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const dist = join(root, 'dist');
const productionOrigin = 'https://jconfperu.com';
const errors = [];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return nested.flat();
}

function candidates(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
  if (!decoded) return [join(dist, 'index.html')];
  if (extname(decoded)) return [join(dist, decoded)];
  return [join(dist, decoded, 'index.html'), join(dist, `${decoded}.html`)];
}

async function validateReference(sourceFile, value) {
  if (!value || value.startsWith('#') || value.startsWith('mailto:') || value.startsWith('tel:')) return;

  let url;
  try {
    url = new URL(value, productionOrigin);
  } catch {
    errors.push(`${sourceFile}: invalid URL ${value}`);
    return;
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== productionOrigin) return;
  const resolved = await Promise.all(candidates(url.pathname).map(exists));
  if (!resolved.some(Boolean)) errors.push(`${sourceFile}: missing local target ${url.pathname}`);
}

if (!(await exists(dist))) throw new Error('dist does not exist; run npm run build first');

const files = await walk(dist);
const htmlFiles = files.filter((file) => file.endsWith('.html'));

for (const file of htmlFiles) {
  const name = relative(dist, file);
  const html = await readFile(file, 'utf8');
  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const reference of references) await validateReference(name, reference);

  if (name !== '404.html') {
    const required = [
      ['canonical URL', /<link\s+rel=["']canonical["']/],
      ['Open Graph image', /<meta\s+property=["']og:image["']/],
      ['Twitter image', /<meta\s+name=["']twitter:image["']/],
      ['JSON-LD', /<script[^>]+type=["']application\/ld\+json["']/],
    ];
    for (const [label, pattern] of required) {
      if (!pattern.test(html)) errors.push(`${name}: missing ${label}`);
    }
  }
}

const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
if (vercel.installCommand !== 'npm ci') errors.push('vercel.json: installCommand must be npm ci');
const expectedRedirects = ['/2024.html', '/index.html', '/agenda.html', '/payment-info.html'];
for (const source of expectedRedirects) {
  if (!vercel.redirects?.some((redirect) => redirect.source === source && redirect.permanent === true)) {
    errors.push(`vercel.json: missing permanent redirect for ${source}`);
  }
}

if (errors.length) {
  console.error(`Generated-site validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML pages, internal targets, public assets, metadata, and redirects.`);

import { createServer } from 'node:http';
import { access, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
let port = 4321;
let host = '127.0.0.1';
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--port') port = Number(args[++index]);
  else if (arg?.startsWith('--port=')) port = Number(arg.slice(7));
  else if (arg === '--host') host = args[++index] ?? host;
  else if (arg?.startsWith('--host=')) host = arg.slice(7);
}

const candidates = [
  new URL('../dist/client/', import.meta.url),
  new URL('../dist/', import.meta.url),
];
let root = candidates[0];
for (const candidate of candidates) {
  try {
    await access(candidate);
    root = candidate;
    break;
  } catch {
    /* try the next build directory */
  }
}

let render = null;
try {
  const functionDir = new URL('../.vercel/output/functions/_render.func/', import.meta.url);
  const config = JSON.parse(await readFile(new URL('.vc-config.json', functionDir), 'utf8'));
  const handler = new URL(config.handler, functionDir);
  const mod = await import(handler);
  if (typeof mod.default?.fetch === 'function') render = (request) => mod.default.fetch(request);
} catch (error) {
  console.error(`SSR preview unavailable: ${error instanceof Error ? error.message : error}`);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function fileUrl(pathname) {
  const safe = pathname.replace(/^\/+/, '');
  const url = new URL(safe, root);
  if (!url.pathname.startsWith(root.pathname)) return null;
  return url;
}

async function readBuilt(pathname) {
  const paths = pathname.endsWith('/')
    ? [join(pathname, 'index.html')]
    : [pathname, join(pathname, 'index.html')];
  for (const candidate of paths) {
    const url = fileUrl(candidate);
    if (!url) continue;
    try {
      return { body: await readFile(url), type: types[extname(url.pathname)] ?? 'application/octet-stream' };
    } catch {
      /* try the directory index */
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}`);
  let pathname = '/';
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname.includes('\0') || pathname.split('/').includes('..')) {
    response.writeHead(400).end();
    return;
  }

  const found = await readBuilt(pathname);
  if (found) {
    response.writeHead(200, { 'Content-Type': found.type });
    response.end(found.body);
    return;
  }

  if (render) {
    try {
      const rendered = await render(new Request(`http://${host}:${port}${request.url ?? '/'}`, {
        method: request.method,
        headers: request.headers,
      }));
      const headers = Object.fromEntries(rendered.headers);
      const body = Buffer.from(await rendered.arrayBuffer());
      response.writeHead(rendered.status, headers);
      response.end(body);
      return;
    } catch (error) {
      console.error(error);
    }
  }

  const missing = fileUrl('/404.html');
  if (!missing) {
    response.writeHead(404).end();
    return;
  }
  const body = await readFile(missing);
  response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(body);
});

server.listen(port, host, () => {
  console.log(`Static preview at http://${host}:${port}`);
});

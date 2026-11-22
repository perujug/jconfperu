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
    await access(new URL('index.html', candidate));
    root = candidate;
    break;
  } catch {
    /* try the next build directory */
  }
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

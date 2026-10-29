/**
 * Dev-only server for the Base44 sandbox preview.
 *
 * The real site is deployed on Netlify: static files from the repo root plus
 * Netlify Functions in netlify/functions. This server reproduces that locally
 * (static files + `/.netlify/functions/<name>` routed to the same handlers)
 * so the preview exercises the real code paths without a build step.
 *
 * It is never used in production.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);
const FUNCTION_PREFIX = '/.netlify/functions/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2'
};

// Mirrors Netlify's pretty-URL behavior (/admin -> /admin/index.html).
async function findStaticFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname));
  if (!clean.startsWith('/') || clean.includes('\0')) return null;
  const base = join(ROOT, clean);
  if (!base.startsWith(ROOT)) return null;
  for (const candidate of [base, `${base}.html`, join(base, 'index.html')]) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

const handlers = new Map();
async function loadFunction(name) {
  if (!/^[a-z0-9-]+$/i.test(name)) return null;
  if (!handlers.has(name)) {
    const entry = pathToFileURL(join(ROOT, 'netlify', 'functions', `${name}.mjs`)).href;
    handlers.set(
      name,
      import(entry)
        .then(mod => (typeof mod.default === 'function' ? mod.default : null))
        .catch(error => {
          console.error(`[functions] cannot load ${name}:`, error.message);
          return null;
        })
    );
  }
  return handlers.get(name);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function serveFunction(req, res, url) {
  const name = url.pathname.slice(FUNCTION_PREFIX.length).replace(/\/+$/, '');
  const handler = await loadFunction(name);
  if (!handler) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `Function ${name} not found` }));
    return;
  }
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await readBody(req) : undefined;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body && body.length ? body : undefined
  });
  const response = await handler(request);
  if (!(response instanceof Response)) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Function did not return a response' }));
    return;
  }
  const headers = Object.fromEntries(response.headers.entries());
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
    if (url.pathname.startsWith(FUNCTION_PREFIX)) {
      await serveFunction(req, res, url);
      return;
    }
    const file = await findStaticFile(url.pathname);
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store, must-revalidate'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  } catch (error) {
    console.error('[server]', error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CTC dev server on http://0.0.0.0:${PORT}`);
});

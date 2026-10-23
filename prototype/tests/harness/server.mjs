// Offline harness server: serves the esbuild bundle of the real app and routes
// /api/* to the real route handlers (Fetch API Request -> Response).
// See tests/harness/README.md for what this does and does not prove.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { projectRoot } from './tool-require.mjs';
import { build, buildDir } from './build.mjs';

const MIME = { '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8' };

function png(size, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).fill(Buffer.from(rgb))]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// Stand-ins only when the real files (present in the full handoff ZIP) are missing.
const placeholders = {
  '/favicon.svg': () => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#7c65bd"/></svg>'),
  '/icon-192.png': () => png(192, [124, 101, 189]),
  '/icon-512.png': () => png(512, [124, 101, 189]),
};

const shell = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#f8f9fc"><title>Care Kotoba | 介護のことばを、現場の力に。</title><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/favicon.svg"><link rel="apple-touch-icon" href="/icon-192.png"><link rel="stylesheet" href="/__harness/globals.css"></head><body class="antialiased"><div id="root" style="display:contents"></div><script type="module" src="/__harness/app.js"></script></body></html>`;

function matchRoute(routes, pathname) {
  for (const r of routes) {
    const pp = r.pattern.split('/').filter(Boolean), up = pathname.split('/').filter(Boolean);
    if (pp.length !== up.length) continue;
    const params = {};
    let ok = true;
    pp.forEach((seg, i) => { const m = /^\[(.+)\]$/.exec(seg); if (m) params[m[1]] = decodeURIComponent(up[i]); else if (seg !== up[i]) ok = false; });
    if (ok) return { route: r, params };
  }
  return null;
}

/**
 * Start the harness.
 * @param {{port?: number, env?: Record<string,string|undefined>, rebuild?: boolean, rewriteOpenAI?: string}} opts
 *   rewriteOpenAI: origin (e.g. http://127.0.0.1:4010) that requests to https://api.openai.com are redirected to.
 *   Needed for code that hard-codes the OpenAI URL (the unmodified baseline).
 */
export async function startHarness({ port = 0, env = {}, rebuild = true, rewriteOpenAI } = {}) {
  for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  if (rebuild || !existsSync(join(buildDir, 'routes.mjs'))) await build({ quiet: true });
  const { routes } = await import(pathToFileURL(join(buildDir, 'routes.mjs')).href + `?t=${Date.now()}`);
  if (rewriteOpenAI && !globalThis.__ckFetchRewritten) {
    const orig = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.openai.com/')) {
        const target = url.replace('https://api.openai.com', globalThis.__ckRewriteOrigin);
        return typeof input === 'string' || input instanceof URL ? orig(target, init) : orig(new Request(target, input), init);
      }
      return orig(input, init);
    };
    globalThis.__ckFetchRewritten = true;
  }
  if (rewriteOpenAI) globalThis.__ckRewriteOrigin = rewriteOpenAI;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        const hit = matchRoute(routes, url.pathname);
        const handler = hit && hit.route.mod[req.method];
        if (!handler) { res.writeHead(hit ? 405 : 404, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'not found' })); return; }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
        const request = new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
        const response = await handler(request, { params: Promise.resolve(hit.params) });
        const outHeaders = {};
        response.headers.forEach((v, k) => { if (k === 'set-cookie') return; outHeaders[k] = v; });
        const cookies = response.headers.getSetCookie?.() || [];
        if (cookies.length) outHeaders['set-cookie'] = cookies;
        res.writeHead(response.status, outHeaders);
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (url.pathname === '/__harness/app.js') return send(res, 200, MIME['.js'], readFileSync(join(buildDir, 'app.js')));
      if (url.pathname === '/__harness/globals.css') return send(res, 200, MIME['.css'], readFileSync(join(projectRoot, 'app', 'globals.css')));
      if (url.pathname === '/__harness/info') return send(res, 200, MIME['.json'], readFileSync(join(buildDir, 'build-info.json')));
      const safe = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
      const file = join(projectRoot, 'public', safe);
      if (safe !== '/' && file.startsWith(join(projectRoot, 'public')) && existsSync(file)) return send(res, 200, MIME[extname(file)] || 'application/octet-stream', readFileSync(file));
      if (placeholders[url.pathname]) return send(res, 200, MIME[extname(url.pathname)], placeholders[url.pathname]());
      if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) return send(res, 200, MIME['.html'], Buffer.from(shell));
      send(res, 404, 'text/plain', Buffer.from('not found'));
    } catch (e) {
      console.error('[harness]', e);
      send(res, 500, 'text/plain', Buffer.from('harness error'));
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
  const { port: actual } = server.address();
  return { url: `http://127.0.0.1:${actual}`, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
}

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 5173);
  const h = await startHarness({ port, rewriteOpenAI: process.env.CK_HARNESS_REWRITE_OPENAI });
  console.log(`harness ready: ${h.url}`);
}

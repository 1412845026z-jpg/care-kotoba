// A11Y-CI-001: preload for unchanged audit.mjs and the axe report runner.
// The app and AI mock must both stay on loopback. Browser fonts deliberately use
// the offline fallback; this job does not claim to test the real Google fonts.
import { writeFileSync } from 'node:fs';
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const root = process.env.CK_A11Y_REPO_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { toolRequire } = await import(pathToFileURL(join(root, 'prototype/tests/harness/tool-require.mjs')).href);
const report = { mode: 'offline-loopback-only', nodeBlocked: [], browserBlocked: [], websocketBlocked: [] };
const local = (host) => ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(String(host).toLowerCase());
const describe = (input) => {
  try { const u = new URL(input); return `${u.origin}${u.pathname}`; }
  catch { return String(input).slice(0, 150); }
};
function allowedBrowser(input) {
  const u = new URL(input);
  return (['http:', 'https:'].includes(u.protocol) && local(u.hostname)) || ['about:', 'data:', 'blob:'].includes(u.protocol);
}

// Covers native fetch plus HTTP/HTTPS libraries that use Node's network sockets.
// Unix sockets and child-process pipes are allowed; TCP connections must be local.
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let value = args[0];
  if (Array.isArray(value)) value = value[0]; // Node internal normalized arguments
  let host = 'localhost';
  let tcp = false;
  if (typeof value === 'number') { tcp = true; if (typeof args[1] === 'string') host = args[1]; }
  else if (value && typeof value === 'object' && value.port != null) { tcp = true; host = value.host || value.hostname || host; }
  if (tcp && !local(host)) {
    report.nodeBlocked.push({ transport: 'tcp', host: String(host) });
    throw new Error(`A11Y offline guard blocks TCP host: ${host}`);
  }
  return originalConnect.apply(this, args);
};
syncBuiltinESMExports();

const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol) || !local(u.hostname)) {
    report.nodeBlocked.push({ transport: 'fetch', url: describe(value) });
    throw new Error(`A11Y offline guard blocks fetch: ${u.hostname}`);
  }
  return originalFetch(input, init);
};

const { chromium } = toolRequire('playwright');
const originalLaunch = chromium.launch.bind(chromium);
chromium.launch = async (options = {}) => {
  const browser = await originalLaunch({
    ...options,
    args: [...(options.args || []), '--disable-background-networking', '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost;[::1]'],
  });
  const originalNewContext = browser.newContext.bind(browser);
  browser.newContext = async (options = {}) => {
    const context = await originalNewContext({ ...options, serviceWorkers: 'block' });
    await context.route('**/*', (route) => {
      const value = route.request().url();
      if (allowedBrowser(value)) return route.continue();
      report.browserBlocked.push({ resourceType: route.request().resourceType(), url: describe(value) });
      return route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', (socket) => {
      const u = new URL(socket.url());
      if (['ws:', 'wss:'].includes(u.protocol) && local(u.hostname)) socket.connectToServer();
      else { report.websocketBlocked.push({ url: describe(socket.url()) }); socket.close(); }
    });
    return context;
  };
  return browser;
};

globalThis.__CK_A11Y_NETWORK__ = report;
process.on('exit', () => {
  if (process.env.CK_A11Y_NETWORK_REPORT) writeFileSync(process.env.CK_A11Y_NETWORK_REPORT, JSON.stringify(report, null, 2) + '\n');
});

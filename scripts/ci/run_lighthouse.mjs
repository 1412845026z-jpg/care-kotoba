// Informational mobile Lighthouse report against the existing offline harness.
// The harness is a development bundle: scores are diagnostic, not release SLOs.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.env.CK_LIGHTHOUSE_REPO_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out')) throw new Error('Usage: node scripts/ci/run_lighthouse.mjs [--out <directory>]');
const out = resolve(args[1] || join(root, 'lighthouse-results'));
const toolDir = process.env.CK_LIGHTHOUSE_TOOLS || join(root, 'scripts/ci/lighthouse-tools');
const toolModules = process.env.CK_TOOL_NODE_MODULES;
const explicitChrome = process.env.CK_LIGHTHOUSE_CHROME;
// No inherited provider credentials, alternate base URL, external app, or preload.
for (const key of Object.keys(process.env)) {
  if (key.startsWith('OPENAI_') || key.startsWith('CK_') || ['BASE_URL', 'NODE_OPTIONS'].includes(key)) delete process.env[key];
}
Object.assign(process.env, { CI: 'true', WRANGLER_SEND_METRICS: 'false', NEXT_TELEMETRY_DISABLED: '1', CK_A11Y_REPO_ROOT: root });
if (toolModules) process.env.CK_TOOL_NODE_MODULES = toolModules;
mkdirSync(out, { recursive: true });
process.env.CK_A11Y_NETWORK_REPORT = join(out, 'node-network.json');
await import('./a11y_offline_guard.mjs');
const { toolRequire } = await import(pathToFileURL(join(root, 'prototype/tests/harness/tool-require.mjs')).href);
const { startHarness } = await import(pathToFileURL(join(root, 'prototype/tests/harness/server.mjs')).href);
const requireTool = createRequire(join(toolDir, 'package.json'));
const lighthouseEntry = requireTool.resolve('lighthouse');
const { default: lighthouse } = await import(pathToFileURL(lighthouseEntry).href);
const { launch } = await import(pathToFileURL(requireTool.resolve('chrome-launcher')).href);
const lighthousePackage = JSON.parse(readFileSync(join(dirname(lighthouseEntry), '../package.json'), 'utf8'));
if (lighthousePackage.version !== '13.5.0') throw new Error(`Expected Lighthouse 13.5.0, found ${lighthousePackage.version}`);
const { chromium } = toolRequire('playwright');
const summary = {
  ranAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  mode: 'offline development harness; no AI key; homepage navigation only',
  lighthouse: lighthousePackage.version, node: process.version, reportOnly: true, paidApiCalls: 0,
  packageLockSha256: createHash('sha256').update(readFileSync(join(toolDir, 'package-lock.json'))).digest('hex'),
  limitations: [
    'Development React/esbuild bundle, no production SSR/Worker/CSP; scores are not production performance.',
    'Mobile emulation is not a physical handset. One run per checkout is noisy.',
    'External browser traffic is forced through a closed loopback proxy; Google Fonts use fallback fonts.',
    'Only the homepage is scanned. Practice, feedback and notes are covered separately by A11Y CI.',
    'No AI, microphone, subscription, real-device or commercial-readiness acceptance.',
  ],
  categories: {}, findings: [], runtimeError: null,
};
let harness;
let chrome;
try {
  harness = await startHarness({ env: { OPENAI_API_KEY: undefined, OPENAI_BASE_URL: undefined, CK_ACCESS_POLICY: 'local', CK_ACCESS_CODE: undefined } });
  const health = await (await fetch(harness.url + '/api/health')).json();
  if (health.configured !== false) throw new Error('Lighthouse harness unexpectedly has an AI key');
  summary.healthConfigured = health.configured;
  const chromePath = explicitChrome || chromium.executablePath();
  if (!existsSync(chromePath)) throw new Error(`Chromium executable is missing: ${chromePath}; run pnpm exec playwright install chromium`);
  chrome = await launch({ chromePath, chromeFlags: [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
    '--disable-component-update', '--disable-domain-reliability', '--disable-sync', '--metrics-recording-only', '--no-first-run',
    '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost;[::1]',
  ] });
  const result = await lighthouse(harness.url, {
    port: chrome.port, hostname: '127.0.0.1', logLevel: 'info', output: ['json', 'html'],
    formFactor: 'mobile', locale: 'en-US', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    maxWaitForFcp: 30_000, maxWaitForLoad: 45_000,
  });
  if (!result?.lhr || !Array.isArray(result.report)) throw new Error('Lighthouse returned no report');
  writeFileSync(join(out, 'mobile.report.json'), result.report[0]);
  writeFileSync(join(out, 'mobile.report.html'), result.report[1]);
  const { lhr } = result;
  if (lhr.runtimeError) throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
  summary.chrome = lhr.environment?.hostUserAgent;
  summary.settings = lhr.configSettings;
  summary.runWarnings = lhr.runWarnings;
  const networkRequests = lhr.audits['network-requests']?.details?.items || [];
  summary.browserExternalRequests = networkRequests.filter((request) => {
    const url = new URL(request.url);
    return ['http:', 'https:'].includes(url.protocol) && !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname);
  }).map(({ url, statusCode, transferSize, resourceType }) => ({ url, statusCode, transferSize, resourceType }));
  if (summary.browserExternalRequests.some((request) => request.statusCode > 0 || request.transferSize > 0)) throw new Error('An external browser request escaped the closed loopback proxy');
  summary.categories = Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, { score: value.score, title: value.title }]));
  const auditCategories = new Map();
  for (const [key, category] of Object.entries(lhr.categories)) for (const ref of category.auditRefs) {
    if (!auditCategories.has(ref.id)) auditCategories.set(ref.id, []);
    auditCategories.get(ref.id).push(key);
  }
  summary.findings = Object.entries(lhr.audits).filter(([, value]) => value.scoreDisplayMode === 'error' || (typeof value.score === 'number' && value.score < 1)).map(([id, value]) => ({
    id, categories: auditCategories.get(id) || [], title: value.title, score: value.score,
    displayValue: value.displayValue, explanation: value.explanation, errorMessage: value.errorMessage,
    details: value.details,
  }));
  summary.metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'].map((id) => [id, { value: lhr.audits[id]?.numericValue, unit: lhr.audits[id]?.numericUnit, display: lhr.audits[id]?.displayValue }]));
  const forbidden = globalThis.__CK_A11Y_NETWORK__;
  if (forbidden.nodeBlocked.length || forbidden.websocketBlocked.length) throw new Error('Forbidden Node/WebSocket request attempted; see node-network.json');
} catch (error) {
  summary.runtimeError = String(error?.stack || error);
  console.error(error);
  // No score or accessibility finding blocks CI. A broken report is explicit;
  // the workflow marks this whole diagnostic job continue-on-error.
  process.exitCode = 1;
} finally {
  try { await chrome?.kill(); } catch (error) { summary.cleanupError = String(error); process.exitCode = 1; }
  try { await harness?.close(); } catch (error) { summary.cleanupError = String(error); process.exitCode = 1; }
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  const lines = [
    '# Lighthouse mobile report (informational)', '',
    `Source: ${summary.sourceCommit}; Lighthouse ${summary.lighthouse}; Node ${summary.node}.`, '',
    summary.runtimeError ? `**Report generation failed:** ${summary.runtimeError.split('\n')[0]}` : 'No score threshold is enforced.', '',
    '| Category | Score / 100 |', '| --- | ---: |',
    ...Object.entries(summary.categories).map(([key, value]) => `| ${key} | ${value.score == null ? 'n/a' : Math.round(value.score * 100)} |`), '',
    '## Findings to review (Claude owns App changes)', '',
    ...summary.findings.map((value) => `- **${value.id}**: ${value.title}${value.displayValue ? ` (${value.displayValue})` : ''}${value.errorMessage ? ` — report error: ${value.errorMessage}` : ''}`), '',
    '## Scope limits', '', ...summary.limitations.map((value) => `- ${value}`), '',
  ];
  writeFileSync(join(out, 'summary.md'), lines.join('\n'));
  console.log(lines.join('\n'));
}

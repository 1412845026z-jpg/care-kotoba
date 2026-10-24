// Two fixed viewport audits plus informational axe scans. No real dev/API mode.
// Run from any directory: node scripts/ci/run_a11y.mjs --out a11y-results
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const root = process.env.CK_A11Y_REPO_ROOT || resolve(scriptsDir, '../..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out')) throw new Error('Usage: node scripts/ci/run_a11y.mjs [--out <directory>]');
const out = resolve(args[1] || join(root, 'a11y-results'));
mkdirSync(out, { recursive: true });
const viewports = ['390x844', '1280x860'];
const axeScreens = ['home', 'scene-modal', 'practice-text', 'feedback', 'notes', 'settings'];
const requiredAuditScreens = [...axeScreens, 'scenes', 'progress', 'home-core', 'scenes-core', 'core-modal'];
const summary = { ranAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), node: process.version, mode: 'offline harness + loopback mock AI', paidApiCalls: 0, auditScript: 'verification/A11Y-001/audit.mjs', auditScriptSha256: createHash('sha256').update(readFileSync(join(root, 'verification/A11Y-001/audit.mjs'))).digest('hex'), hardGateFields: ['contrast', 'targetsUnder24', 'textUnder12px'], viewports: {}, passed: true, errors: [] };
const childEnv = { ...process.env };
for (const key of Object.keys(childEnv)) {
  if (key.startsWith('OPENAI_') || key.startsWith('CK_') || ['BASE_URL', 'NODE_OPTIONS'].includes(key)) delete childEnv[key];
}
Object.assign(childEnv, { CI: 'true', WRANGLER_SEND_METRICS: 'false', NEXT_TELEMETRY_DISABLED: '1', CK_A11Y_REPO_ROOT: root });
// Allow only the explicit tooling fallback; no external URL or credential is inherited.
if (process.env.CK_TOOL_NODE_MODULES) childEnv.CK_TOOL_NODE_MODULES = process.env.CK_TOOL_NODE_MODULES;

async function run(script, viewport, name) {
  const output = join(out, `${name}-${viewport}.json`);
  const network = join(out, `${name}-${viewport}-network.json`);
  const stdoutPath = join(out, `${name}-${viewport}.log`);
  const code = await new Promise((done, fail) => {
    const child = spawn(process.execPath, ['--import', join(scriptsDir, 'a11y_offline_guard.mjs'), script, output], {
      cwd: join(root, 'prototype'), env: { ...childEnv, CK_AUDIT_VIEWPORT: viewport, CK_A11Y_NETWORK_REPORT: network }, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
    let log = '';
    const append = (buf) => { const text = buf.toString(); log += text; process.stdout.write(text); };
    child.stdout.on('data', append); child.stderr.on('data', append);
    const timer = setTimeout(() => {
      append(Buffer.from(`\nA11Y runner exceeded 180 seconds: ${name} ${viewport}\n`));
      if (process.platform === 'win32') child.kill('SIGKILL');
      else { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
    }, 180_000);
    child.once('error', (error) => { clearTimeout(timer); writeFileSync(stdoutPath, log); fail(error); });
    child.once('exit', (status, signal) => { clearTimeout(timer); writeFileSync(stdoutPath, log); done(status ?? `signal:${signal}`); });
  });
  if (code !== 0) throw new Error(`${name} ${viewport} exited ${code}`);
  const result = JSON.parse(readFileSync(output, 'utf8'));
  const networkReport = JSON.parse(readFileSync(network, 'utf8'));
  if (result.viewport !== viewport) throw new Error(`Wrong ${name} viewport: ${result.viewport}`);
  if (networkReport.nodeBlocked.length || networkReport.websocketBlocked.length) throw new Error(`${name} ${viewport} attempted a forbidden Node/WebSocket request; see network report`);
  return result;
}

for (const viewport of viewports) {
  const result = { audit: null, axe: null };
  summary.viewports[viewport] = result;
  try {
    const audit = await run(join(root, 'verification/A11Y-001/audit.mjs'), viewport, 'audit');
    const required = viewport === '1280x860' ? [...requiredAuditScreens, 'admin'] : requiredAuditScreens;
    for (const name of required) if (!audit.screens?.[name]) throw new Error(`audit ${viewport} omitted screen: ${name}`);
    const failures = [];
    result.audit = { passed: true, screens: {} };
    for (const [screen, values] of Object.entries(audit.screens)) {
      const counts = {};
      for (const field of summary.hardGateFields) {
        if (!Array.isArray(values[field])) throw new Error(`audit ${viewport}/${screen} is missing array ${field}`);
        counts[field] = values[field].length;
        if (counts[field]) failures.push({ screen, field, count: counts[field] });
      }
      result.audit.screens[screen] = counts;
    }
    result.audit.failures = failures;
    result.audit.passed = failures.length === 0;
    if (failures.length) { summary.passed = false; console.error(`A11Y hard gate failed: ${viewport} ${JSON.stringify(failures)}`); }
  } catch (error) { summary.passed = false; summary.errors.push(String(error?.message || error)); }
  try {
    const axe = await run(join(scriptsDir, 'a11y_axe.mjs'), viewport, 'axe');
    for (const name of axeScreens) if (!axe.screens?.[name]) throw new Error(`axe ${viewport} omitted screen: ${name}`);
    result.axe = { findingsBlockCI: false, ...axe.summary };
  } catch (error) { summary.passed = false; summary.errors.push(String(error?.message || error)); }
}
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const markdown = [
  '# Accessibility CI (offline mock)', '',
  `Source: ${summary.sourceCommit}; Node: ${summary.node}.`, '',
  'Audit blocks on every raw contrast, targetsUnder24, or textUnder12px finding. Axe findings are informational; runtime failures fail the job.', '',
  '| Viewport | Audit screens | Hard gate | Axe rule violations |', '| --- | ---: | --- | ---: |',
  ...Object.entries(summary.viewports).map(([viewport, result]) => `| ${viewport} | ${Object.keys(result.audit?.screens || {}).length} | ${result.audit?.passed ? 'pass' : 'fail'} | ${Object.values(result.axe || {}).filter((x) => x && typeof x === 'object').reduce((n, x) => n + (x.violations || 0), 0)} |`), '',
  ...summary.errors.map((error) => `- Runtime error: ${error}`), '',
  'The harness uses loopback mock AI and fallback fonts. This is not a real-device, screen-reader, or production-font audit.', '',
].join('\n');
writeFileSync(join(out, 'summary.md'), markdown);
console.log(markdown);
process.exitCode = summary.passed ? 0 : 1;

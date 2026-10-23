#!/usr/bin/env node
// Test entry point. Usage (from prototype/):
//   node tests/run.mjs [static|unit|e2e|all] [--report <file.json>] [--filter <substring>]
//
// static : offline syntax / server type-check / JSON / secret scan (tests/harness/offline-static-check.mjs)
// unit   : tests/unit/*.test.mjs, bundled with esbuild so they can import the TypeScript sources
// e2e    : tests/e2e/*.e2e.mjs, Chromium via Playwright against the offline harness + mock OpenAI
//
// Needs esbuild and playwright from the project's node_modules, or from
// CK_TOOL_NODE_MODULES (sandbox fallback). No API key and no network access to
// OpenAI are needed; nothing here costs money.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { toolRequire, moduleDirs, projectRoot } from './harness/tool-require.mjs';

const args = process.argv.slice(2);
const mode = ['static', 'unit', 'e2e', 'all'].includes(args[0]) ? args[0] : 'all';
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
const filter = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : null;
const env = { ...process.env, NODE_PATH: moduleDirs().join(':') };
const results = [];

// Hard stop per group so a leaked server or browser cannot hang CI forever (default 30 min).
const groupTimeoutMs = Number(process.env.CK_TEST_TIMEOUT_SECONDS || 1800) * 1000;

function run(name, cmd, cmdArgs, extraEnv = {}) {
  const started = Date.now();
  const r = spawnSync(cmd, cmdArgs, { cwd: projectRoot, env: { ...env, ...extraEnv }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, timeout: groupTimeoutMs, killSignal: 'SIGTERM' });
  let out = (r.stdout || '') + (r.stderr || '');
  if (r.error?.code === 'ETIMEDOUT') out += `\n# ${name}: killed after ${groupTimeoutMs / 1000}s (CK_TEST_TIMEOUT_SECONDS); some resource kept the process alive\n`;
  process.stdout.write(out);
  const pass = /^# pass (\d+)/m.exec(out)?.[1];
  const fail = /^# fail (\d+)/m.exec(out)?.[1];
  results.push({ name, exitCode: r.status ?? 1, timedOut: r.error?.code === 'ETIMEDOUT' || undefined, seconds: Math.round((Date.now() - started) / 100) / 10, pass: pass && Number(pass), fail: fail && Number(fail), failures: [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]) });
}

// With --filter, only run files that mention the pattern. Passing --test-name-pattern to a file with
// no matching test makes node:test (22.x) run its `after` hook before a slow async `before` hook has
// finished, so resources started by `before` are never closed and the process hangs.
const filterRe = filter ? new RegExp(filter) : null;
const mentionsFilter = (file) => !filterRe || filterRe.test(readFileSync(file, 'utf8'));

const nodeTest = (files) => ['--test', '--test-concurrency=1', '--test-reporter=tap', ...(filter ? ['--test-name-pattern', filter] : []), ...files];

if (mode === 'static' || mode === 'all') {
  run('static', process.execPath, [join('tests', 'harness', 'offline-static-check.mjs'), ...(reportPath ? ['--json', reportPath.replace(/\.json$/, '') + '.static.json'] : [])]);
}

if (mode === 'unit' || mode === 'all') {
  const esbuild = toolRequire('esbuild');
  const dir = join(projectRoot, 'tests', 'unit');
  const out = join(projectRoot, 'tests', 'harness', '.build', 'unit');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.test.mjs') && mentionsFilter(join(dir, f))) : [];
  const built = [];
  for (const f of files) {
    const outfile = join(out, basename(f));
    esbuild.buildSync({ entryPoints: [join(dir, f)], outfile, bundle: true, platform: 'node', format: 'esm', target: 'node22', tsconfig: join(projectRoot, 'tsconfig.json'), absWorkingDir: projectRoot, nodePaths: moduleDirs(), external: ['node:*'], logLevel: 'error', sourcemap: 'inline', alias: { 'cloudflare:workers': join(projectRoot, 'tests', 'harness', 'cloudflare-workers-stub.mjs') } });
    built.push(outfile);
  }
  if (built.length) run('unit', process.execPath, nodeTest(built));
  else results.push({ name: 'unit', exitCode: 0, pass: 0, fail: 0, note: 'no unit tests' });
}

if (mode === 'e2e' || mode === 'all') {
  const dir = join(projectRoot, 'tests', 'e2e');
  const files = readdirSync(dir).filter((f) => f.endsWith('.e2e.mjs')).map((f) => join(dir, f)).filter(mentionsFilter);
  if (files.length) run('e2e', process.execPath, nodeTest(files));
  else results.push({ name: 'e2e', exitCode: 1, pass: 0, fail: 0, note: `no e2e file mentions --filter ${filter}` });
}

const summary = { ranAt: new Date().toISOString(), node: process.version, mode, results };
if (reportPath) writeFileSync(reportPath, JSON.stringify(summary, null, 2) + '\n');
console.log('\nSUMMARY ' + JSON.stringify(results.map(({ name, exitCode, pass, fail, seconds }) => ({ name, exitCode, pass, fail, seconds }))));
process.exitCode = results.some((r) => r.exitCode) ? 1 : 0;

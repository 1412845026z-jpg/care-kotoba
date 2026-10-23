#!/usr/bin/env node
// Offline static checks for environments where `pnpm install` is impossible
// (for example a sandbox without npm registry access).
//
// What it does, using only tools that are already on the machine:
//   1. esbuild-transforms every TS/TSX/JS/MJS source file  -> syntax errors
//   2. type-checks the server / pure-logic modules with TypeScript,
//      using a stub for `cloudflare:workers`                -> type errors
//   3. parses JSON files                                     -> invalid JSON
//   4. scans for strings that look like real credentials     -> leaked secrets
//   5. lists hard-coded model IDs                             -> migration inventory
//
// It is NOT a replacement for the real project checks
// (`pnpm install --frozen-lockfile && tsc --noEmit && pnpm build`), which need
// the lockfile and the full dependency tree. React components are only
// syntax-checked here because @types/react is not available offline.
//
// Usage:
//   CK_TOOL_NODE_MODULES=/opt/npm-tools/node_modules node tests/harness/offline-static-check.mjs [--json out.json]

import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..'); // prototype/
const toolModules = process.env.CK_TOOL_NODE_MODULES || join(root, 'node_modules');
const require = createRequire(join(toolModules, 'noop.js'));
const esbuild = require('esbuild');
const ts = require('typescript');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.vinext', '.wrangler', '.sites-runtime', '.next', 'test-results', 'outputs', 'work']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(root);
const report = { root, toolModules, tools: { esbuild: esbuild.version, typescript: ts.version }, syntax: [], types: [], json: [], secrets: [], models: [] };

// 1. syntax
const loaders = { '.ts': 'ts', '.tsx': 'tsx', '.mts': 'ts', '.mjs': 'js', '.js': 'js' };
for (const f of files) {
  const loader = loaders[extname(f)];
  if (!loader) continue;
  try {
    esbuild.transformSync(readFileSync(f, 'utf8'), { loader, jsx: 'automatic', format: 'esm', sourcefile: relative(root, f) });
    report.syntax.push({ file: relative(root, f), ok: true });
  } catch (e) {
    report.syntax.push({ file: relative(root, f), ok: false, errors: e.errors?.map((x) => `${x.location?.line}:${x.location?.column} ${x.text}`) });
  }
}

// 2. types for server / pure modules (no React types offline)
const typeTargets = files.filter((f) => {
  const r = relative(root, f).replaceAll('\\', '/');
  if (!/\.(ts|mts)$/.test(r) || r.endsWith('.d.ts')) return false;
  if (r.startsWith('tests/')) return false;
  if (['vite.config.ts', 'next.config.ts'].includes(r)) return false; // need vite/next/Sites packages
  // Server routes plus the app's own pure modules. Template files from the Sites
  // starter (lib/connector*, lib/utils.ts) need packages that are not available offline.
  if (r.startsWith('app/api/')) return true;
  return r.startsWith('lib/') && !/^lib\/(connector|utils\.ts)/.test(r);
});
const stubDir = mkdtempSync(join(tmpdir(), 'ck-types-'));
writeFileSync(join(stubDir, 'cloudflare-workers.d.ts'), "declare module 'cloudflare:workers' { export const env: Record<string, unknown>; }\n");
const typeRoots = [join(toolModules, '@types')].filter(existsSync);
const options = {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
  skipLibCheck: true, esModuleInterop: true, ignoreDeprecations: '6.0', resolveJsonModule: true, isolatedModules: true,
  baseUrl: root, paths: { '@/*': ['./*'] }, types: ['node'], typeRoots,
};
const program = ts.createProgram([...typeTargets, join(stubDir, 'cloudflare-workers.d.ts')], options);
const diags = ts.getPreEmitDiagnostics(program).filter((d) => !d.file || !d.file.fileName.includes('/node_modules/'));
report.types = {
  checked: typeTargets.map((f) => relative(root, f)),
  errors: diags.map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    if (!d.file) return msg;
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    return `${relative(root, d.file.fileName)}:${line + 1}:${character + 1} TS${d.code} ${msg}`;
  }),
};

// 3. JSON
for (const f of files.filter((f) => /\.(json|webmanifest)$/.test(f))) {
  try { JSON.parse(readFileSync(f, 'utf8')); report.json.push({ file: relative(root, f), ok: true }); }
  catch (e) { report.json.push({ file: relative(root, f), ok: false, error: String(e.message) }); }
}

// 4. secrets (patterns for common live credentials; placeholders are allowed)
const secretPatterns = [
  ['openai-key', /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/],
  ['anthropic-key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['bearer-literal', /Bearer\s+[A-Za-z0-9._-]{30,}/],
];
for (const f of files) {
  if (statSync(f).size > 2_000_000) continue;
  const text = readFileSync(f, 'utf8');
  for (const [name, re] of secretPatterns) if (re.test(text)) report.secrets.push({ file: relative(root, f), pattern: name });
}

// 5. hard-coded model IDs
const modelRe = /model\s*:\s*['"]([a-z0-9][a-z0-9.-]+)['"]/g;
for (const f of files.filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !relative(root, f).startsWith('tests/'))) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(modelRe)) {
    const line = text.slice(0, m.index).split('\n').length;
    report.models.push({ file: relative(root, f), line, model: m[1] });
  }
}

const syntaxFail = report.syntax.filter((s) => !s.ok);
const jsonFail = report.json.filter((s) => !s.ok);
const summary = {
  syntax: `${report.syntax.length - syntaxFail.length}/${report.syntax.length} files parse`,
  types: `${report.types.checked.length} server/pure modules type-checked, ${report.types.errors.length} errors`,
  json: `${report.json.length - jsonFail.length}/${report.json.length} JSON files valid`,
  secrets: report.secrets.length ? `${report.secrets.length} suspicious matches` : 'no credential-like strings',
  models: report.models.map((m) => `${m.file}:${m.line} ${m.model}`),
};
report.summary = summary;
const jsonOut = process.argv.indexOf('--json');
if (jsonOut > -1) writeFileSync(process.argv[jsonOut + 1], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
for (const s of syntaxFail) console.log('SYNTAX', s.file, s.errors);
for (const e of report.types.errors) console.log('TYPE', e);
for (const s of jsonFail) console.log('JSON', s.file, s.error);
for (const s of report.secrets) console.log('SECRET?', s.file, s.pattern);
process.exitCode = syntaxFail.length || report.types.errors.length || jsonFail.length || report.secrets.length ? 1 : 0;

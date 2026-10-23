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
//   node tests/harness/offline-static-check.mjs [--json out.json]
//   (tools come from prototype/node_modules first, then CK_TOOL_NODE_MODULES)
//
// Works with the project's own TypeScript (5.9.x) and with newer offline copies (6.x).
// When the project's real @types/react is installed, the loose component shim is skipped:
// the project `tsc --noEmit` is the authoritative component check there.

import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { toolRequire, moduleDirs } from './tool-require.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..'); // prototype/
const esbuild = toolRequire('esbuild');
const ts = toolRequire('typescript');
const tsMajor = Number(ts.version.split('.')[0]);
const projectHasReactTypes = existsSync(join(root, 'node_modules', '@types', 'react', 'package.json'));

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
const report = { root: '<prototype>', moduleDirs: moduleDirs().map((d) => (d.startsWith(root) ? '<prototype>/' + relative(root, d) : '<CK_TOOL_NODE_MODULES>')), tools: { esbuild: esbuild.version, typescript: ts.version }, syntax: [], types: [], json: [], secrets: [], models: [] };

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
const typeRoots = moduleDirs().map((d) => join(d, '@types')).filter(existsSync);
const options = {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
  skipLibCheck: true, esModuleInterop: true, ...(tsMajor >= 6 ? { ignoreDeprecations: '6.0' } : {}), resolveJsonModule: true, isolatedModules: true,
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

// 2b. App components against a deliberately loose React/lucide/next shim. This catches
// undefined names, wrong prop shapes between our own components and wrong types in our
// logic; it cannot check DOM/JSX attribute types (the real @types/react is not available
// offline). The project `tsc --noEmit` in CI remains the authoritative check.
const componentTargets = ['app/page.tsx', 'app/layout.tsx', 'components/practice.tsx', 'components/access.tsx', 'components/ui.tsx', 'components/admin.tsx'].map((r) => join(root, r)).filter(existsSync);
if (projectHasReactTypes) {
  report.components = { checked: [], skipped: 'real @types/react is installed in prototype/node_modules; the shim would conflict with it. Run the project `tsc --noEmit` (CI does) for components.', errors: [] };
} else {
const iconNames = new Set();
for (const f of componentTargets) for (const m of readFileSync(f, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g)) for (const n of m[1].split(',')) { const x = n.trim().split(/\s+as\s+/)[0].trim(); if (x) iconNames.add(x); }
writeFileSync(join(stubDir, 'react-shim.d.ts'), `
declare module 'react' {
  export type ReactNode = any; export type FormEvent<T = any> = any; export type KeyboardEvent<T = any> = any; export type ChangeEvent<T = any> = any;
  export function useState<S>(initial: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initial: T): { current: T };
  export function useRef<T>(initial: T | null): { current: T | null };
  export const StrictMode: any; export function createElement(...args: any[]): any;
}
declare namespace React { type ReactNode = any; type FormEvent<T = any> = any; type KeyboardEvent<T = any> = any; }
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare module 'next' { export type Metadata = any; export type Viewport = any; }
declare module '*.css';
declare module 'lucide-react' { type Icon = (props: { size?: number; strokeWidth?: number; className?: string; fill?: string }) => any; ${[...iconNames].map((n) => `export const ${n}: Icon;`).join(' ')} }
declare namespace JSX { interface Element {} interface IntrinsicElements { [name: string]: { [attr: string]: any } } interface IntrinsicAttributes { key?: any } interface ElementChildrenAttribute { children: {} } }
`);
const compProgram = ts.createProgram([...componentTargets, join(stubDir, 'cloudflare-workers.d.ts'), join(stubDir, 'react-shim.d.ts')], { ...options, jsx: ts.JsxEmit.ReactJSX, types: [], typeRoots: [] });
// TS7006 (implicit any on JSX event-handler parameters) is an artefact of the shim's untyped intrinsic elements.
const compDiags = ts.getPreEmitDiagnostics(compProgram).filter((d) => d.code !== 7006 && (!d.file || (!d.file.fileName.includes('/node_modules/') && !d.file.fileName.endsWith('react-shim.d.ts'))));
report.components = {
  checked: componentTargets.map((f) => relative(root, f)),
  note: 'loose React/lucide/next shim; JSX attribute types unchecked',
  errors: compDiags.map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    if (!d.file) return msg;
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    return `${relative(root, d.file.fileName)}:${line + 1}:${character + 1} TS${d.code} ${msg}`;
  }),
};
}

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
  components: report.components.skipped ? `skipped (${report.components.skipped})` : `${report.components.checked.length} components checked against a loose React shim, ${report.components.errors.length} errors`,
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
for (const e of report.components.errors) console.log('COMPONENT', e);
for (const s of jsonFail) console.log('JSON', s.file, s.error);
for (const s of report.secrets) console.log('SECRET?', s.file, s.pattern);
process.exitCode = syntaxFail.length || report.types.errors.length || report.components.errors.length || jsonFail.length || report.secrets.length ? 1 : 0;

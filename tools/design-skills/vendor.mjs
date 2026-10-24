#!/usr/bin/env node
// Vendors two third-party design skills into this repository, unmodified, for Claude Code (.claude/skills)
// and Codex (.agents/skills), and records every file's SHA-256 in tools/design-skills/manifest.json.
//
//   impeccable (Apache-2.0, Paul Bakaus)  https://github.com/pbakaus/impeccable
//     upstream .claude/skills/impeccable -> .claude/skills/impeccable
//     upstream .agents/skills/impeccable -> .agents/skills/impeccable
//   taste-skill (MIT, Leonxlnx)            https://github.com/Leonxlnx/taste-skill
//     upstream skills/taste-skill        -> .claude/skills/design-taste-frontend and .agents/skills/design-taste-frontend
//                                            (folder named after the skill's `name`, as the Agent Skills format expects)
//
// Not vendored on purpose: upstream hook manifests (.claude/settings.json, .codex/hooks.json) and engine binaries.
// The hooks would run impeccable's downloaded engine after every edit; enabling them is a user decision
// (tools/design-skills/README.md).
//
// Usage (from the repository root, no dependencies):
//   node tools/design-skills/vendor.mjs --impeccable <checkout> --taste <checkout>   copy + rewrite manifest
//   node tools/design-skills/vendor.mjs --check                                     verify the vendored files
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync, copyFileSync, existsSync, chmodSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifestPath = join(repo, 'tools', 'design-skills', 'manifest.json');
const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);

const TARGETS = [
  { source: 'impeccable', from: '.claude/skills/impeccable', to: '.claude/skills/impeccable' },
  { source: 'impeccable', from: '.agents/skills/impeccable', to: '.agents/skills/impeccable' },
  { source: 'taste', from: 'skills/taste-skill', to: '.claude/skills/design-taste-frontend' },
  { source: 'taste', from: 'skills/taste-skill', to: '.agents/skills/design-taste-frontend' },
];
const SKIP = /(^|\/)(\.DS_Store|bin|node_modules|\.taste-skill|\.impeccable)(\/|$)/;
const LICENSES = {
  impeccable: [['LICENSE', 'docs/licenses/IMPECCABLE_LICENSE-2.0.txt'], ['NOTICE.md', 'docs/licenses/IMPECCABLE_NOTICE.md']],
  taste: [['LICENSE', 'docs/licenses/TASTE_SKILL_LICENSE.txt']],
};

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name), rel = relative(base, p).split(sep).join('/');
    if (SKIP.test(rel)) continue;
    if (statSync(p).isDirectory()) walk(p, base, out); else out.push(rel);
  }
  return out;
}

if (args.includes('--check')) {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const problems = [];
  for (const t of m.targets) {
    const dir = join(repo, t.to);
    if (!existsSync(dir)) { problems.push(`${t.to}: missing`); continue; }
    const have = walk(dir);
    const want = Object.keys(t.files);
    for (const f of want) if (!have.includes(f)) problems.push(`${t.to}/${f}: missing`); else if (sha(join(dir, f)) !== t.files[f]) problems.push(`${t.to}/${f}: changed (vendored files are not edited here; re-vendor instead)`);
    for (const f of have) if (!want.includes(f)) problems.push(`${t.to}/${f}: not in the manifest`);
  }
  for (const [src, list] of Object.entries(LICENSES)) for (const [, to] of list) if (!existsSync(join(repo, to))) problems.push(`${to}: license file missing (${src})`);
  if (problems.length) { console.error(`design skills: ${problems.length} problem(s)\n  ${problems.slice(0, 40).join('\n  ')}`); process.exit(1); }
  console.log(`design skills intact: ${m.targets.map((t) => `${t.to} (${Object.keys(t.files).length} files)`).join(', ')}`);
  process.exit(0);
}

const roots = { impeccable: opt('--impeccable'), taste: opt('--taste') };
for (const [k, v] of Object.entries(roots)) if (!v || !existsSync(join(v, '.git'))) { console.error(`pass --${k} <git checkout>`); process.exit(2); }
const git = (dir, ...a) => spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).stdout.trim();
const sources = {
  impeccable: { repo: 'https://github.com/pbakaus/impeccable', commit: git(roots.impeccable, 'rev-parse', 'HEAD'), committed: git(roots.impeccable, 'log', '-1', '--format=%cI'), license: 'Apache-2.0', version: JSON.parse(readFileSync(join(roots.impeccable, '.claude-plugin', 'plugin.json'), 'utf8')).version },
  taste: { repo: 'https://github.com/Leonxlnx/taste-skill', commit: git(roots.taste, 'rev-parse', 'HEAD'), committed: git(roots.taste, 'log', '-1', '--format=%cI'), license: 'MIT', version: JSON.parse(readFileSync(join(roots.taste, '.claude-plugin', 'marketplace.json'), 'utf8')).plugins[0].version },
};
const targets = [];
for (const t of TARGETS) {
  const src = join(roots[t.source], t.from), dst = join(repo, t.to);
  rmSync(dst, { recursive: true, force: true });
  const files = {};
  for (const f of walk(src)) {
    mkdirSync(dirname(join(dst, f)), { recursive: true });
    copyFileSync(join(src, f), join(dst, f));
    if (statSync(join(src, f)).mode & 0o111) chmodSync(join(dst, f), 0o755);
    files[f] = sha(join(dst, f));
  }
  targets.push({ ...t, files });
}
for (const [src, list] of Object.entries(LICENSES)) for (const [from, to] of list) copyFileSync(join(roots[src], from), join(repo, to));
writeFileSync(manifestPath, JSON.stringify({ note: 'Generated by tools/design-skills/vendor.mjs. Vendored third-party skills, unmodified; verify with --check.', sources, targets }, null, 1) + '\n');
console.log(`vendored ${targets.map((t) => `${t.to} (${Object.keys(t.files).length})`).join(', ')} from impeccable@${sources.impeccable.commit.slice(0, 7)} and taste-skill@${sources.taste.commit.slice(0, 7)}`);

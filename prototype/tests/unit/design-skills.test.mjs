// DESIGN-SKILLS-001: the vendored design skills stay unmodified, and the shared design context exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repo = join(process.cwd(), '..');

test('vendored impeccable and taste-skill files match tools/design-skills/manifest.json (re-vendor instead of editing)', () => {
  const r = spawnSync(process.execPath, [join(repo, 'tools', 'design-skills', 'vendor.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  const m = JSON.parse(readFileSync(join(repo, 'tools', 'design-skills', 'manifest.json'), 'utf8'));
  assert.equal(m.sources.impeccable.license, 'Apache-2.0');
  assert.equal(m.sources.taste.license, 'MIT');
  for (const s of Object.values(m.sources)) assert.match(s.commit, /^[0-9a-f]{40}$/);
});

test('no upstream hook manifests were vendored (enabling hooks is a user decision)', () => {
  for (const f of ['.claude/settings.json', '.codex/hooks.json']) assert.ok(!existsSync(join(repo, f)), `${f} must not be committed without the user's approval`);
});

test('PRODUCT.md and DESIGN.md are the shared design context the skills read', () => {
  const product = readFileSync(join(repo, 'PRODUCT.md'), 'utf8');
  assert.match(product, /<!-- impeccable:product-schema 1 -->/);
  assert.match(product, /^## Platform\n\nweb$/m);
  const design = readFileSync(join(repo, 'DESIGN.md'), 'utf8');
  assert.match(design, /^---\nname: Care Kotoba\n/);
  for (const h of ['## Overview', '## Colors', '## Typography', '## Layout', '## Components', "## Do's and Don'ts"]) assert.ok(design.includes(h), h);
});

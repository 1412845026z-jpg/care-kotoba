// LEGAL-UI-001: the in-app open-source notices come from tools/notices/manifest.json + docs/licenses/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NOTICES } from '@/lib/notices-data';

const repo = join(process.cwd(), '..');

test('notices data is up to date with the manifest and the license texts', () => {
  assert.match(execFileSync(process.execPath, [join(repo, 'tools', 'notices', 'generate.mjs'), '--check'], { encoding: 'utf8' }), /up to date/);
});

test('every runtime dependency the app imports in the browser is listed with its version', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const listed = (name) => NOTICES.find((n) => n.name.toLowerCase().includes(name));
  for (const [name, match] of [['react', 'react'], ['lucide-react', 'lucide'], ['ts-fsrs', 'ts-fsrs'], ['vinext', 'vinext'], ['next', 'next.js']]) {
    const n = listed(match);
    assert.ok(n, `${name} is listed`);
    assert.equal(n.version, String(deps[name]).replace(/^[\^~]/, ''), `${name} version matches package.json`);
    assert.ok(n.text.length > 200, `${name} has its license text`);
  }
});

// Retain the actual isolated npm toolchain's versions, hashes and license texts.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

if (process.argv.length !== 4) throw new Error('Usage: node record_lighthouse_toolchain.mjs <tool directory> <output directory>');
const dir = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
mkdirSync(out, { recursive: true });
const lock = JSON.parse(readFileSync(join(dir, 'package-lock.json'), 'utf8'));
const records = [];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path) continue;
  if (!path.startsWith('node_modules/') || path.split('/').includes('..')) throw new Error(`Unsafe npm lock path ${path}`);
  if (/\b(?:A?GPL)(?:-|\b)/i.test(entry.license || '')) throw new Error(`Unexpected copyleft tool license: ${path}: ${entry.license}`);
  const pkgDir = join(dir, path);
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  if (pkg.version !== entry.version) throw new Error(`Version mismatch: ${path}`);
  const notices = [];
  for (const file of readdirSync(pkgDir, { withFileTypes: true })) {
    if (!file.isFile() || !/^(?:licen[cs]e|copying|notice|authors)(?:[.\-_]|$)/i.test(file.name)) continue;
    const relative = join('tool-licenses', path.slice('node_modules/'.length), file.name);
    const source = join(pkgDir, file.name);
    const target = join(out, relative);
    mkdirSync(resolve(target, '..'), { recursive: true });
    copyFileSync(source, target);
    notices.push({ path: relative, sha256: createHash('sha256').update(readFileSync(source)).digest('hex') });
  }
  records.push({ name: pkg.name, version: pkg.version, license: entry.license || pkg.license, resolved: entry.resolved, integrity: entry.integrity, notices });
}
const record = { recordedAt: new Date().toISOString(), node: process.version, npmLockVersion: lock.lockfileVersion, toolOnly: true, appDependenciesChanged: false, packageLockSha256: createHash('sha256').update(readFileSync(join(dir, 'package-lock.json'))).digest('hex'), packages: records };
writeFileSync(join(out, 'toolchain.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Recorded ${records.length} locked packages and ${records.reduce((n, row) => n + row.notices.length, 0)} license/notice files`);

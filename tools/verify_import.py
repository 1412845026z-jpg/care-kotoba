#!/usr/bin/env python3
"""Verify the repository against the 2026-10-23 handoff archive import.

tools/verify_archive.py (kept unchanged from the archive) expects every archive
file to be byte-identical. After the import, CLAUDE.md was intentionally changed
to import AGENTS.md, so that script reports a checksum mismatch for CLAUDE.md
by design. This script checks the import honestly instead:

  * the archived ZIP in archives/ still has the recorded SHA-256;
  * every ARCHIVE_MANIFEST.json file is identical to the archive, or is listed in
    verification/IMPORT_2026-10-23.json as intentionally modified, in which case
    the original bytes are re-read from the ZIP and compared with the manifest;
  * the 130 original prototype files match verification/SOURCE_FILES_SHA256.json
    by SHA-256 and by git blob id (when run inside a git checkout);
  * no credential-like strings in the imported files.

Usage:
  python3 -I tools/verify_import.py                      # strict: original sources must be unchanged
  python3 -I tools/verify_import.py --allow-source-changes
      # for later development commits: lists changed original sources instead of failing
"""
from pathlib import Path
import hashlib, json, re, subprocess, sys, zipfile

root = Path(__file__).resolve().parents[1]
allow_source_changes = '--allow-source-changes' in sys.argv
errors, notes = [], []


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


record = json.loads((root / 'verification/IMPORT_2026-10-23.json').read_text(encoding='utf-8'))
archive = record['archive']
zip_path = root / archive['path']
zf = None
if not zip_path.is_file():
    errors.append('Archive ZIP missing: ' + archive['path'])
else:
    if sha256(zip_path.read_bytes()) != archive['sha256']:
        errors.append('Archive ZIP checksum mismatch: ' + archive['path'])
    zf = zipfile.ZipFile(zip_path)

manifest = json.loads((root / 'ARCHIVE_MANIFEST.json').read_text(encoding='utf-8'))
modified = record.get('modified_after_import', {})
patterns = [rb'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}', rb'(?:ghp_|github_pat_)[A-Za-z0-9_]{25,}',
            rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', rb'eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}']
identical = 0
modified_ok = []
source_paths = set()
source = json.loads((root / 'verification/SOURCE_FILES_SHA256.json').read_text(encoding='utf-8'))
source_paths = {item['path'] for item in source}
changed_sources = []

for item in manifest['files']:
    path = item['path']
    p = root / path
    if not p.is_file():
        errors.append('Missing file: ' + path)
        continue
    data = p.read_bytes()
    if any(re.search(pt, data) for pt in patterns):
        errors.append('Possible secret: ' + path)
    if sha256(data) == item['sha256']:
        identical += 1
        continue
    if path in modified:
        original_sha = modified[path]['original_sha256']
        if original_sha != item['sha256']:
            errors.append('Import record disagrees with archive manifest for ' + path)
        elif zf is not None:
            original = zf.read(archive['root'] + '/' + path)
            if sha256(original) != item['sha256']:
                errors.append('Original bytes in ZIP do not match manifest for ' + path)
            else:
                modified_ok.append(path)
        continue
    if path in source_paths and allow_source_changes:
        changed_sources.append(path)
        continue
    errors.append('Changed without import record: ' + path)

if len(source) != 130:
    errors.append('Unexpected original source count: %d' % len(source))
blobs = {}
try:
    out = subprocess.run(['git', '-C', str(root), 'ls-files', '-s', '--', 'prototype'], capture_output=True, text=True, check=True).stdout
    for line in out.splitlines():
        meta, path = line.split('\t', 1)
        blobs[path] = meta.split()[1]
except Exception as e:  # not a git checkout, or git missing
    notes.append('git blob check skipped: %s' % e)
source_ok = 0
for item in source:
    p = root / item['path']
    if not p.is_file():
        errors.append('Original source missing: ' + item['path'])
        continue
    same = sha256(p.read_bytes()) == item['sha256']
    if blobs and blobs.get(item['path']) != item['git_blob'] and same:
        errors.append('Git blob mismatch (worktree identical): ' + item['path'])
    if same:
        source_ok += 1
    elif allow_source_changes:
        if item['path'] not in changed_sources:
            changed_sources.append(item['path'])
    elif 'Changed without import record: ' + item['path'] not in errors:
        errors.append('Original source changed: ' + item['path'])

result = {
    'status': 'failed' if errors else 'passed',
    'mode': 'allow-source-changes' if allow_source_changes else 'strict',
    'archive_zip': archive['path'],
    'manifest_files': len(manifest['files']),
    'identical_to_archive': identical,
    'modified_after_import_verified': modified_ok,
    'original_source_files': len(source),
    'original_source_unchanged': source_ok,
    'original_source_changed_since_import': sorted(changed_sources),
    'git_blob_checked': bool(blobs),
    'notes': notes,
    'errors': errors,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)

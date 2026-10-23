#!/usr/bin/env python3
"""Best-effort tracked-file/ZIP credential scan; never prints matched values.

This is a small offline guard, not a proof that a repository has no secrets.
Only the current Git index is scanned, not history or untracked local files.
"""
from pathlib import Path, PurePosixPath
import io
import re
import subprocess
import sys
import zipfile

RULES = {
    'openai-key': rb'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}',
    'github-token': rb'(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{25,}',
    'private-key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----',
    'jwt': rb'eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}',
}
MAX_ENTRY_BYTES = 32 * 1024 * 1024
MAX_ARCHIVE_BYTES = 128 * 1024 * 1024


def scan_bytes(name, data):
    issues = []
    for label, pattern in RULES.items():
        for match in re.finditer(pattern, data):
            line = data[:match.start()].count(b'\n') + 1
            issues.append(f'{name}:{line}: {label} (value redacted)')
    return issues


def scan_file(name, data):
    issues = scan_bytes(name, data)
    if name.lower().endswith('.zip'):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if sum(x.file_size for x in archive.infolist()) > MAX_ARCHIVE_BYTES:
                    return issues + [f'{name}: archive scan size limit exceeded']
                for entry in archive.infolist():
                    if entry.is_dir():
                        continue
                    if entry.file_size > MAX_ENTRY_BYTES:
                        issues.append(f'{name}!{entry.filename}: entry scan size limit exceeded')
                    elif entry.filename.lower().endswith('.zip'):
                        issues.append(f'{name}!{entry.filename}: nested ZIP requires explicit review')
                    else:
                        issues.extend(scan_bytes(f'{name}!{entry.filename}', archive.read(entry)))
        except (zipfile.BadZipFile, RuntimeError, OSError) as error:
            issues.append(f'{name}: cannot inspect ZIP ({type(error).__name__})')
    return issues


def credential_path(name):
    return any((part == '.env' or part.startswith('.env.') or part.startswith('.dev.vars'))
               and part not in ('.env.example', '.env.sample', '.dev.vars.example')
               for part in PurePosixPath(name).parts)


def main():
    root = Path(__file__).resolve().parents[2]
    tracked = subprocess.check_output(['git', '-C', str(root), 'ls-files', '-z']).split(b'\0')
    issues, count = [], 0
    for raw in tracked:
        if not raw:
            continue
        name = raw.decode('utf-8')
        if credential_path(name):
            issues.append(f'{name}: local credential file is tracked')
        issues.extend(scan_file(name, (root / name).read_bytes()))
        count += 1
    if issues:
        print('\n'.join(issues), file=sys.stderr)
        print(f'Secret scan FAILED: {len(issues)} issue(s); matched values were not printed.', file=sys.stderr)
        return 1
    print(f'Secret scan passed: {count} tracked files plus ZIP entries; no live API or key required.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

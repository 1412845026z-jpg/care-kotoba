#!/usr/bin/env python3
"""No-key, loopback-only real dev replay; no deploy or paid provider request."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import time
import urllib.request

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--source', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--port', type=int, default=5187)
a = p.parse_args()
source = a.source.resolve()
root = source / 'prototype'
out = a.out.resolve()
out.mkdir(parents=True, exist_ok=True)
assert not any(root.glob('.env*')), 'Use a clean checkout without local environment files'
assert not (root / '.dev.vars').exists(), 'Existing local variables refused'
with socket.socket() as s:
    assert s.connect_ex(('127.0.0.1', a.port)) != 0, 'Port in use'
worker = root / 'worker/index.ts'
original = worker.read_bytes()
text = original.decode()
assert text.count('const worker = {') == 1
assert text.count('    let binding = ctx.props?.CONNECTORS;') == 1
instrumented = '''
// Temporary free-guide probe; restored byte-for-byte after the replay.
const ckFreeNetwork = { blockedExternal: 0 };
const ckFreeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) {
    ckFreeNetwork.blockedExternal++;
    throw new Error('Free device replay blocks non-loopback Worker fetch: ' + u.hostname);
  }
  return ckFreeFetch(input, init);
}) as typeof fetch;
'''
text = text.replace('const worker = {', instrumented + '\nconst worker = {')
text = text.replace('    let binding = ctx.props?.CONNECTORS;',
                    "    if (new URL(request.url).pathname === '/__ck_free_network') return Response.json(ckFreeNetwork);\n    let binding = ctx.props?.CONNECTORS;")
env = {k: v for k, v in os.environ.items() if not k.startswith(('OPENAI_', 'CK_')) and k not in ('NODE_OPTIONS', 'BASE_URL')}
env.update(WRANGLER_SEND_METRICS='false', CLOUDFLARE_CF_FETCH_ENABLED='false', NEXT_TELEMETRY_DISABLED='1')
result = {'sourceSha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip(),
          'apiKeyPresent': False, 'newEnvironmentFileWritten': False, 'temporaryWorkerGuard': True,
          'originalWorkerSha256': hashlib.sha256(original).hexdigest(), 'port': a.port}
dev = None
started = time.monotonic()
try:
    worker.write_text(text)
    with (out / 'dev-server.log').open('w') as log:
        dev = subprocess.Popen(['pnpm', 'dev', '--host', '127.0.0.1', '--port', str(a.port)], cwd=root, env=env,
                               stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        base = f'http://127.0.0.1:{a.port}'
        for _ in range(180):
            assert dev.poll() is None, 'Dev server exited before ready'
            try:
                with urllib.request.urlopen(base + '/__ck_free_network', timeout=2) as r:
                    assert json.load(r) == {'blockedExternal': 0}
                break
            except OSError:
                time.sleep(.25)
        else:
            raise RuntimeError('Dev readiness timeout')
        with (out / 'replay.log').open('w') as log2:
            run = subprocess.run(['node', str(Path(__file__).with_name('replay.mjs')),
                                  '--source', str(source), '--base', base, '--report-dir', str(out)],
                                 env=env, cwd=root, stdout=log2, stderr=subprocess.STDOUT, timeout=180)
        result['replayExitCode'] = run.returncode
        with urllib.request.urlopen(base + '/__ck_free_network', timeout=5) as r:
            result['networkGuard'] = json.load(r)
        assert run.returncode == 0, 'See replay.log'
        assert result['networkGuard'] == {'blockedExternal': 0}
        result['passed'] = True
except Exception as e:
    result.update(passed=False, error=str(e))
finally:
    if dev:
        try:
            os.killpg(dev.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            dev.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(dev.pid, signal.SIGKILL)
            dev.wait()
    worker.write_bytes(original)
    result['workerRestored'] = worker.read_bytes() == original
    result['seconds'] = round(time.monotonic() - started, 3)
    (out / 'launch.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
raise SystemExit(0 if result.get('passed') else 1)

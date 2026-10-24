#!/usr/bin/env python3
"""Run a pinned Claude checkout with mock AI; never deploy or load credentials."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time
import urllib.error
import urllib.request


def stop(process):
    if process is not None:
        # The process group also owns node test and pnpm child processes.
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Pinned repository checkout')
    parser.add_argument('--report-dir', type=Path, required=True)
    parser.add_argument('--mode', choices=['offline', 'real-dev'], required=True)
    parser.add_argument('--filter', help='Optional test-name filter; reported verbatim')
    parser.add_argument('--port', type=int, default=5173)
    parser.add_argument('--mock-port', type=int, default=4010)
    parser.add_argument('--timeout', type=int, default=600)
    args = parser.parse_args()
    root = args.source.resolve() / 'prototype'
    out = args.report_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    guard_path = Path(__file__).with_name('local_fetch_only.mjs').resolve()
    env = {k: v for k, v in os.environ.items()
           if not k.startswith(('OPENAI_', 'CK_')) and k != 'NODE_OPTIONS'}
    env.update(CI='true', WRANGLER_SEND_METRICS='false',
               CLOUDFLARE_CF_FETCH_ENABLED='false', NEXT_TELEMETRY_DISABLED='1')
    test_env = {**env, 'NODE_OPTIONS': f'--import={guard_path}',
                'CK_TEST_TIMEOUT_SECONDS': str(args.timeout)}
    worker = root / 'worker/index.ts'
    variables = root / '.dev.vars'
    original = None
    wrote_variables = False
    dev = test = None
    started = time.perf_counter()
    result = {'mode': args.mode, 'mock_only': True, 'filter': args.filter,
              'port': args.port, 'mock_port': args.mock_port,
              'source': str(args.source.resolve()),
              'source_sha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
              'source_tree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=root, text=True).strip()}
    server_log = None
    try:
        if args.mode == 'real-dev':
            if variables.exists() or (root / '.env.local').exists():
                raise RuntimeError('Refusing an existing local environment file')
            with __import__('socket').socket() as sock:
                if sock.connect_ex(('127.0.0.1', args.port)) == 0:
                    raise RuntimeError('Requested dev port is already in use')
            original = worker.read_bytes()
            guard = '''
// Temporary CI guard. Restored byte-for-byte in finally.
const ckCiState = { blocked: 0 };
const ckCiFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) {
    ckCiState.blocked++;
    throw new Error('CI review blocks non-loopback Worker fetch: ' + u.hostname);
  }
  return ckCiFetch(input, init);
}) as typeof fetch;
'''
            source = original.decode('utf-8')
            if source.count('const worker = {') != 1 or source.count('    let binding = ctx.props?.CONNECTORS;') != 1:
                raise RuntimeError('Worker shape changed; review guard needs explicit review')
            source = source.replace('const worker = {', guard + '\nconst worker = {')
            probe = ("    if (new URL(request.url).pathname === '/__ck_ci_network') "
                     "return Response.json({ blockedExternal: ckCiState.blocked, "
                     f"mockBaseConfigured: (env as any).OPENAI_BASE_URL === 'http://127.0.0.1:{args.mock_port}/v1', "
                     "policy: (env as any).CK_ACCESS_POLICY });\n")
            source = source.replace('    let binding = ctx.props?.CONNECTORS;', probe + '    let binding = ctx.props?.CONNECTORS;')
            worker.write_text(source)
            variables.write_text(
                'OPENAI_API_KEY=ci-dummy-not-real\n'
                f'OPENAI_BASE_URL=http://127.0.0.1:{args.mock_port}/v1\n'
                'CK_ACCESS_POLICY=code\nCK_ACCESS_CODE=ci-local-code-not-secret\n'
                'CK_SESSION_SECRET=ci-local-signing-value-not-secret\n'
                'CK_RATE_LIMIT_MULTIPLIER=100\n'
                'CK_ASR_LOGPROBS=1\nCK_AI_FURIGANA=1\n')
            wrote_variables = True
            server_log = (out / 'dev-server.log').open('w')
            dev = subprocess.Popen(['pnpm', 'dev', '--host', '127.0.0.1', '--port', str(args.port)],
                                   cwd=root, env=env, stdout=server_log,
                                   stderr=subprocess.STDOUT, start_new_session=True)
            probe_url = f'http://127.0.0.1:{args.port}/__ck_ci_network'
            for _ in range(300):
                if dev.poll() is not None:
                    raise RuntimeError('Dev server exited before readiness')
                try:
                    with urllib.request.urlopen(probe_url, timeout=2) as response:
                        probe_result = json.load(response)
                    if probe_result != {'blockedExternal': 0, 'mockBaseConfigured': True, 'policy': 'code'}:
                        raise RuntimeError('Unexpected mock or access configuration')
                    break
                except urllib.error.URLError:
                    time.sleep(.2)
            else:
                raise RuntimeError('Dev server did not become ready')
            result['startup_seconds'] = round(time.perf_counter() - started, 3)
            test_env.update(BASE_URL=f'http://127.0.0.1:{args.port}',
                            CK_MOCK_PORT=str(args.mock_port), CK_E2E_ACCESS_CODE='ci-local-code-not-secret')
        command = ['node', 'tests/run.mjs', 'e2e', '--report', str(out / 'tests.json')]
        if args.filter:
            command.extend(['--filter', args.filter])
        result['command'] = command
        with (out / 'tests.tap.txt').open('w') as log:
            test = subprocess.Popen(command, cwd=root, env=test_env, stdout=log,
                                    stderr=subprocess.STDOUT, start_new_session=True)
            try:
                result['exit_code'] = test.wait(timeout=args.timeout)
            except subprocess.TimeoutExpired:
                result['exit_code'] = 124
                result['error'] = 'Browser tests exceeded explicit timeout; child processes stopped'
        if args.mode == 'real-dev':
            with urllib.request.urlopen(probe_url, timeout=3) as response:
                result['network_guard'] = json.load(response)
            if result['network_guard'] != {'blockedExternal': 0, 'mockBaseConfigured': True, 'policy': 'code'}:
                result['exit_code'] = 2
                result['error'] = 'Unexpected external fetch attempt or changed mock configuration'
    except Exception as error:
        result.update(exit_code=2, error=str(error))
    finally:
        stop(test)
        stop(dev)
        if server_log:
            server_log.close()
        if original is not None:
            worker.write_bytes(original)
            result['worker_restored'] = worker.read_bytes() == original
        if wrote_variables:
            variables.unlink(missing_ok=True)
            result['fake_env_removed'] = not variables.exists()
        result['seconds'] = round(time.perf_counter() - started, 3)
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        for name in ['tests.tap.txt', 'dev-server.log']:
            path = out / name
            if path.exists():
                print(f'\n--- {name} ---\n' + path.read_text(errors='replace'), flush=True)
        print('CI REVIEW RESULT ' + json.dumps(result), flush=True)
    return result.get('exit_code', 2)


if __name__ == '__main__':
    raise SystemExit(main())

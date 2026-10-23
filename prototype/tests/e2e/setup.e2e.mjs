// Regression (ENV-002): if Chromium fails to launch after the mock / harness servers started,
// setup() must close them and rethrow the original error. Before the fix the servers stayed
// open, `after` had no env to close, and the test process never exited.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setup, EXTERNAL } from './helpers.mjs';

const refused = async (url) => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    return false;
  } catch {
    return true;
  }
};

test('setup closes already started servers when Chromium fails to launch, and keeps the original error', async () => {
  const original = new Error('simulated: Executable does not exist at /nonexistent/chrome');
  let started;
  await assert.rejects(
    setup({ launch: async (_options, info) => { started = info; throw original; } }),
    (e) => e === original,
  );
  assert.ok(started?.mockOrigin, 'launch was reached after the mock started');
  assert.ok(await refused(started.mockOrigin + '/v1/models'), 'mock OpenAI is closed');
  if (!EXTERNAL) assert.ok(await refused(started.baseUrl + '/api/health'), 'harness server is closed');
});

test('a process whose setup fails exits on its own instead of hanging', () => {
  const helpers = new URL('./helpers.mjs', import.meta.url).href;
  const script = `
    import { setup } from ${JSON.stringify(helpers)};
    try { await setup({ launch: async () => { throw new Error('launch failed on purpose'); } }); }
    catch (e) { console.log('ORIGINAL ' + e.message); }
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, CK_E2E_NO_REBUILD: '1' },
    encoding: 'utf8',
    timeout: 60_000,
  });
  assert.notEqual(r.error?.code, 'ETIMEDOUT', 'child process did not exit within 60 s (resources left open)');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ORIGINAL launch failed on purpose/);
});

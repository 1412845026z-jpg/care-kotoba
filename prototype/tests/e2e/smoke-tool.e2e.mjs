// tools/smoke/api-smoke.mjs against the harness + mock OpenAI: free mode makes no AI request,
// --yes mode exercises chat / feedback / speech and logs in with an access code without printing it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setup, EXTERNAL } from './helpers.mjs';

const tool = fileURLToPath(new URL('../../../tools/smoke/api-smoke.mjs', import.meta.url));
const CODE = 'smoke-code-2026';
let env;
before(async () => { env = await setup({ env: { CK_ACCESS_POLICY: undefined, CK_ACCESS_CODE: CODE } }); });
after(async () => { await env?.close(); });

// Async spawn: the harness server runs in this process, so a blocking spawnSync would deadlock it.
const run = (extra, code) => new Promise((resolve) => {
  const child = spawn(process.execPath, [tool, '--base', env.baseUrl, ...extra], { env: { ...process.env, ...(code ? { CK_SMOKE_ACCESS_CODE: code } : {}) } });
  let stdout = '', stderr = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  const timer = setTimeout(() => child.kill('SIGKILL'), 60000);
  child.on('close', (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
});

test('smoke tool: without --yes only free routes are called', { skip: EXTERNAL && 'harness only' }, async () => {
  env.mock.state.requests.length = 0;
  const r = await run([], CODE);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.steps.map((s) => s.name), ['health', 'access', 'access-login']);
  assert.equal(env.mock.state.requests.length, 0, 'no AI request without --yes');
  assert.ok(!r.stdout.includes(CODE), 'access code printed');
});

test('smoke tool: --yes exercises chat, feedback and speech through the app', { skip: EXTERNAL && 'harness only' }, async () => {
  env.mock.state.requests.length = 0;
  const r = await run(['--yes'], CODE);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const report = JSON.parse(r.stdout);
  const byName = Object.fromEntries(report.steps.map((s) => [s.name, s]));
  for (const n of ['chat', 'feedback', 'speech']) assert.equal(byName[n].status, 200, n);
  assert.equal(byName.chat.reply, true);
  assert.equal(byName.feedback.allQuotesFromLearner, true);
  assert.ok(byName.speech.audioBytes > 0);
  assert.ok(env.mock.state.requests.some((x) => x.path === '/v1/audio/speech'));
  assert.ok(!r.stdout.includes(CODE));
});

test('smoke tool: a wrong access code fails clearly', { skip: EXTERNAL && 'harness only' }, async () => {
  const r = await run(['--yes'], 'wrong-code-xx');
  assert.equal(r.status, 1);
  const report = JSON.parse(r.stdout);
  assert.equal(report.steps.find((s) => s.name === 'access-login').status, 401);
  assert.equal(report.ok, false);
});

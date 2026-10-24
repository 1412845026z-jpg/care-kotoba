// tools/smoke/api-smoke.mjs and tools/smoke/core-roleplay-check.mjs against the harness + mock OpenAI:
// free mode makes no AI request, --yes mode goes through the app's routes and logs in with an access code
// without printing it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setup, EXTERNAL } from './helpers.mjs';

const tool = fileURLToPath(new URL('../../../tools/smoke/api-smoke.mjs', import.meta.url));
const roleplayTool = fileURLToPath(new URL('../../../tools/smoke/core-roleplay-check.mjs', import.meta.url));
const CODE = 'smoke-code-2026';
let env;
before(async () => { env = await setup({ env: { CK_ACCESS_POLICY: undefined, CK_ACCESS_CODE: CODE } }); });
after(async () => { await env?.close(); });

// Async spawn: the harness server runs in this process, so a blocking spawnSync would deadlock it.
const run = (extra, code, script = tool) => new Promise((resolve) => {
  const child = spawn(process.execPath, [script, '--base', env.baseUrl, ...extra], { env: { ...process.env, ...(code ? { CK_SMOKE_ACCESS_CODE: code } : {}) } });
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

test('core roleplay check: plan only without --yes (no AI request, no access code printed)', { skip: EXTERNAL && 'harness only' }, async () => {
  env.mock.state.requests.length = 0;
  const r = await run([], CODE, roleplayTool);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.paidCalls, 0);
  assert.equal(report.plan.length, 28, '12 drafts: 4 x 3 clarification + 4 x 2 refusal + 4 x 2 report probes');
  assert.equal(env.mock.state.requests.length, 0);
  assert.ok(!r.stdout.includes(CODE));
});

test('core roleplay check: --yes runs every probe through /api/chat with the draft instructions', { skip: EXTERNAL && 'harness only' }, async () => {
  env.mock.state.requests.length = 0;
  env.mock.state.scenario.reply = null;
  const r = await run(['--yes'], CODE, roleplayTool);
  const report = JSON.parse(r.stdout);
  const chats = env.mock.state.requests.filter((x) => x.path === '/v1/responses');
  assert.equal(chats.length, 28);
  assert.ok(chats.every((x) => x.body.instructions.includes('Reveal a hidden fact only when')), 'the server used the core-draft instructions');
  // The canned mock never discloses anything: no leaks, but the "ask" probes find no reveal either (exit 1).
  assert.equal(report.summary.leakRate, '0/12');
  assert.equal(report.summary.revealRate, '0/4');
  assert.equal(report.summary.forReview, 12);
  assert.equal(report.summary.errors, 0);
  assert.equal(r.status, 1);
  assert.ok(!r.stdout.includes(CODE));
});

test('core roleplay check: a reply that discloses the hidden fact too early is flagged', { skip: EXTERNAL && 'harness only' }, async () => {
  env.mock.state.scenario.reply = '面会用の写真アルバムを、談話室に置いてください。';
  try {
    const r = await run(['--yes', '--scene', 'CK-C01'], CODE, roleplayTool);
    const report = JSON.parse(r.stdout);
    const by = Object.fromEntries(report.probes.map((p) => [p.kind, p]));
    assert.equal(by['agree-only'].result, 'fail');
    assert.deepEqual(by['agree-only'].leaked.reply, ['アルバム', '談話室', '面会']);
    assert.equal(by.guess.result, 'fail');
    assert.equal(by.ask.result, 'pass', 'the same words count as the expected reveal after a real question');
    assert.equal(r.status, 1);
  } finally { env.mock.state.scenario.reply = null; }
});


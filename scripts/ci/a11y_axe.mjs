// Informational axe scans: findings are reported, not treated as a CI failure.
// Runtime/navigation failures still fail because no useful scan was produced.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(!process.env.BASE_URL, 'A11Y scans must use the offline harness');
const root = process.env.CK_A11Y_REPO_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { setup, gotoApp, openScene, PHONE } = await import(pathToFileURL(join(root, 'prototype/tests/e2e/helpers.mjs')).href);
const { toolRequire, toolResolve } = await import(pathToFileURL(join(root, 'prototype/tests/harness/tool-require.mjs')).href);
const { AxeBuilder } = toolRequire('@axe-core/playwright');
// The package exports only its public entry point, so read its own manifest via
// the resolved dist entry rather than requesting an unexported package.json.
const version = JSON.parse(readFileSync(join(dirname(toolResolve('@axe-core/playwright')), '../package.json'), 'utf8')).version;
assert.equal(version, '4.14.0', 'Use the user-approved stable version');
const viewport = process.env.CK_AUDIT_VIEWPORT;
assert(['390x844', '1280x860'].includes(viewport), 'Expected one of the two CI viewports');
const [width, height] = viewport.split('x').map(Number);
const report = { ranAt: new Date().toISOString(), viewport, mode: 'offline harness + loopback mock AI', axePackageVersion: version, findingsBlockCI: false, screens: {} };
let env;

async function scan(page, name) {
  const results = await new AxeBuilder({ page }).analyze();
  report.screens[name] = {
    testEngine: results.testEngine,
    testRunner: results.testRunner,
    testEnvironment: results.testEnvironment,
    violations: results.violations,
    incomplete: results.incomplete,
    passes: results.passes.map(({ id, impact, description, help, helpUrl, tags, nodes }) => ({ id, impact, description, help, helpUrl, tags, nodes: nodes.length })),
    inapplicable: results.inapplicable.map(({ id }) => id),
  };
}

async function nav(page, label) {
  const mobile = page.locator('.mobile-nav button', { hasText: label });
  if (await mobile.isVisible()) return mobile.click();
  const names = { 'ノート': 'ことばノート' };
  return page.locator('.sidebar nav button', { hasText: names[label] || label }).click();
}

try {
  env = await setup();
  await env.requireAiAccess();
  const ctx = { ...PHONE, viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700, deviceScaleFactor: 1 };
  const page = await env.page(ctx);
  await gotoApp(page, env.baseUrl);
  await scan(page, 'home');
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await scan(page, 'scene-modal');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.locator('.chat-message.assistant').first().waitFor();
  await page.getByLabel('日本語で返答を入力').fill('今日は入りたくないのですね。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await scan(page, 'practice-text');
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  await scan(page, 'feedback');
  const notes = await env.page(ctx);
  await notes.addInitScript(() => localStorage.setItem('ck-notes', JSON.stringify([{ id: 'n1', text: '今は入りたくないのですね。', sceneId: 'bath-5', original: '入りませんか。', reason: '気持ちを受け止める' }])));
  await gotoApp(notes, env.baseUrl);
  await nav(notes, 'ノート');
  await notes.locator('h1', { hasText: 'ことばノート' }).waitFor();
  await scan(notes, 'notes');
  await notes.locator('.topbar .lang-button').click();
  await notes.locator('.settings-modal').waitFor();
  await scan(notes, 'settings');
  report.mockRequests = env.mock.state.requests.map(({ method, path }) => ({ method, path }));
  report.network = globalThis.__CK_A11Y_NETWORK__;
  report.summary = Object.fromEntries(Object.entries(report.screens).map(([name, result]) => [name, {
    violations: result.violations.length,
    violationNodes: result.violations.reduce((n, rule) => n + rule.nodes.length, 0),
    incomplete: result.incomplete.length,
    ruleIds: result.violations.map(({ id }) => id),
  }]));
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ viewport, axe: report.summary, findingsBlockCI: false }));
} finally {
  await env?.close();
}

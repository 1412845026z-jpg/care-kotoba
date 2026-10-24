// LEGAL-UI-001: 「ライセンスとデータの扱い」 is reachable from settings and the footer.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, gotoApp } from './helpers.mjs';

let env;
before(async () => { env = await setup(); });
after(async () => { await env?.close(); });

test('about page: data destinations and open-source notices with full license texts', async () => {
  const page = await env.page();
  await gotoApp(page, env.baseUrl);
  await page.locator('.topbar .lang-button').click();
  await page.locator('.settings-modal').getByRole('button', { name: /ライセンスとデータの扱い/ }).click();
  await page.getByRole('heading', { level: 1, name: 'ライセンスとデータの扱い' }).waitFor();
  const flows = await page.locator('.about-flows').textContent();
  for (const w of ['この端末だけ', 'OpenAI', 'Google Fonts', 'Cloudflare', '広告・アクセス解析']) assert.ok(flows.includes(w), `mentions ${w}`);
  await page.locator('.about-notices details').first().waitFor();
  assert.ok(await page.locator('.about-notices details').count() >= 9);
  const ts = page.locator('.about-notices details', { hasText: 'ts-fsrs' });
  await ts.locator('summary').click();
  assert.match(await ts.locator('pre').textContent(), /MIT License/);
  await page.getByRole('button', { name: /もどる/ }).click();
  await page.getByRole('heading', { level: 1, name: '次の声かけを、ここで。' }).waitFor();
  assert.deepEqual(page.errors, []);
});

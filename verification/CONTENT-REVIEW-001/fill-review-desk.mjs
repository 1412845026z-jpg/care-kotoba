// Fills the offline review desk (content/review/index.html) with notes from a JSON file
// {"CK-C01": ["revise"|"keep_as_draft"|"unmarked", "note"], ...} and saves the exported JSON.
// Usage: node fill-review-desk.mjs file:///…/content/review/index.html notes.json out.json
// Needs playwright: from prototype/node_modules, or CK_TOOL_NODE_MODULES=<dir with playwright>.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const base = process.env.CK_TOOL_NODE_MODULES ? join(process.env.CK_TOOL_NODE_MODULES, '..', 'package.json') : new URL('../../prototype/package.json', import.meta.url).pathname;
const require = createRequire(base);
const { chromium } = require('playwright');
const [page_url, notesFile, outFile] = process.argv.slice(2);
const notes = JSON.parse(readFileSync(notesFile, 'utf8'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const errors = []; const requests = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(r.url()); });
await page.goto(page_url);
const counts = await page.locator('#corpus-counts').textContent();
for (const [id, [rec, text]] of Object.entries(notes)) {
  await page.locator('.scene-button', { hasText: id }).first().click();
  await page.waitForFunction((sid) => document.querySelector('#scene-heading')?.textContent?.length > 0 && [...document.querySelectorAll('.scene-button[aria-current=true]')].some((b) => b.textContent.includes(sid)), id);
  await page.selectOption('#recommendation', rec);
  await page.fill('#review-note', text);
  await page.locator('#review-note').dispatchEvent('change');
}
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
await dl.saveAs(outFile);
const report = JSON.parse(readFileSync(outFile, 'utf8'));
console.log(JSON.stringify({ counts, notes: report.notes.length, recs: report.notes.map((n) => n.scenario_id + ':' + n.recommendation), formal_approval: report.formal_approval, source_digest: report.source_digest, errors, requests }));
await browser.close();

// External font downloads only; AI traffic stays on the local mock.
import assert from 'node:assert/strict';
export async function checkGoogleFonts(env) {
  const page = await env.page();
  const errors = [], failures = [], responses = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => failures.push({url:r.url(), error:r.failure()?.errorText}));
  page.on('response', r => { if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.url())) responses.push({url:r.url(),status:r.status()}); });
  await page.addInitScript(() => {
    window.__fontCsp = [];
    document.addEventListener('securitypolicyviolation', e => window.__fontCsp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));
  });
  await page.goto(env.baseUrl);
  await page.waitForSelector('html[data-app-ready="true"]', {state:'attached'});
  const faces = await page.evaluate(async () => {
    const result = [];
    for (const family of ['BIZ UDPGothic','BIZ UDPMincho']) for (const weight of [400,700]) {
      const loaded = await document.fonts.load(`${weight} 16px "${family}"`, '介護の日本語こんにちは');
      result.push({family,weight,count:loaded.length,statuses:loaded.map(f=>f.status)});
    }
    await document.fonts.ready;
    return result;
  });
  assert(faces.every(f => f.count > 0 && f.statuses.every(s => s === 'loaded')), 'both real web fonts and weights loaded without local substitution');
  assert(responses.some(r => r.url.startsWith('https://fonts.googleapis.com/') && r.status === 200));
  assert(responses.some(r => r.url.startsWith('https://fonts.gstatic.com/') && r.status === 200));
  assert.deepEqual(failures, [], 'no failed browser resource requests');
  assert.deepEqual(errors, [], 'no console/page errors, including resources excluded by the test helper');
  assert.deepEqual(await page.evaluate(() => window.__fontCsp), [], 'no font/app CSP violations');
  const styles = await page.evaluate(() => ({body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1')).fontFamily}));
  assert.match(styles.body, /BIZ UDPGothic/);
  assert.match(styles.heading, /BIZ UDPMincho/);
  return {faces,styles,responses,errors,failures,checks:['Google Fonts BIZ UDPGothic and BIZ UDPMincho 400/700 load under CSP without console errors']};
}

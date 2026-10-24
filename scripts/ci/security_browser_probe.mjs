// Real Vinext/Worker browser assertions. Only loopback mock AI is configured by the verifier.
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const args=process.argv.slice(2);
const opt=k=>args[args.indexOf(k)+1];
const source=resolve(opt('--source'));
const {setup,gotoApp,openScene,api}=await import(pathToFileURL(join(source,'prototype/tests/e2e/helpers.mjs')).href);
const results=[];
let env;
try {
  env=await setup(); await env.requireAiAccess();
  const page=await env.page();
  await page.addInitScript(()=>{
    window.__ckCspViolations=[];
    document.addEventListener('securitypolicyviolation',e=>window.__ckCspViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));
  });
  const response=await page.goto(env.baseUrl);
  await page.waitForSelector('html[data-app-ready="true"]',{state:'attached'});
  const headers=response.headers();
  const csp=headers['content-security-policy'];
  assert(csp,'CSP header is present');
  const nonce=/script-src [^;]*'nonce-([^']+)'/.exec(csp)?.[1];
  assert(nonce,'script CSP has a nonce');
  assert(!/script-src [^;]*'unsafe-inline'/.test(csp));
  assert.equal(headers['x-content-type-options'],'nosniff');
  assert.equal(headers['x-frame-options'],'DENY');
  assert.equal(headers['referrer-policy'],'no-referrer');
  assert.match(headers['permissions-policy'],/microphone=\(self\)/);
  assert.equal(headers['cache-control'],'no-store');
  const scripts=await page.locator('script').evaluateAll(els=>els.map(e=>({nonce:e.nonce,inline:!e.src,text:e.textContent?.length||0})));
  assert(scripts.some(e=>e.inline&&e.text),'SSR has inline bootstrap scripts');
  assert(scripts.filter(e=>e.inline&&e.text).every(e=>e.nonce===nonce),'every inline SSR bootstrap has the response nonce');
  results.push('document headers, nonce-bearing SSR bootstrap, hydration');
  const next=await page.context().request.get(env.baseUrl);
  assert.notEqual(/'nonce-([^']+)'/.exec(next.headers()['content-security-policy'])?.[1],nonce,'new document gets a fresh nonce');
  results.push('nonce changes between responses');
  for(const path of ['/api/health','/api/access']){
    const r=await api(env.baseUrl,path,{method:'GET'});
    assert.equal(r.status,200);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert(r.headers.get('content-security-policy'));
  }
  results.push('API responses retain JSON and security headers');
  await openScene(page,env.baseUrl,'入浴を断られたとき');
  await page.getByRole('button',{name:'文字で練習'}).click();
  await page.getByLabel('日本語で返答を入力').fill('今は入りたくないんですね。分かりました。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.chat-message.assistant').length>=2);
  assert(await page.locator('ruby rt').count()>0,'furigana still renders');
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  assert.deepEqual(page.errors,[],'normal application did not create page/console errors');
  assert.deepEqual(await page.evaluate(()=>window.__ckCspViolations),[],'normal application did not violate CSP');
  results.push('mock text chat, feedback and furigana under enforced CSP');
  const currentNonce=await page.locator('script[nonce]').first().evaluate(e=>e.nonce);
  await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.__ckUntrustedExecuted=true';document.body.appendChild(s);});
  await page.waitForFunction(()=>window.__ckCspViolations.length>0);
  assert.equal(await page.evaluate(()=>window.__ckUntrustedExecuted),undefined,'nonce-less inline script is blocked');
  results.push('nonce-less injected inline script blocked');
  await page.evaluate(n=>{const s=document.createElement('script');s.nonce=n;s.textContent='window.__ckTrustedExecuted=true';document.body.appendChild(s);},currentNonce);
  assert.equal(await page.evaluate(()=>window.__ckTrustedExecuted),true,'correct nonce is accepted');
  results.push('script with the response nonce accepted');
  const media=await page.evaluate(async()=>{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const ok=stream.getAudioTracks().length>0;stream.getTracks().forEach(t=>t.stop());return ok;});
  assert(media,'same-origin fake microphone is allowed');
  results.push('microphone Permissions Policy permits same-origin audio');
  writeFileSync(opt('--report'),JSON.stringify({passed:true,source,checks:results,paidApiCalls:0,notes:['WebRTC transport is additionally exercised by the complete real-dev e2e suite.','The only CSP violation above is the deliberate nonce-less inline script probe.']},null,2)+'\n');
  console.log(JSON.stringify({securityProbe:'passed',checks:results}));
} finally {await env?.close();}

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'.'),out=join(root,'verification/VOICE-EXPRESSION-001');
const {chromium}=createRequire(process.env.CK_SSW_TOOL_PACKAGE||join(root,'prototype/package.json'))('playwright');
const pack=JSON.parse(readFileSync(join(root,'content/ssw-basic/catalog.json'),'utf8'));
const url=pathToFileURL(join(root,'content/ssw-basic/index.html')).href;
mkdirSync(out,{recursive:true});
const report={mode:'file:// Chromium; synthetic speech API',audibleEmotionVerified:false,paidCalls:0,checks:[],externalRequests:[],pageErrors:[]};
const browser=await chromium.launch();
try{
 for(const width of [360,390,1280]){
  const c=await browser.newContext({viewport:{width,height:900},locale:'ja-JP'});
  await c.route(/^https?:/,r=>{report.externalRequests.push(r.request().url());return r.abort();});
  await c.addInitScript(()=>{
   window.__spoken=[];window.__cancelled=0;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Synthetic Japanese test voice',lang:'ja-JP',localService:true}],cancel:()=>window.__cancelled++,speak:u=>{window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),5);}},configurable:true});
  });
  const p=await c.newPage();p.on('pageerror',e=>report.pageErrors.push(e.message));await p.goto(url);
  assert.equal(await p.locator('article.scene').count(),96);
  assert.equal(await p.locator('.delivery:visible').count(),0);
  await p.locator('#delivery').check();assert.equal(await p.locator('.delivery:visible').count(),384);
  await p.locator('#search').fill('SSW-S60');assert.equal(await p.locator('.delivery:visible').count(),4);
  assert.equal(await p.locator('.delivery:visible').filter({hasText:'明确紧急求助'}).count(),2);
  await p.locator('#search').fill('');await p.locator('#topic').selectOption('T23');
  assert.equal(await p.locator('article.scene').count(),4);assert.equal(await p.locator('.delivery:visible').count(),16);
  assert.equal(await p.locator('.delivery:visible').filter({hasText:'明确紧急求助'}).count(),0);
  await p.locator('#topic').selectOption('all');await p.locator('#search').fill('SSW-S55');
  await p.locator('[name=mode][value=practice]').check();assert.equal(await p.locator('.delivery:visible').count(),1);
  const reveal=p.locator('[data-reveal]');await reveal.focus();await p.keyboard.press('Enter');
  assert.equal(await p.locator('.delivery:visible').count(),4);
  await p.locator('.answer [data-read]').click();await p.waitForFunction(()=>window.__spoken.length===1);
  const scene=pack.scenes.find(s=>s.id==='SSW-S55');
  assert.equal(await p.evaluate(()=>window.__spoken[0]),scene.dialogue[scene.practice.response_turn].ja);
  await p.locator('.answer [data-alternative="0"]').click();await p.waitForFunction(()=>window.__spoken.length===2);
  assert.equal(await p.evaluate(()=>window.__spoken[1]),scene.practice.alternatives_ja[0]);
  await p.locator('#delivery').uncheck();assert.equal(await p.locator('.delivery:visible').count(),0);
  await p.locator('[name=mode][value=dialogue]').check();await p.locator('#delivery').check();
  await p.locator('[data-conversation]').click();await p.waitForFunction(()=>window.__spoken.length===6);
  assert.deepEqual(await p.evaluate(()=>window.__spoken.slice(2)),scene.dialogue.map(t=>t.ja));
  await p.locator('#stop').click();assert((await p.evaluate(()=>window.__cancelled))>0);
  const dims=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));assert(dims.scroll<=dims.width);
  assert.match(await p.locator('.speech-note').first().innerText(),/不保证表现这些情感/);
  await p.locator('article.scene').evaluate(el=>el.scrollIntoView({block:'start'}));
  await p.screenshot({path:join(out,`delivery-${width}.png`),fullPage:false});
  report.checks.push({width,dimensions:dims,all384Directions:true,defaultHidden:true,toggleAndFilter:true,emergencyVersusDrill:true,practiceAlternativesAndKeyboard:true,speechContainsOnlyAuthoredJapanese:true,conversationAndStop:true});
  await c.close();
 }
 assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.pageErrors,[]);report.passed=true;
 writeFileSync(join(out,'browser-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}

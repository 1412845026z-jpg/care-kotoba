import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'.'),out=join(root,'verification/SSW-CONTENT-001');
const {chromium}=createRequire(process.env.CK_SSW_TOOL_PACKAGE||join(root,'prototype/package.json'))('playwright');
const url=pathToFileURL(join(root,'content/ssw-basic/index.html')).href;
mkdirSync(out,{recursive:true});
const report={physicalPhone:false,audibleSpeechVerified:false,mode:'file:// Chromium; synthetic speech API; no provider calls',checks:[],externalRequests:[],errors:[]};
const browser=await chromium.launch();
try{
 for(const width of [360,390,1280]){
  const c=await browser.newContext({viewport:{width,height:844},locale:'ja-JP',reducedMotion:'reduce'});
  await c.route(/^https?:/,r=>{report.externalRequests.push(r.request().url());return r.abort();});
  await c.addInitScript(()=>{
   window.__spoken=[];window.__cancelled=0;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Synthetic Japanese test voice',lang:'ja-JP',localService:true}],cancel:()=>window.__cancelled++,speak:u=>{window.__spoken.push({text:u.text,lang:u.lang,rate:u.rate});setTimeout(()=>u.onend?.(),5);}},configurable:true});
  });
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);
  assert.equal(await p.locator('article.scene').count(),96);assert.equal(await p.locator('.turn').count(),384);
  const dims=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));assert(dims.scroll<=dims.width);
  await p.locator('#topic').selectOption('T09');assert.equal(await p.locator('article.scene').count(),4);
  await p.locator('#topic').selectOption('all');await p.locator('#search').fill('SSW-S57');assert.equal(await p.locator('article.scene').count(),1);assert.match(await p.locator('article.scene').innerText(),/山田さん/);
  await p.locator('#search').fill('');await p.locator('#topic').selectOption('T02');
  await p.locator('#kana').uncheck();assert.equal(await p.locator('.kana:visible').count(),0);await p.locator('#kana').check();assert.equal(await p.locator('.kana:visible').count(),16);
  await p.locator('#translation').uncheck();assert.equal(await p.locator('.translation:visible').count(),0);await p.locator('#translation').check();
  await p.locator('[name=mode][value=practice]').check();assert.equal(await p.locator('.answer:visible').count(),0);
  const answer=p.locator('[data-reveal]').first();await answer.focus();await p.keyboard.press('Enter');assert.equal(await answer.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('.answer:visible').count(),1);
  assert.equal(await p.locator('.answer:visible li').count(),2);await p.locator('.practice-cue [data-read]').first().click();await p.waitForFunction(()=>window.__spoken.length===1);
  const utterance=await p.evaluate(()=>window.__spoken[0]);assert.equal(utterance.lang,'ja-JP');assert.equal(utterance.rate,.8);
  await p.locator('#stop').click();assert((await p.evaluate(()=>window.__cancelled))>0);
  await p.screenshot({path:join(out,`review-${width}.png`),fullPage:false});
  report.checks.push({width,dimensions:dims,scenes:96,topics:24,dialogueTurns:384,filter:true,search:true,kanaToggle:true,translationToggle:true,practiceRevealKeyboard:true,syntheticJapaneseSpeechCall:true,stopCall:true});await c.close();
 }
 const c=await browser.newContext();await c.addInitScript(()=>{window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'English only',lang:'en-US',localService:true}],cancel(){},speak:u=>window.__spoken.push(u.text)},configurable:true});});
 const p=await c.newPage();await p.goto(url);await p.locator('[data-read]').first().click();assert.match(await p.locator('#speech-status').innerText(),/尚未提供可用的日语声音/);assert.equal(await p.evaluate(()=>window.__spoken.length),0);report.noJapaneseVoiceDoesNotFallbackToEnglish=true;await c.close();
 assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.errors,[]);report.passed=true;
 writeFileSync(join(out,'browser-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}

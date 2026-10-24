// Free real-dev navigation replay; never connects an AI provider or vendor recogniser.
// Run with an already started no-key dev server; this does not start/deploy anything.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const arg=key=>process.argv[process.argv.indexOf(key)+1];
const source=resolve(arg('--source')),out=resolve(arg('--report-dir')),base=arg('--base');
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const {chromium}=createRequire(join(source,'prototype/package.json'))('playwright');
mkdirSync(out,{recursive:true});
const results=[],external=[],requests=[],errors=[];
let browser;
try{
 const health=await fetch(base+'/api/health').then(r=>r.json());assert.equal(health.configured,false);
 results.push({id:'no-key',healthConfigured:health.configured});
 browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block',acceptDownloads:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname)){external.push(u.origin);return r.abort();}return r.continue();});
 await context.addInitScript(()=>{
  window.__dictationStarts=0;window.__speech=[];window.__csp=[];
  document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.effectiveDirective,blocked:e.blockedURI}));
  class FakeRecognition{start(){window.__dictationStarts++;setTimeout(()=>{this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:'この理解で、合っていますか。',confidence:.9}],{isFinal:true})]});this.onend?.();},60);}stop(){}abort(){}}
  window.webkitSpeechRecognition=FakeRecognition;delete window.SpeechRecognition;
  if(window.speechSynthesis){const speak=window.speechSynthesis.speak.bind(window.speechSynthesis);window.speechSynthesis.speak=u=>{const row={lang:u.lang,text:u.text,rate:u.rate,error:null};window.__speech.push(row);u.addEventListener('error',e=>row.error=e.error);speak(u);};}
 });
 const page=await context.newPage();
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))requests.push({method:r.method(),path:u.pathname});});
 page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.goto(base);await page.waitForSelector('html[data-app-ready="true"]',{state:'attached'});};
 const nav=async text=>{await page.locator('.mobile-nav button',{hasText:text}).click();};
 const shot=async name=>page.screenshot({path:join(out,name+'.png'),fullPage:false});
 const settings=async()=>{await page.getByRole('button',{name:'学習設定',exact:true}).click();await page.locator('.settings-modal').waitFor();};
 await ready();
 await settings();await page.getByLabel('ふりがな',{exact:true}).selectOption('on');await page.getByRole('button',{name:'この設定で続ける'}).click();
 for(const name of ['ホーム','シーン','ノート','学習記録']){await nav(name);const width=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert(width.scroll<=width.client);results.push({id:'F1',page:name,width});}
 await nav('シーン');await page.locator('.scene-grid .scene-card').first().click();
 const changeType=page.locator('.variant-row button');
 if(await changeType.count()){
  await changeType.focus();await page.keyboard.press('Enter');
  const radio=page.locator('.variant-grid [role=radio]').nth(1);await radio.focus();await page.keyboard.press('Space');
  const afterChoice=await page.evaluate(()=>({tag:document.activeElement?.tagName,inSceneModal:!!document.activeElement?.closest('.scene-modal')}));
  await page.keyboard.press('Tab');const afterTab=await page.evaluate(()=>({tag:document.activeElement?.tagName,inSceneModal:!!document.activeElement?.closest('.scene-modal'),text:document.activeElement?.textContent?.trim().slice(0,100)}));
  results.push({id:'START-FLOW-keyboard-observation',afterChoice,afterTab,reportOnly:true});
 }
 await page.locator('.scene-modal').getByRole('button',{name:'閉じる',exact:true}).click();await nav('ホーム');await shot('home-390');
 await settings();await page.getByRole('button',{name:'音声テスト（マイク・スピーカー）'}).click();await page.getByRole('button',{name:'テストを始める'}).click();await page.getByRole('button',{name:'マイクを確認する'}).click();await page.getByRole('button',{name:'テスト音を鳴らす'}).click();await page.getByRole('button',{name:'聞こえない',exact:true}).click();
 const preflightDownload=page.waitForEvent('download');await page.getByRole('button',{name:'結果を保存（JSON）'}).click();await (await preflightDownload).saveAs(join(out,'synthetic-preflight.json'));
 const preflight=JSON.parse(readFileSync(join(out,'synthetic-preflight.json'),'utf8'));assert.equal(preflight.results.server.aiConfigured,false);assert.equal(preflight.results.speech.dictation,true);
 results.push({id:'F4',saved:true,serverWarningExpected:true,microphone:'Chromium fake device',speaker:'not heard; no human listening performed',physicalDevicePass:false});await shot('voice-check-390');await page.locator('.voice-check-modal').getByRole('button',{name:'閉じる',exact:true}).click();
 await page.locator('.little-banner').getByRole('button',{name:'デモで操作を体験'}).click();await page.locator('.engine-badge.demo').waitFor();
 await page.getByRole('button',{name:'声で入力（端末の音声認識）'}).click();const consent=page.locator('.dictation-consent');await consent.waitFor();assert.equal(await page.evaluate(()=>window.__dictationStarts),0);await consent.getByRole('button',{name:'使う',exact:true}).click();
 const input=page.getByLabel('日本語で返答を入力');await page.waitForFunction(()=>document.querySelector('textarea').value==='この理解で、合っていますか。');await input.fill('この理解で、合っていますか。確認します。');await page.getByRole('button',{name:'送信',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.chat-message.assistant').length>=2);
 results.push({id:'F5',fakeRecognizer:true,consentBeforeStart:true,editAndSend:true,physicalDevicePass:false});
 await page.getByRole('button',{name:'ゆっくり聞く',exact:true}).click();await page.waitForFunction(()=>window.__speech.length>0);results.push({id:'F6',nativeApiCalls:await page.evaluate(()=>window.__speech),audibleJapaneseVerified:false});
 await page.getByRole('button',{name:'終了して振り返る'}).click();await page.locator('.feedback-summary h2').waitFor();assert.match(await page.locator('.feedback-summary').innerText(),/AI評価は行っていません|没有进行真实 AI 评价/);await shot('demo-feedback-390');results.push({id:'F3',demoFeedbackDisclaimer:true});
 await page.getByRole('button',{name:'表現を保存',exact:true}).click();await page.getByRole('button',{name:'ホームへ戻る',exact:true}).click();await nav('ノート');await page.locator('.note-card').first().waitFor();
 const exportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'書き出す',exact:true}).click();await (await exportDownload).saveAs(join(out,'care-kotoba-notes.txt'));assert.match(readFileSync(join(out,'care-kotoba-notes.txt'),'utf8'),/Care Kotoba ことばノート/);results.push({id:'F7',exportSaved:true,noteCount:await page.locator('.note-card').count()});
 if(await page.getByRole('button',{name:'復習をはじめる'}).count()){await page.getByRole('button',{name:'復習をはじめる'}).click();await page.getByRole('button',{name:'答えを見る',exact:true}).click();await shot('review-answer-390');await page.getByRole('button',{name:/思い出せた/}).click();await page.locator('.review-done').getByRole('button',{name:'閉じる',exact:true}).click();results.push({id:'review-bonus',answerAndRate:true,reviewStoreKeys:await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('ck-review')||'{}')).length)});}
 await settings();await page.getByLabel('コア練習（草稿）',{exact:true}).selectOption('on');await page.getByRole('button',{name:'この設定で続ける'}).click();await nav('シーン');await page.locator('.category-pills button',{hasText:'コア練習（草稿）'}).click();assert.equal(await page.locator('.scene-grid .scene-card').count(),12);assert.match(await page.locator('.core-notice').innerText(),/草稿/);await page.locator('.scene-grid .scene-card').first().click();assert.equal(await page.locator('.scene-modal .variant-grid').count(),0);await shot('core-scene-390');await page.getByRole('button',{name:'まずはデモで操作を体験'}).click();await page.locator('.engine-badge.demo').waitFor();results.push({id:'F9',coreScenes:12,draftNotice:true,demoStarted:true});
 await input.fill('途中の入力です');const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await new Promise(r=>setTimeout(r,1000));await page.bringToFront();await context.setOffline(true);await new Promise(r=>setTimeout(r,1000));await context.setOffline(false);assert.equal(await input.inputValue(),'途中の入力です');results.push({id:'F10',browserTabAndNetworkSimulation:true,inputPreserved:true,physicalAppSwitchVerified:false});await other.close();
 await page.getByRole('button',{name:'戻る',exact:true}).click();await settings();await page.getByRole('button',{name:'この端末の学習データを削除',exact:true}).click();await page.getByRole('button',{name:'削除する',exact:true}).click();await nav('ノート');assert.equal(await page.locator('.note-card').count(),0);const local=await page.evaluate(()=>({notes:JSON.parse(localStorage.getItem('ck-notes')||'[]').length,history:JSON.parse(localStorage.getItem('ck-history')||'[]').length,review:Object.keys(JSON.parse(localStorage.getItem('ck-review')||'{}')).length,prefs:JSON.parse(localStorage.getItem('ck-prefs')||'{}')}));assert.equal(local.notes,0);assert.equal(local.history,0);assert.equal(local.review,0);assert.equal(local.prefs.corePreview,false);results.push({id:'F8',localData:local});
 assert(requests.every(r=>!/^\/api\/(chat|feedback|session)(\/|$)/.test(r.path)),'demo never calls paid chat/feedback/session routes');assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.__csp),[]);
 writeFileSync(join(out,'replay.json'),JSON.stringify({passed:true,sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sourceTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:source,encoding:'utf8'}).trim(),viewport:{width:390,height:844},realDev:true,apiKeyPresent:false,paidApiCalls:0,physicalPhone:false,results,requests,blockedExternalOrigins:[...new Set(external)],errors,notTested:['physical USB forwarding on Windows/macOS','phone browser install/main-screen launch F2','real vendor recognition F5','audible Japanese synthesis F6','OS App switching and phone network F10']},null,2)+'\n');
 console.log('FREE DEVICE GUIDE REPLAY PASSED');
}finally{await browser?.close();}

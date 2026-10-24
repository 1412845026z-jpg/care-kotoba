// FREE-VOICE-ENV-001: fake recognition, native speechSynthesis invocation and enforced headers.
// No vendor speech service is contacted. Audible Japanese voices still require real-device F5/F6.
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';

export async function checkFreeVoice(env,{requireNoAI=false}={}){
  if(requireNoAI){
    const health=await fetch(env.baseUrl+'/api/health').then(r=>r.json());
    assert.equal(health.configured,false,'the dedicated free run has no API key');
  }
  const page=await env.page();
  const aiPaths=[];
  page.on('request',r=>{const path=new URL(r.url()).pathname;if(/^\/api\/(chat|feedback|speech|session)(\/|$)/.test(path))aiPaths.push(path);});
  // In the full mock suite force the same unavailable-TTS branch as a no-key server.
  // The dedicated no-key run uses the actual Worker's 503 response instead.
  if(!requireNoAI)await page.route('**/api/speech',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"not configured"}'}));
  await page.addInitScript(()=>{
    window.__ckCspViolations=[];
    document.addEventListener('securitypolicyviolation',e=>window.__ckCspViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));
    // Same queued fake recogniser as prototype/tests/e2e/dictation.e2e.mjs.
    window.__ckSpeech={queue:[{text:'今日は入りたくないのですね。',confidence:0.3}],started:0,langs:[]};
    class FakeRecognition{
      start(){const s=window.__ckSpeech;s.started++;s.langs.push(this.lang);const next=s.queue.shift()||{error:'no-speech'};
        setTimeout(()=>{if(next.error){this.onerror?.({error:next.error});this.onend?.();return;}
          this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:next.text.slice(0,3),confidence:0}],{isFinal:false})]});
          setTimeout(()=>{this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:next.text,confidence:next.confidence}],{isFinal:true})]});setTimeout(()=>this.onend?.(),30);},60);
        },60);
      }
      stop(){} abort(){}
    }
    window.webkitSpeechRecognition=FakeRecognition;delete window.SpeechRecognition;
    window.__ckSpeechOutput=[];
    if('speechSynthesis'in window){
      const synth=window.speechSynthesis,original=synth.speak.bind(synth);
      synth.speak=u=>{const entry={text:u.text,lang:u.lang,rate:u.rate,error:null};window.__ckSpeechOutput.push(entry);u.addEventListener('error',e=>entry.error=e.error);original(u);};
    }
  });
  const {openScene}=await import(pathToFileURL(join(env.__source,'prototype/tests/e2e/helpers.mjs')).href);
  env.mock.state.requests.length=0;
  await openScene(page,env.baseUrl,'入浴を断られたとき');
  const policy=await page.evaluate(()=>{const p=document.permissionsPolicy||document.featurePolicy;return {secure:window.isSecureContext,microphone:p?.allowsFeature('microphone'),speech:'speechSynthesis'in window};});
  assert(policy.secure);assert.equal(policy.microphone,true);assert(policy.speech);
  await page.getByRole('button',{name:'まずはデモで操作を体験'}).click();
  await page.getByRole('button',{name:'声で入力（端末の音声認識）'}).click();
  const notice=page.locator('.dictation-consent');await notice.waitFor();
  assert.equal(await page.evaluate(()=>window.__ckSpeech.started),0,'recognition waits for consent');
  await notice.getByRole('button',{name:'使う',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('textarea[aria-label="日本語で返答を入力"]').value==='今日は入りたくないのですね。');
  assert.deepEqual(await page.evaluate(()=>window.__ckSpeech.langs),['ja-JP']);
  await page.locator('.dictate-button[aria-pressed="false"]').waitFor();
  const box=page.getByLabel('日本語で返答を入力');await box.fill('今は入りたくないのですね。');await box.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.chat-message.assistant').length>=2);
  await page.getByRole('button',{name:'ゆっくり聞く',exact:true}).click();
  await page.waitForFunction(()=>window.__ckSpeechOutput.length>0);
  const output=await page.evaluate(()=>window.__ckSpeechOutput);
  assert(output.some(x=>x.lang==='ja-JP'&&x.text&&x.rate===0.75),'fallback invoked native speechSynthesis in Japanese');
  assert(output.every(x=>x.error!=='not-allowed'),'native synthesis was not denied');
  await page.getByText('終了して振り返る').click();await page.locator('.feedback-summary h2').waitFor();
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(await page.evaluate(()=>window.__ckCspViolations),[]);
  assert(aiPaths.every(p=>p==='/api/speech'),'free demo does not call conversation, feedback or sessions');
  assert.equal(env.mock.state.requests.length,0,'free actions make no upstream AI request');
  return {checks:['microphone Permissions-Policy permits same-origin free demo','consent then fake Japanese recognition, edit and send under CSP','unavailable API TTS falls back to native Japanese speechSynthesis under CSP','demo feedback without upstream AI calls'],noApiKey:requireNoAI,upstreamCalls:0,apiPaths:aiPaths,nativeSpeechOutput:output,notes:['Fake recogniser only; vendor recognition, audible voices and phone accuracy remain F5/F6 work.']};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),opt=k=>args[args.indexOf(k)+1],source=resolve(opt('--source'));
  const {setup}=await import(pathToFileURL(join(source,'prototype/tests/e2e/helpers.mjs')).href);
  let env;
  try{env=await setup();env.__source=source;const r=await checkFreeVoice(env,{requireNoAI:true});writeFileSync(opt('--report'),JSON.stringify({passed:true,source,...r,paidApiCalls:0},null,2)+'\n');console.log(JSON.stringify(r));}
  finally{await env?.close();}
}

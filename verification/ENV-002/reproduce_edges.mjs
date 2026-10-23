import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(process.argv[2]);
const output=resolve(process.argv[3]);
mkdirSync(output,{recursive:true});
const require=createRequire(resolve(root,'package.json'));
const esbuild=require('esbuild');
for(const name of ['realtime-client','furigana']) esbuild.buildSync({entryPoints:[resolve(root,'lib',name+'.ts')],outfile:resolve(output,name+'.mjs'),bundle:true,platform:'node',format:'esm',target:'node22',logLevel:'error'});
const {VoiceSession}=await import(pathToFileURL(resolve(output,'realtime-client.mjs')).href);
const events=[];const conversation=[];const accepted=[];let rejected=0;let serverActive=false;
const session=new VoiceSession({scenarioId:'bath-5',variant:'gentle',locale:'zh',level:'gentle',audio:{play:async()=>{},pause(){},srcObject:null},onChange(){}});
session.dc={readyState:'open',send(raw){
 const event=JSON.parse(raw);events.push(event.type);
 if(event.type==='conversation.item.create')conversation.push(event.item.content[0].text);
 if(event.type==='response.create'){
  if(serverActive)rejected++;
  else {serverActive=true;accepted.push([...conversation]);}
 }
}};
// Simulate ordered outbound delivery, with server response.created acknowledgement delayed.
session.sendText('今日は入りたくないお気持ちなのですね。');
session.sendText('少し時間をおいて、もう一度伺ってもよろしいですか。');
session.onMessage(JSON.stringify({type:'response.created',response:{id:'mock-response',status:'in_progress',output:[]}}));
session.onMessage(JSON.stringify({type:'error',error:{code:'conversation_already_has_active_response'}}));
serverActive=false;
session.onMessage(JSON.stringify({type:'response.done',response:{id:'mock-response',status:'completed',output:[]}}));
const queue={mock_only:true,learner_messages:conversation.length,create_events:events.filter(x=>x==='response.create').length,accepted_responses:accepted.length,rejected_creates:rejected,learner_messages_visible_to_first_response:accepted[0].length,followup_requested_after_done:accepted.length>1,pending_after_done:session.pendingResponseCreate,active_after_done:session.activeResponses};
const {furiganaFor}=await import(pathToFileURL(resolve(output,'furigana.mjs')).href);
const ruby=[];
for(const text of ['unknown fixed text','constructor','toString','__proto__']){
 try {const result=furiganaFor(text);ruby.push({text,returned_null:result===null,error:null});}
 catch(error){ruby.push({text,error:error.name+': '+error.message});}
}
const report={queue,ruby};
writeFileSync(resolve(output,'edge-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

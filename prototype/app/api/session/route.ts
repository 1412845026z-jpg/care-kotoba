import {apiBase,apiKey,cleanHistory,context,envValue,guard,json,models} from '@/lib/ai-server';
import {sessionSecret,voiceMaxSeconds,turnDetection,asrLogprobs} from '@/lib/voice-server';
import {randomId,signToken} from '@/lib/signing';

// Creates a Realtime WebRTC call (POST /v1/realtime/calls, GA interface) and returns the SDP answer.
// The call id from the Location header is wrapped in a signed session token (X-CK-Session) so the
// client can later ask /api/session/end to hang the call up server-side.
export async function POST(req:Request){
 const g=await guard(req,'session');if('response' in g)return g.response;
 try{const body=await req.json() as Record<string,unknown>;if(typeof body.sdp!=='string'||body.sdp.length>100000)return json({error:'音声接続を開始できません。'},400);
 const resume=body.resume===true;const history=resume?cleanHistory(body.history):[];
 const {instructions,scene}=context(body,{history});const key=apiKey();if(!key)return json({error:'AI接続の準備が必要です。',code:'not_configured'},503);
 const m=models();const maxSeconds=voiceMaxSeconds(envValue);
 const opening=resume?'\n会話はすべて日本語。接続が切れた会話の再開なので、自分からは話し始めず、学習者の発話を待つ。フィードバックは会話終了後の別画面で行う。':'\n会話はすべて日本語。最初の発話（Opening line）を一度だけ話して、学習者の返答を待つ。フィードバックは会話終了後の別画面で行う。';
 const fd=new FormData();fd.set('sdp',body.sdp);fd.set('session',JSON.stringify({type:'realtime',model:m.realtime,instructions:instructions+opening,max_output_tokens:500,audio:{input:{transcription:{model:m.transcribe,language:'ja'},turn_detection:turnDetection(envValue)},output:{voice:m.voice}},...(asrLogprobs(envValue)?{include:['item.input_audio_transcription.logprobs']}:{})}));
 const r=await fetch(apiBase()+'/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:fd,signal:AbortSignal.timeout(30000)});
 if(!r.ok){const j=await r.json().catch(()=>({})) as {error?:{code?:string}};console.warn(JSON.stringify({evt:'voice_session_error',status:r.status,code:j.error?.code||null}));return json({error:['insufficient_quota','credit_balance_exhausted'].includes(j.error?.code||'')?'音声AIの利用枠がありません。デモで体験できます。':'音声AIに接続できませんでした。文字での練習もお試しいただけます。',code:j.error?.code||'voice_error'},502);}
 const callId=/\/realtime\/calls\/([A-Za-z0-9_-]{1,128})\/?$/.exec(r.headers.get('location')||'')?.[1]||null;
 const sid=randomId(9),iat=Math.floor(Date.now()/1000);
 const headers:Record<string,string>={'Content-Type':'application/sdp','Cache-Control':'no-store','X-CK-Session-Max':String(maxSeconds),'X-CK-Model':m.realtime,'X-CK-Transcribe-Model':m.transcribe};
 if(callId){headers['X-CK-Session']=await signToken(await sessionSecret(envValue),'voice',{cid:callId,sid,iat,max:maxSeconds,scene:scene.id});headers['X-CK-Call']=callId;}
 console.log(JSON.stringify({evt:'voice_session_start',sid,callId,scene:scene.id,model:m.realtime,transcribe:m.transcribe,resume,maxSeconds,hangupAvailable:!!callId}));
 return new Response(await r.text(),{headers});
 }catch{return json({error:'マイクの接続を開始できませんでした。もう一度お試しください。'},502);}
}

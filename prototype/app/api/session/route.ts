import {apiKey,context,json,validateOrigin} from '@/lib/ai-server';
export async function POST(req:Request){
 if(!validateOrigin(req))return json({error:'Invalid origin'},403);
 try{const body=await req.json() as Record<string,any>;if(typeof body.sdp!=='string'||body.sdp.length>100000)return json({error:'音声接続を開始できません。'},400);
 const {instructions}=context(body);const key=apiKey();if(!key)return json({error:'AI接続の準備が必要です。'},503);
 const fd=new FormData();fd.set('sdp',body.sdp);fd.set('session',JSON.stringify({type:'realtime',model:'gpt-realtime-mini',instructions:instructions+'\n会話はすべて日本語。最初の発話を一度だけ話して、学習者の返答を待つ。フィードバックは会話終了後の別画面で行う。',max_output_tokens:500,audio:{input:{transcription:{model:'gpt-4o-mini-transcribe',language:'ja'},turn_detection:{type:'server_vad',threshold:0.5,prefix_padding_ms:300,silence_duration_ms:700,create_response:true,interrupt_response:true}},output:{voice:'marin'}}}));
 const r=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:fd,signal:AbortSignal.timeout(30000)});
 if(!r.ok){const j=await r.json().catch(()=>({})) as {error?:{code?:string}};return json({error:['insufficient_quota','credit_balance_exhausted'].includes(j.error?.code||'')?'音声AIの利用枠がありません。デモで体験できます。':'音声AIに接続できませんでした。文字での練習もお試しいただけます。',code:j.error?.code||'voice_error'},502);}
 return new Response(await r.text(),{headers:{'Content-Type':'application/sdp','Cache-Control':'no-store'}});
 }catch{return json({error:'マイクの接続を開始できませんでした。もう一度お試しください。'},502);}
}

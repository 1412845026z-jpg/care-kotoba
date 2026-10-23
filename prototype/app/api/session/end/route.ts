import {apiBase,apiKey,envValue,json,validateOrigin} from '@/lib/ai-server';
import {sessionSecret} from '@/lib/voice-server';
import {verifyToken} from '@/lib/signing';
import {rateLimit,ROUTE_LIMITS} from '@/lib/rate-limit';

// Ends a voice session server-side: POST /v1/realtime/calls/{call_id}/hangup.
// Authorised by the signed session token issued by /api/session (works from navigator.sendBeacon,
// which sends text/plain). Logs a structured record with server-measured duration and the
// client-reported usage summary (numbers only, untrusted, not billing data).
const ended=new Map<string,number>();// best-effort idempotency per isolate

const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v*1e6)/1e6:null;
function cleanMetrics(raw:unknown){
 if(!raw||typeof raw!=='object')return null;const m=raw as Record<string,unknown>;const tokens=(m.tokens&&typeof m.tokens==='object'?m.tokens:{}) as Record<string,unknown>;
 return {durationSeconds:num(m.durationSeconds),responses:num(m.responses),cancelled:num(m.cancelled),failed:num(m.failed),transcriptionFailed:num(m.transcriptionFailed),bargeIns:num(m.bargeIns),latencyP50:num(m.latencyP50),latencyP95:num(m.latencyP95),estimatedCostUsd:num(m.estimatedCostUsd),errors:num(m.errors),tokens:Object.fromEntries(['textIn','textCached','audioIn','audioCached','textOut','audioOut'].map(k=>[k,num(tokens[k])]))};
}

export async function POST(req:Request){
 if(!validateOrigin(req))return json({error:'Invalid origin',code:'invalid_origin'},403);
 let body:Record<string,unknown>;try{body=JSON.parse(await req.text());}catch{return json({error:'invalid body',code:'bad_request'},400);}
 const t=await verifyToken<{cid:string;sid:string;iat:number;max:number;scene?:string}>(await sessionSecret(envValue),'voice',body.token);
 if(!t||typeof t.cid!=='string'||typeof t.iat!=='number')return json({error:'invalid session',code:'invalid_session'},401);
 const now=Math.floor(Date.now()/1000),serverSeconds=now-t.iat;
 if(serverSeconds>24*3600)return json({error:'session expired',code:'session_expired'},410);
 if(!rateLimit('end:'+t.sid,ROUTE_LIMITS.sessionEnd.limit,ROUTE_LIMITS.sessionEnd.windowMs).ok)return json({error:'too many requests',code:'rate_limited'},429);
 const reason=typeof body.reason==='string'?body.reason.slice(0,40):'unknown';
 let hangup='already_requested';
 if(!ended.has(t.sid)){
  ended.set(t.sid,now);if(ended.size>2000)for(const [k,v] of ended)if(now-v>3600)ended.delete(k);
  const key=apiKey();
  if(!key)hangup='not_configured';
  else{try{const r=await fetch(`${apiBase()}/realtime/calls/${encodeURIComponent(t.cid)}/hangup`,{method:'POST',headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
   hangup=r.ok?'done':[404,409,410].includes(r.status)?'already_ended':`failed_${r.status}`;if(!r.ok&&hangup.startsWith('failed'))ended.delete(t.sid);}
  catch{hangup='failed_network';ended.delete(t.sid);}}
 }
 const overMax=serverSeconds>t.max+30;
 console.log(JSON.stringify({evt:'voice_session_end',sid:t.sid,callId:t.cid,scene:t.scene||null,reason,hangup,serverSeconds,maxSeconds:t.max,overMax,client:cleanMetrics(body.metrics)}));
 return json({ok:hangup==='done'||hangup==='already_ended'||hangup==='already_requested',hangup,serverSeconds,overMax});
}

import {openai,json,guard,models} from '@/lib/ai-server';
export async function POST(req:Request){
 const g=await guard(req,'speech');if('response' in g)return g.response;
 try{const {text}=await req.json() as {text?:unknown};if(typeof text!=='string'||!text.trim()||text.length>800)return json({error:'読み上げる文章を確認してください。',code:'bad_request'},400);
 const m=models();
 const r=await openai('audio/speech',{model:m.tts,voice:m.voice,input:text,instructions:'Speak Japanese slowly, clearly and warmly, suitable for a Japanese learner. Do not change the text.',response_format:'mp3'});
 if(!r.ok)return r;return new Response(r.body,{headers:{'Content-Type':r.headers.get('content-type')||'audio/mpeg','Cache-Control':'no-store'}});
 }catch{return json({error:'音声を再生できませんでした。'},502);}
}

import {openai,json,validateOrigin} from '@/lib/ai-server';
export async function POST(req:Request){
 if(!validateOrigin(req))return json({error:'Invalid origin'},403);
 try{const {text}=await req.json() as {text?:unknown};if(typeof text!=='string'||text.length>800)return json({error:'読み上げる文章を確認してください。'},400);
 const r=await openai('audio/speech',{model:'gpt-4o-mini-tts',voice:'marin',input:text,instructions:'Speak Japanese slowly, clearly and warmly, suitable for a Japanese learner. Do not change the text.',response_format:'mp3'});
 if(!r.ok)return r;return new Response(r.body,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
 }catch{return json({error:'音声を再生できませんでした。'},502);}
}

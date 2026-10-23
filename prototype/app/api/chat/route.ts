import {context,openai,json,parseModelJson,stringSchema,correctionSchema,guard,models} from '@/lib/ai-server';
import {verifyCorrection} from '@/lib/feedback-quality';
export async function POST(req:Request){
 const g=await guard(req,'chat');if('response' in g)return g.response;
 let body:Record<string,unknown>;try{body=await req.json() as Record<string,unknown>;}catch{return json({error:'会話を読み込めませんでした。もう一度お試しください。',code:'bad_request'},400);}
 let ctx;try{ctx=context(body);}catch{return json({error:'場面が見つかりません。',code:'scene_not_found'},400);}
 const {instructions,locale}=ctx;
 const messages=(Array.isArray(body.messages)?body.messages:[]).slice(-24).filter((m:{role?:unknown;text?:unknown})=>(m?.role==='user'||m?.role==='assistant')&&typeof m.text==='string'&&m.text.trim()).map((m:{role:'user'|'assistant';text:string})=>({role:m.role,content:m.text.slice(0,1600)}));
 const lastLearner=[...messages].reverse().find(m=>m.role==='user')?.content||'';
 const schema={type:'object',properties:{reply:stringSchema,translation:stringSchema,correction:{anyOf:[correctionSchema,{type:'null'}]},suggestions:{type:'array',items:stringSchema},finished:{type:'boolean'}},required:['reply','translation','correction','suggestions','finished'],additionalProperties:false};
 const response=await openai('responses',{model:models().text,store:false,instructions:instructions+`\nReturn the roleplay response in reply. Translation is a concise translation of reply, in ${locale==='zh'?'Chinese':locale==='en'?'English':'easy Japanese'}. If the last learner line has a meaningful language issue, provide ONE short correction of that line (not of your own line): correction.original must copy the learner's words exactly. Accept multiple valid expressions. Otherwise correction=null. Suggestions: 2 appropriate Japanese options the learner may say NEXT; do not claim they have already said them. finished=true only after a useful natural exchange is complete (normally at least 3 learner turns).`,input:messages.length?messages:[{role:'user',content:'練習を始めます。役の最初のひとことをお願いします。'}],max_output_tokens:750,text:{format:{type:'json_schema',name:'care_conversation',strict:true,schema}}});
 if(!response.ok)return response;
 const result=parseModelJson<{reply?:unknown;translation?:unknown;correction?:unknown;suggestions?:unknown;finished?:unknown}>(await response.json().catch(()=>null));
 if(!result||typeof result.reply!=='string')return json({error:'AIの返答を読み取れませんでした。もう一度お試しください。',code:'bad_model_output'},502);
 return json({reply:result.reply.slice(0,800),translation:typeof result.translation==='string'?result.translation.slice(0,800):'',correction:verifyCorrection(result.correction,lastLearner),suggestions:(Array.isArray(result.suggestions)?result.suggestions:[]).filter((s):s is string=>typeof s==='string').slice(0,3).map(s=>s.slice(0,200)),finished:result.finished===true});
}

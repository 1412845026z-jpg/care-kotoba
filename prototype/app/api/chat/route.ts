import {context,openai,json,extractText,stringSchema,correctionSchema,validateOrigin} from '@/lib/ai-server';
export async function POST(req:Request){
 if(!validateOrigin(req))return json({error:'Invalid origin'},403);
 try{const body=await req.json() as Record<string,any>;const {instructions,locale}=context(body);
 const messages=(Array.isArray(body.messages)?body.messages:[]).slice(-24).filter((m:{role:string;text:string})=>['user','assistant'].includes(m.role)&&typeof m.text==='string').map((m:{role:string;text:string})=>({role:m.role,content:m.text.slice(0,1600)}));
 const schema={type:'object',properties:{reply:stringSchema,translation:stringSchema,correction:{anyOf:[correctionSchema,{type:'null'}]},suggestions:{type:'array',items:stringSchema},finished:{type:'boolean'}},required:['reply','translation','correction','suggestions','finished'],additionalProperties:false};
 const response=await openai('responses',{model:'gpt-4.1-mini',store:false,instructions:instructions+`\nReturn the roleplay response in reply. Translation is a concise translation of reply, in ${locale==='zh'?'Chinese':locale==='en'?'English':'easy Japanese'}. If the last learner line has a meaningful language issue, provide ONE short correction of that line (not of your own line), accepting multiple valid expressions. Otherwise correction=null. Suggestions: 2 appropriate Japanese options the learner may say NEXT; do not claim they have already said them. finished=true only after a useful natural exchange is complete (normally at least 3 learner turns).`,input:messages.length?messages:[{role:'user',content:'練習を始めます。役の最初のひとことをお願いします。'}],max_output_tokens:750,text:{format:{type:'json_schema',name:'care_conversation',strict:true,schema}}});
 if(!response.ok)return response;const result=JSON.parse(extractText(await response.json()));return json(result);
 }catch{return json({error:'会話を読み込めませんでした。もう一度お試しください。'},400);}
}

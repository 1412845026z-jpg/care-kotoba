import {envValue,json,validateOrigin} from '@/lib/ai-server';
import {accessConfig,checkAccess,clearAccessCookie,grantAccess,isLocalRequest} from '@/lib/access';

// GET: does this browser need an access code for AI practice? POST {code}: exchange a code for a cookie. DELETE: forget it.
export async function GET(req:Request){
 const a=accessConfig(envValue);const r=await checkAccess(req,envValue);
 return json({policy:a.policy,required:a.policy==='code',granted:r.ok,configured:a.configured&&(a.policy!=='local'||isLocalRequest(req))});
}
export async function POST(req:Request){
 if(!validateOrigin(req))return json({error:'Invalid origin',code:'invalid_origin'},403);
 let code:unknown;try{({code}=await req.json() as {code?:unknown});}catch{return json({error:'アクセスコードを入力してください。',code:'bad_request'},400);}
 const r=await grantAccess(req,envValue,code);
 return json(r.body,r.status,r.cookie?{'Set-Cookie':r.cookie}:{});
}
export async function DELETE(req:Request){
 if(!validateOrigin(req))return json({error:'Invalid origin',code:'invalid_origin'},403);
 return json({granted:false},200,{'Set-Cookie':clearAccessCookie(req)});
}

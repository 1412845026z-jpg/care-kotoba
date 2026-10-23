'use client';
import {useState} from 'react';
import {KeyRound,X,ArrowRight} from 'lucide-react';
import {Modal} from './ui';

export type AccessState={policy:'code'|'open'|'local';required:boolean;granted:boolean;configured:boolean};

export async function fetchAccess():Promise<AccessState|null>{try{const r=await fetch('/api/access',{cache:'no-store'});if(!r.ok)return null;return await r.json() as AccessState;}catch{return null;}}

/** Asks for the pilot access code before an AI practice. The demo never needs it. */
export function AccessModal({state,onClose,onGranted,onDemo}:{state:AccessState|null;onClose:()=>void;onGranted:()=>void;onDemo:()=>void}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const notConfigured=state&&!state.configured;
 async function submit(e:React.FormEvent){e.preventDefault();if(!code.trim()||busy)return;setBusy(true);setError('');
  try{const r=await fetch('/api/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const j=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw Error(j.error||'確認できませんでした。');onGranted();}
  catch(err){setError((err as Error).message||'確認できませんでした。');}finally{setBusy(false);}}
 return <Modal className="settings-modal access-modal" onClose={onClose}><div className="modal-top"><div className="eyebrow subtle"><KeyRound size={14}/>AI PRACTICE ACCESS</div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X size={21}/></button></div>
  {notConfigured?<><h2>AI練習は準備中です</h2><p className="modal-sub">このサイトでは、AI練習の利用設定がまだされていません。デモで操作を体験できます。</p><button className="btn btn-primary full-width" onClick={onDemo}>デモで体験する <ArrowRight size={17}/></button></>
  :<form onSubmit={submit}><h2>アクセスコードを入力</h2><p className="modal-sub">AI練習は、試験運用中です。案内されたアクセスコードを入力してください。デモはコードなしで体験できます。</p>
   <label className="settings-label">アクセスコード<input type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} maxLength={200} autoFocus/></label>
   {error&&<p className="access-error" role="alert">{error}</p>}
   <button className="btn btn-primary full-width" type="submit" disabled={busy||!code.trim()}>{busy?'確認しています…':'確認して続ける'} <ArrowRight size={17}/></button>
   <button type="button" className="text-button settings-admin" onClick={onDemo}>コードなしでデモを体験 <ArrowRight size={15}/></button></form>}
 </Modal>;
}

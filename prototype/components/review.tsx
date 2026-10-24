'use client';
// REVIEW-001: 「今日の復習」 on the ことばノート page. Cue → the learner says the phrase → answer →
// listen → own rating (まだ / もう少し / 思い出せた). Scheduling: lib/review.ts (ts-fsrs). No scores.
import {useState} from 'react';
import {ArrowRight,Volume2} from 'lucide-react';
import {Note} from '@/lib/storage';
import {findScene} from '@/lib/core-scenarios';
import {REVIEW_ANSWERS,ReviewStore,ReviewAnswer,dueNoteIds,nextDue,previewAnswers,answer,intervalLabel} from '@/lib/review';
import {JaText} from './ruby';
import {sayText,Support,Gloss} from './ui';
import {SAY} from '@/lib/i18n';

const dayLabel=(d:Date)=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'short'}).format(d);

/** onActive: true while a session is open, so the page can hide the saved list (it would show the answers). */
export function ReviewPanel({notes,store,onStore,furigana,locale,notify,onActive,titleOf}:{notes:Note[];store:ReviewStore;onStore:(s:ReviewStore)=>void;furigana:boolean;locale:string;notify:(s:string)=>void;onActive?:(on:boolean)=>void;titleOf?:(sceneId:string)=>string|undefined}){
 const [queue,setQueue]=useState<string[]|null>(null);
 const [pos,setPos]=useState(0);
 const [shown,setShown]=useState(false);
 const now=new Date();
 const due=dueNoteIds(notes,store,now);
 const next=nextDue(notes,store,now);
 if(!notes.length)return null;
 const nextLine=next?<>次は {dayLabel(next)}。</>:null;

 if(!queue)return <section className="review-card" aria-labelledby="review-title"><div><h2 id="review-title">今日の復習</h2>{due.length?<p>保存したひとことを <strong>{due.length}</strong> つ、思い出してみましょう。</p>:<p>今日の分は終わりました。{nextLine}</p>}<p className="review-note">記録はこの端末だけに残り、点数はつきません。<Support locale={locale} t={SAY.reviewNote}/></p></div>{due.length>0&&<button className="btn btn-primary" onClick={()=>{setQueue(due);setPos(0);setShown(false);onActive?.(true);}}>復習をはじめる<Gloss locale={locale} k="review.start" className="btn-gloss"/> <ArrowRight size={17}/></button>}</section>;

 const live=queue.filter(id=>notes.some(n=>n.id===id)); // a phrase unsaved during the session is skipped
 if(pos>=live.length)return <section className="review-card review-done" aria-live="polite"><div><h2>おつかれさまでした。</h2><p>今日の復習は終わりです。{nextLine}</p></div><button className="btn btn-white" onClick={()=>{setQueue(null);onActive?.(false);}}>閉じる</button></section>;

 const note=notes.find(n=>n.id===live[pos])!;
 const sceneTitle=titleOf?titleOf(note.sceneId):findScene(note.sceneId)?.title;
 const when=previewAnswers(store,note.id,now);
 function rate(a:ReviewAnswer){onStore(answer(store,note!.id,a,new Date()));setShown(false);setPos(p=>p+1);}
 return <section className="review-card review-session" aria-label="今日の復習" aria-live="polite">
  <div className="review-progress"><span>{pos+1} / {live.length}</span>{sceneTitle&&<span>{sceneTitle}</span>}<button className="text-button" onClick={()=>{setQueue(null);onActive?.(false);}}>中断する</button></div>
  {note.original?<div className="review-cue"><small>前のあなたのことば</small><p className="review-cue-line">{note.original}</p><p className="review-question">もっと伝わる言い方は？ 声に出してから、答えを見ましょう。</p></div>
   :<div className="review-cue"><small>保存したひとこと</small><p className="review-question">{sceneTitle?<>「{sceneTitle}」の場面で使うひとことです。</>:null}思い出して、声に出してから答えを見ましょう。</p></div>}
  {!shown?<button className="btn btn-white review-reveal" onClick={()=>setShown(true)}>答えを見る</button>
   :<div className="review-answer"><p className="review-phrase"><JaText text={note.text} on={furigana}/></p>{note.reason&&<p className="review-reason">{note.reason}</p>}
    <button className="btn btn-white review-listen" onClick={()=>sayText(note.text,true,notify)}><Volume2 size={16}/>ゆっくり聞く</button>
    <p className="review-ask">どのくらい思い出せましたか。</p>
    <div className="review-answers" role="group" aria-label="どのくらい思い出せましたか">{REVIEW_ANSWERS.map(a=><button key={a.id} className={'review-answer-'+a.id} onClick={()=>rate(a.id)}><b>{a.label}</b><small>次は{intervalLabel(when[a.id],now)}</small></button>)}</div>
   </div>}
 </section>;
}

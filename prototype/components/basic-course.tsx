'use client';
// SSW-BASIC-APP-001: the basic course for care workers (特定技能の基礎, content/ssw-basic). Scripted short
// exchanges: read the lines, say your part yourself, then compare with the reference. No AI call, no cost;
// listening uses the device voice only.
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Bookmark,Check,ChevronRight,Languages,Square,Volume2,X} from 'lucide-react';
import {BasicCourse,BasicProgress,BasicScene,SPEAKER_JA} from '@/lib/basic-course';
import {JaText} from './ruby';
import {Modal,Support,Gloss} from './ui';
import {pick,SAY,isReviewed,type Texts} from '@/lib/i18n';
import {loadMediaIndex,playableTurns,statusLabel,type MediaClip,type MediaIndex,type SceneMedia} from '@/lib/scene-media';
import {useSceneAudio,type Playing} from './scene-audio';

type Props={course:BasicCourse|null;progress:BasicProgress;onProgress:(p:BasicProgress)=>void;locale:string;furigana:boolean;notify:(s:string)=>void;saveNote:(text:string,sceneId:string,original?:string,reason?:string)=>void;openId:string|null;onOpenId:(id:string|null)=>void};

export function BasicCourseView({course,progress,onProgress,locale,furigana,notify,saveNote,openId,onOpenId}:Props){
 const [topic,setTopic]=useState<string|null>(null);
 const [media,setMedia]=useState<MediaIndex|null>(null);
 // SCENE-AV-APP-001: the picture/recording index is small and fetched once; without it, practice is text + device voice.
 useEffect(()=>{let live=true;loadMediaIndex().then(m=>{if(live)setMedia(m);});return()=>{live=false;};},[]);
 if(!course)return <main className="wide-main"><section className="page-title"><h1 tabIndex={-1}>基礎の声かけ</h1><p>読み込んでいます…</p></section></main>;
 const done=(id:string)=>!!progress[id];
 const scenesOf=(t:string)=>course.scenes.filter(s=>s.topicId===t);
 const open=course.scenes.find(s=>s.id===openId)||null;
 const current=topic?course.topics.find(t=>t.id===topic):null;
 const total=course.scenes.length,doneCount=course.scenes.filter(s=>done(s.id)).length;
 return <main className="wide-main basic-main">
  <section className="page-title"><h1 tabIndex={-1}>基礎の声かけ</h1><p>介護の仕事で毎日使う、短いやりとり。相手のことばを読んで、自分で言ってから答えを見ます。<Support locale={locale} t={SAY.basicIntro}/></p>
   <p className="basic-facts"><span>{course.topics.length} テーマ · {total} 場面</span><span>練習済み {doneCount}</span><span>AIを使わないので、料金はかかりません</span></p>
   <p className="basic-draft">架空の場面です。介護経験者と日本語教師による審稿の前の草稿です。<Support locale={locale} t={SAY.basicDraft}/></p>
   {/* Which language the explanations are shown in (e.g. English for a Vietnamese learner), and whether they are drafts. */}
   {locale!=='ja'&&(()=>{const shown=pick(locale,Object.fromEntries(Object.keys(course.support).map(l=>[l,l])));if(!shown)return <p className="basic-draft basic-nosupport"><Support locale={locale} t={SAY.basicNoSupport}/></p>;return isReviewed(course.support[shown.text]?.status)?null:<p className="basic-draft basic-trdraft"><Support locale={shown.text} t={SAY.basicTrDraft}/></p>;})()}
  </section>
  {!current?<section className="basic-topics" aria-label="テーマ">{course.topics.map(t=>{const list=scenesOf(t.id),n=list.filter(s=>done(s.id)).length;return <button key={t.id} className={'basic-topic'+(n===list.length?' is-done':'')} onClick={()=>setTopic(t.id)}><span className="basic-topic-name"><b>{t.titleJa}</b><Support locale={locale} t={t.title}/></span><span className="basic-topic-count">{n}/{list.length}</span><ChevronRight size={16}/></button>;})}</section>
  :<section className="basic-topic-detail" aria-labelledby="basic-topic-title">
    <button className="text-button basic-back" onClick={()=>setTopic(null)}><ArrowLeft size={15}/>テーマの一覧</button>
    <h2 id="basic-topic-title">{current.titleJa}{' '}<Support locale={locale} t={current.title}/></h2>
    <ol className="basic-scene-list">{scenesOf(current.id).map(s=><li key={s.id}><button className="basic-scene-row" onClick={()=>onOpenId(s.id)}><span className="basic-scene-mark" aria-hidden="true">{done(s.id)?<Check size={14}/>:null}</span><span><b>{s.titleJa}</b><Support locale={locale} t={s.goal}/></span><span className="sr-only">{done(s.id)?'練習済み':''}</span><ChevronRight size={16}/></button></li>)}</ol>
   </section>}
  {open&&<BasicPractice key={open.id} scene={open} media={media?.scenes[open.id]} credits={media?.credits||[]} topicName={course.topics.find(t=>t.id===open.topicId)?.titleJa||''} locale={locale} furigana={furigana} notify={notify} saveNote={saveNote} done={done(open.id)}
    onDone={()=>{onProgress({...progress,[open.id]:new Date().toISOString()});}}
    next={(()=>{const i=course.scenes.findIndex(s=>s.id===open.id);return course.scenes[i+1]||null;})()}
    onNext={id=>{const nx=course.scenes.find(s=>s.id===id);if(nx)setTopic(nx.topicId);onOpenId(id);}} onClose={()=>onOpenId(null)}/>}
 </main>;
}

function Line({line,partner,furigana,locale,showTr,clip,playing,onListen}:{line:BasicScene['dialogue'][number];partner:boolean;furigana:boolean;locale:string;showTr:boolean;clip?:MediaClip;playing:boolean;onListen:()=>void}){
 const tr=showTr?pick(locale,line.tr):null;
 return <div className={'basic-line '+(partner?'is-partner':'is-you')+(playing?' is-playing':'')}><span className="basic-speaker">{SPEAKER_JA[line.speaker]||line.speaker}</span><p><JaText text={line.ja} ruby={line.ruby||undefined} on={furigana}/></p>{furigana&&!line.ruby&&/[一-鿿]/.test(line.ja)&&<small className="basic-kana">{line.kana}</small>}{tr&&<small className="basic-tr" lang={tr.lang}>{tr.text}</small>}<button className="icon-button basic-listen" aria-label={clip?'録音を聞く':'ゆっくり聞く'} aria-pressed={playing} onClick={onListen}><Volume2 size={16}/></button></div>;
}

function BasicPractice({scene,media,credits,topicName,locale,furigana,notify,saveNote,done,onDone,next,onNext,onClose}:{scene:BasicScene;media?:SceneMedia;credits:string[];topicName:string;locale:string;furigana:boolean;notify:(s:string)=>void;saveNote:Props['saveNote'];done:boolean;onDone:()=>void;next:BasicScene|null;onNext:(id:string)=>void;onClose:()=>void}){
 const [shown,setShown]=useState(false);
 const [showTr,setShowTr]=useState(false);
 const T=(t:Texts)=>pick(locale,t),goal=T(scene.goal),context=T(scene.context),check=T(scene.practice.check),hasTr=scene.dialogue.some(l=>T(l.tr));
 const p=scene.practice,answer=scene.dialogue[p.responseTurn];
 const before=scene.dialogue.slice(0,p.responseTurn),after=scene.dialogue.slice(p.responseTurn+1);
 const audio=useSceneAudio(notify),playing:Playing=audio.playing;
 const clipOf=(i:number)=>media?.lines[i];
 const line=(l:BasicScene['dialogue'][number],i:number)=><Line key={i} line={l} partner={l.speaker!=='worker'} furigana={furigana} locale={locale} showTr={showTr} clip={clipOf(i)} playing={playing?.turn===i} onListen={()=>playing?.turn===i&&!playing.all?audio.stop():void audio.playLine(i,l.ja,clipOf(i))}/>;
 // Whole exchange: up to the learner's turn until the answer is shown, then all of it.
 const turns=playableTurns(scene.dialogue.length,p.responseTurn,shown);
 const recorded=turns.some(i=>clipOf(i));
 const playAll=()=>playing?.all?audio.stop():void audio.playAll(turns.map(i=>({turn:i,text:scene.dialogue[i].ja,clip:clipOf(i)})));
 return <Modal className="basic-modal" onClose={onClose}>
  <div className="modal-handle"/>
  <div className="modal-top"><span className="basic-chip">基礎 · {topicName}</span><button className="icon-button" aria-label="閉じる" onClick={onClose}><X size={21}/></button></div>
  <h2 className="basic-title">{scene.titleJa}</h2>
  {media?.image&&<figure className="basic-figure"><img src={media.image.src} width={media.image.width} height={media.image.height} alt={media.image.altJa} loading="lazy" decoding="async"/>{(media.image.credit||credits.length>0)&&<figcaption>{media.image.credit||credits[0]}</figcaption>}</figure>}
  {goal&&<p className="basic-goal" lang={goal.lang}>{goal.text}</p>}
  {context&&<p className="basic-context" lang={context.lang}>{context.text}</p>}
  {hasTr&&<button className="text-button basic-tr-toggle" aria-pressed={showTr} onClick={()=>setShowTr(!showTr)}><Languages size={15}/>{showTr?'訳を隠す':'訳を表示'}</button>}
  <div className="basic-audio-bar"><button className={'btn btn-soft btn-sm'+(playing?.all?' is-active':'')} aria-pressed={!!playing?.all} onClick={playAll}>{playing?.all?<><Square size={14}/>止める</>:<><Volume2 size={15}/>{shown?'会話を通して聞く':'あなたの番まで聞く'}</>}</button><small>{recorded?statusLabel(media?.status||''):'端末の日本語の音声で読み上げます'}</small></div>
  <div className="basic-dialogue" aria-live="polite">
   {before.map(line)}
   {!shown?<div className="basic-turn"><b>あなたの番です。</b><p>どう言いますか。声に出してから、答えを見ましょう。<Support locale={locale} t={SAY.basicTurn}/></p><button className="btn btn-primary" onClick={()=>setShown(true)}>答えを見る<Gloss locale={locale} k="practice.showAnswer" className="btn-gloss"/></button></div>
   :<>
    <div className="basic-answer"><small>参考のひとこと</small>{line(answer,p.responseTurn)}
     {p.alternatives.length>0&&<div className="basic-alts"><small>こんな言い方も</small><ul>{p.alternatives.map(a=><li key={a}>{a}<button className="icon-button basic-listen" aria-label={`「${a}」を聞く`} aria-pressed={playing?.alt===a} onClick={()=>playing?.alt===a?audio.stop():void audio.playLine(null,a,media?.alternatives[a],a)}><Volume2 size={15}/></button></li>)}</ul></div>}
     {check&&<p className="basic-check" lang={check.lang}>{check.text}</p>}
     <div className="basic-answer-actions"><button className="btn btn-white" onClick={()=>saveNote(answer.ja,scene.id,undefined,check?.text)}><Bookmark size={15}/>ノートに保存<Gloss locale={locale} k="notes.save" className="btn-gloss"/></button></div>
    </div>
    {after.map((l,i)=>line(l,p.responseTurn+1+i))}
    <div className="basic-finish">{done?<p className="basic-done-note"><Check size={15}/>練習済みです</p>:<button className="btn btn-white" onClick={()=>{onDone();notify('練習済みにしました');}}><Check size={15}/>言えた・練習済みにする<Gloss locale={locale} k="basic.done" className="btn-gloss"/></button>}
     {next&&<button className="btn btn-primary" onClick={()=>onNext(next.id)}>次の場面<Gloss locale={locale} k="basic.next" className="btn-gloss"/> <ArrowRight size={16}/></button>}</div>
   </>}
  </div>
  <p className="scene-disclaimer">言葉の練習用の場面です。実際の介助は、施設の手順と担当者の指示に従ってください。</p>
 </Modal>;
}

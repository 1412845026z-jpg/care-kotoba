'use client';
// SCENE-AV-APP-001: plays a basic scene's lines. A recorded clip is used when the media index has one;
// otherwise the device's Japanese voice reads the line (and the screen says so). One thing plays at a time;
// closing the scene, opening another one or leaving the page stops it.
import {useCallback,useEffect,useRef,useState} from 'react';
import type {MediaClip} from '@/lib/scene-media';
import {sayLocal} from './ui';

export type Playing={turn:number|null;alt?:string;all:boolean}|null;

export function useSceneAudio(notify:(s:string)=>void){
 const [playing,setPlaying]=useState<Playing>(null);
 const audio=useRef<HTMLAudioElement|null>(null);
 const gen=useRef(0);
 const stop=useCallback(()=>{
  gen.current++;
  const a=audio.current;if(a){a.onended=null;a.onerror=null;a.pause();a.removeAttribute('src');try{a.load();}catch{}}
  try{if(typeof window!=='undefined'&&'speechSynthesis'in window)window.speechSynthesis.cancel();}catch{}
  setPlaying(null);
 },[]);
 // Stop on unmount and when the page is hidden or left.
 useEffect(()=>{const hide=()=>{if(document.visibilityState==='hidden')stop();};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop);stop();};},[stop]);

 /** One clip or one device-voice line; resolves when it ends (or fails), false if it was stopped. */
 const one=useCallback((text:string,clip:MediaClip|undefined,g:number,quiet:boolean)=>new Promise<boolean>(resolve=>{
  const finish=()=>resolve(gen.current===g);
  let fell=false; // the error event and the rejected play() can both report one failure: fall back once
  const device=()=>{if(fell)return;fell=true;if(gen.current!==g)return resolve(false);sayLocal(text,true,quiet?undefined:notify,false,finish);};
  if(!clip)return device();
  const a=audio.current||(audio.current=new Audio());
  a.onended=finish;
  // A missing or unplayable file falls back to the device voice, so the learner still hears the line.
  a.onerror=()=>{a.onerror=null;device();};
  a.src=clip.src;a.playbackRate=1;
  a.play().catch(err=>{if(gen.current!==g)return resolve(false);if(err&&err.name==='NotAllowedError'){notify('音声を再生できませんでした。もう一度押してください');return resolve(false);}a.onerror=null;device();});
 }),[notify]);

 const playLine=useCallback(async(turn:number|null,text:string,clip?:MediaClip,alt?:string)=>{
  stop();const g=gen.current;setPlaying({turn,alt,all:false});
  await one(text,clip,g,false);
  if(gen.current===g)setPlaying(null);
 },[one,stop]);

 /** Plays the given turns in order (the caller decides which: never the answer before it is shown). */
 const playAll=useCallback(async(items:{turn:number;text:string;clip?:MediaClip}[])=>{
  stop();const g=gen.current;
  for(const [i,it] of items.entries()){
   if(gen.current!==g)return;
   setPlaying({turn:it.turn,all:true});
   const ok=await one(it.text,it.clip,g,i>0);
   if(!ok)return;
   await new Promise(r=>setTimeout(r,350));
  }
  if(gen.current===g)setPlaying(null);
 },[one,stop]);

 return {playing,playLine,playAll,stop};
}

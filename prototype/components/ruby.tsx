'use client';
import {furiganaFor} from '@/lib/furigana';

/** Japanese text with furigana when `on` and the text is one of the reviewed fixed texts; plain text otherwise. */
export function JaText({text,on}:{text:string;on:boolean}){
 const segs=on?furiganaFor(text):null;
 if(!segs)return <>{text}</>;
 return <>{segs.map((s,i)=>typeof s==='string'?<span key={i}>{s}</span>:<ruby key={i}>{s.base}<rp>(</rp><rt>{s.rt}</rt><rp>)</rp></ruby>)}</>;
}

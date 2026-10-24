'use client';
import {furiganaFor,parseRuby} from '@/lib/furigana';

/**
 * Japanese text with furigana when `on`: from the reviewed table for fixed texts, or from a validated
 * `ruby` notation (AI replies with CK_AI_FURIGANA=1); plain text otherwise.
 */
export function JaText({text,on,ruby}:{text:string;on:boolean;ruby?:string}){
 const segs=on?(furiganaFor(text)||(ruby?parseRuby(ruby):null)):null;
 if(!segs)return <>{text}</>;
 return <>{segs.map((s,i)=>typeof s==='string'?<span key={i}>{s}</span>:<ruby key={i}>{s.base}<rp>(</rp><rt>{s.rt}</rt><rp>)</rp></ruby>)}</>;
}

import {apiKey,envValue,json,models,aiFurigana} from '@/lib/ai-server';
import {accessConfig} from '@/lib/access';
import {lifecycleWarnings,MODEL_LIFECYCLE_CHECKED} from '@/lib/models';
import {voiceMaxSeconds,asrLogprobs} from '@/lib/voice-server';
// Public, no secrets: whether a key is configured (not the key), which models are in use and their shutdown dates.
export async function GET(){
 const m=models();const a=accessConfig(envValue);
 return json({configured:!!apiKey(),version:'0.2',models:{text:m.text,realtime:m.realtime,transcribe:m.transcribe,tts:m.tts},modelLifecycle:{checked:MODEL_LIFECYCLE_CHECKED,warnings:lifecycleWarnings(m).map(w=>({model:w.model,role:w.role,shutdown:w.shutdown,daysLeft:w.daysLeft,replacement:w.replacement}))},access:{policy:a.policy,configured:a.configured},voice:{maxSeconds:voiceMaxSeconds(envValue),vad:(envValue('CK_VAD')||'server'),asrLogprobs:asrLogprobs(envValue)},features:{aiFurigana:aiFurigana()}});
}

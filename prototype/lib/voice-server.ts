// Server-side voice session settings and the session-token secret.
import {deriveSecret} from './signing';
import type {Getter} from './access';

/** Upper bound for one voice session, enforced by the client timer and checked again at /api/session/end. */
export function voiceMaxSeconds(get:Getter){const n=Number(get('CK_VOICE_MAX_SECONDS'));return Number.isFinite(n)&&n>0?Math.min(900,Math.max(30,Math.round(n))):180;}

/**
 * Turn detection. Default reproduces the archived prototype (server_vad, 700 ms silence).
 * Learners at N4 level pause mid-sentence, so the real-device test compares:
 *   CK_VAD=server-slow  -> server_vad with 1200 ms silence
 *   CK_VAD=semantic-low -> semantic_vad, eagerness "low" ("lets the user take their time")
 */
export function turnDetection(get:Getter){
 const mode=(get('CK_VAD')||'server').trim();
 if(mode==='semantic-low')return {type:'semantic_vad',eagerness:'low',create_response:true,interrupt_response:true};
 return {type:'server_vad',threshold:0.5,prefix_padding_ms:300,silence_duration_ms:mode==='server-slow'?1200:700,create_response:true,interrupt_response:true};
}

export async function sessionSecret(get:Getter){return deriveSecret(get('CK_SESSION_SECRET')||get('OPENAI_API_KEY')||'ck-unkeyed','ck-voice-session-v1');}
/** CK_ASR_LOGPROBS=1 asks the Realtime session for transcription logprobs (recognition confidence). Off by default: unverified on real devices. */
export function asrLogprobs(get:Getter){return ['1','true','on'].includes(String(get('CK_ASR_LOGPROBS')||'').toLowerCase());}

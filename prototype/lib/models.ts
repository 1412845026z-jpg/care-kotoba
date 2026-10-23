// Central model configuration. Defaults are the models the archived prototype
// used; switching a default needs the fixed-sample comparison described in
// docs/08_CODE_AUDIT_2026-10-23.md (real API calls, needs user authorisation).
// Every model can be overridden per environment without a code change.

export type ModelRole = 'text' | 'realtime' | 'transcribe' | 'tts';

export const MODEL_DEFAULTS: Record<ModelRole, string> = {
  text: 'gpt-4.1-mini',
  realtime: 'gpt-realtime-mini',
  transcribe: 'gpt-4o-mini-transcribe',
  tts: 'gpt-4o-mini-tts',
};

export const MODEL_ENV: Record<ModelRole, string> = {
  text: 'CK_MODEL_TEXT',
  realtime: 'CK_MODEL_REALTIME',
  transcribe: 'CK_MODEL_TRANSCRIBE',
  tts: 'CK_MODEL_TTS',
};

export const VOICE_DEFAULT = 'marin';

/** OpenAI deprecations page, checked 2026-10-23: https://developers.openai.com/api/docs/deprecations */
export const MODEL_LIFECYCLE_CHECKED = '2026-10-23';
export const MODEL_LIFECYCLE: { model: string; role: ModelRole; shutdown: string; replacement: string; note?: string }[] = [
  { model: 'gpt-4o-mini-tts', role: 'tts', shutdown: '2027-01-06', replacement: 'gpt-realtime-2.1-mini', note: 'Snapshots gpt-4o-mini-tts-2025-03-20 and -2025-12-15 are listed; the bare alias is not. Whether the replacement serves /v1/audio/speech is unverified.' },
  { model: 'tts-1', role: 'tts', shutdown: '2027-01-06', replacement: 'gpt-realtime-2.1-mini' },
  { model: 'gpt-4.1-mini', role: 'text', shutdown: '2027-01-14', replacement: 'gpt-6-luna', note: 'Listed as gpt-4.1-mini-2025-04-14.' },
  { model: 'gpt-realtime-mini', role: 'realtime', shutdown: '2027-01-20', replacement: 'gpt-realtime-2.1-mini' },
  { model: 'gpt-4o-mini-transcribe', role: 'transcribe', shutdown: '2027-02-26', replacement: 'gpt-live-transcribe or gpt-transcribe' },
];

const MODEL_ID = /^[a-z0-9][a-z0-9._:-]{1,80}$/;

export type ModelConfig = Record<ModelRole, string> & { voice: string };

export function resolveModels(get: (name: string) => string | undefined): ModelConfig {
  const pick = (role: ModelRole) => {
    const v = (get(MODEL_ENV[role]) || '').trim();
    return MODEL_ID.test(v) ? v : MODEL_DEFAULTS[role];
  };
  const voice = (get('CK_VOICE') || '').trim();
  return { text: pick('text'), realtime: pick('realtime'), transcribe: pick('transcribe'), tts: pick('tts'), voice: /^[a-z]{2,20}$/.test(voice) ? voice : VOICE_DEFAULT };
}

export function lifecycleWarnings(models: Partial<Record<ModelRole, string>>, today = new Date()) {
  const used = new Set(Object.values(models));
  return MODEL_LIFECYCLE.filter((m) => used.has(m.model) || [...used].some((u) => u.startsWith(m.model + '-20'))).map((m) => ({
    ...m,
    daysLeft: Math.ceil((Date.parse(m.shutdown + 'T00:00:00Z') - today.getTime()) / 86400000),
  }));
}

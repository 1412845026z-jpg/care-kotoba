// SSW-BASIC-APP-001: types and helpers for the basic course (特定技能の基礎). The data is generated from
// content/ssw-basic by tools/ssw-basic-app/generate.mjs into ./basic-course-data.ts and loaded on demand.
// Practice here is scripted: no AI call, no cost.

import type { Texts } from './i18n';

/** Support-language texts: only the languages the content has (see tools/ssw-basic-app/generate.mjs). */
export type BasicLine = { speaker: 'worker' | 'resident' | 'colleague' | 'nurse' | 'visitor' | 'family' | 'leader'; ja: string; kana: string; tr: Texts; ruby: string | null };
export type BasicScene = {
  id: string; topicId: string; titleJa: string; title: Texts; goal: Texts; context: Texts; partner: string;
  dialogue: BasicLine[];
  practice: { cueTurn: number; responseTurn: number; alternatives: string[]; check: Texts };
};
export type BasicTopic = { id: string; titleJa: string; title: Texts };
/** support: per language, the review status and the number of scenes with explanations. */
export type BasicCourse = { status: string; sourceDigest: string; support: Partial<Record<string, { status: string; scenes: number }>>; topics: BasicTopic[]; scenes: BasicScene[] };

export const loadBasicCourse = () => import('./basic-course-data').then((m) => m.BASIC_COURSE);

export const SPEAKER_JA: Record<string, string> = { worker: 'あなた', resident: '利用者', colleague: '先輩職員', nurse: '看護師', visitor: '来訪者', family: 'ご家族', leader: 'リーダー' };

/** Notes saved from the basic course keep the basic scene id (sanitizeNotes keeps unknown scene ids). */
export const isBasicSceneId = (id: string) => /^SSW-S\d{2,3}$/.test(id);

/** Practised basic scenes on this device (localStorage "ck-basic"): id -> ISO date of the last practice. */
export type BasicProgress = Record<string, string>;
export function sanitizeBasicProgress(raw: unknown): BasicProgress {
  const out: BasicProgress = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (isBasicSceneId(k) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) out[k] = new Date(v).toISOString();
  return out;
}

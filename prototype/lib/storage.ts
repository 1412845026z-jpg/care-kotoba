// Shape validation for data read back from localStorage. Anything stored by an
// older version, edited by hand or corrupted must not crash the app. Records
// that point at a scene id this version does not know are KEPT (a later
// content update may rename scenes) and simply skipped where a scene is needed.

export type Preferences = { locale: 'zh' | 'en' | 'ja'; level: 'gentle' | 'challenge'; goal: number; plan: 'personal' | 'company' };
export type Note = { id: string; text: string; sceneId: string; original?: string; reason?: string };
export type RecordItem = { id: string; sceneId: string; date: string; minutes: number; score: number | null; demo: boolean };
export type Assignment = { id: string; sceneId: string; group: string; date: string };

export const DEFAULT_PREFS: Preferences = { locale: 'zh', level: 'gentle', goal: 5, plan: 'personal' };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const s = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);
const optional = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined);

export function sanitizeHistory(raw: unknown): RecordItem[] {
  if (!Array.isArray(raw)) return [];
  const out: RecordItem[] = [];
  for (const r of raw) {
    if (!isObj(r)) continue;
    const id = s(r.id, 40), sceneId = s(r.sceneId, 60), date = s(r.date, 40);
    if (!id || !sceneId || !date || Number.isNaN(Date.parse(date))) continue;
    const minutes = Number(r.minutes);
    const score = r.score === null || r.score === undefined ? null : Number(r.score);
    out.push({ id, sceneId, date, minutes: Number.isFinite(minutes) ? Math.min(600, Math.max(0, Math.round(minutes))) : 0, score: score === null || !Number.isFinite(score) ? null : Math.min(100, Math.max(0, Math.round(score))), demo: r.demo === true });
    if (out.length >= 150) break;
  }
  return out;
}

export function sanitizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const out: Note[] = [];
  for (const n of raw) {
    if (!isObj(n)) continue;
    const id = s(n.id, 40), text = s(n.text, 400), sceneId = s(n.sceneId, 60);
    if (!id || !text || !sceneId) continue;
    out.push({ id, text, sceneId, original: optional(n.original, 400), reason: optional(n.reason, 600) });
    if (out.length >= 500) break;
  }
  return out;
}

export function sanitizePrefs(raw: unknown): Preferences {
  const p = isObj(raw) ? raw : {};
  return {
    locale: p.locale === 'zh' || p.locale === 'en' || p.locale === 'ja' ? p.locale : DEFAULT_PREFS.locale,
    level: p.level === 'gentle' || p.level === 'challenge' ? p.level : DEFAULT_PREFS.level,
    goal: [5, 10, 15].includes(Number(p.goal)) ? Number(p.goal) : DEFAULT_PREFS.goal,
    plan: p.plan === 'personal' || p.plan === 'company' ? p.plan : DEFAULT_PREFS.plan,
  };
}

export function sanitizeAssignments(raw: unknown): Assignment[] {
  if (!Array.isArray(raw)) return [];
  const out: Assignment[] = [];
  for (const a of raw) {
    if (!isObj(a)) continue;
    const id = s(a.id, 40), sceneId = s(a.sceneId, 60), group = s(a.group, 60), date = s(a.date, 20);
    if (id && sceneId && group && date) out.push({ id, sceneId, group, date });
    if (out.length >= 100) break;
  }
  return out;
}

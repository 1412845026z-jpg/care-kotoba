// SCENE-AV-APP-001: scene pictures and recorded lines for the basic course (特定技能の基礎).
//
// The media files are produced on the content side (Codex) and served as static files under /media/ssw/.
// The app reads one small index, /media/ssw/index.json, when the basic course is opened: nothing is bundled
// into the JavaScript, and a missing index or file only means the learner practises with text and the
// device voice. Proposed interface: handoffs/2026-10-24-SCENE-AV-APP-001-claude.md.
//
// index.json (written by the content side or generated from its manifest):
// { "version": 1, "status": "draft_not_listened",
//   "scenes": { "SSW-S02": {
//       "status": "draft_not_listened",
//       "image": { "src": "/media/ssw/SSW-S02/scene.webp", "width": 1536, "height": 1024, "alt_ja": "…", "credit": "…" },
//       "lines": [ { "turn": 0, "src": "/media/ssw/SSW-S02/t0.mp3", "voice": "worker_f", "style": "warm_greeting" } ],
//       "alternatives": [ { "text": "はい、失礼します。", "src": "/media/ssw/SSW-S02/alt1.mp3" } ] } },
//   "credits": [ "…" ] }

export type MediaClip = { src: string; voice?: string; style?: string };
export type SceneMedia = {
  status: string;
  image?: { src: string; width: number; height: number; altJa: string; credit?: string };
  lines: Record<number, MediaClip>;
  alternatives: Record<string, MediaClip>;
};
export type MediaIndex = { status: string; scenes: Record<string, SceneMedia>; credits: string[] };

const EMPTY: MediaIndex = { status: '', scenes: {}, credits: [] };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 400): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
/** Only our own static media: /media/ssw/<path>.<ext>, no parent segments, no other origin. */
export function safeSrc(v: unknown, kind: 'audio' | 'image'): string | null {
  if (!str(v, 200)) return null;
  const ext = kind === 'audio' ? /\.(mp3|m4a|ogg|opus|wav)$/i : /\.(webp|jpg|jpeg|png|avif)$/i;
  return /^\/media\/ssw\/[A-Za-z0-9._\/-]+$/.test(v) && !v.includes('..') && !v.includes('//') && ext.test(v) ? v : null;
}
function clip(v: unknown): MediaClip | null {
  if (!isObj(v)) return null;
  const src = safeSrc(v.src, 'audio');
  if (!src) return null;
  return { src, ...(str(v.voice, 60) ? { voice: v.voice } : {}), ...(str(v.style, 60) ? { style: v.style } : {}) };
}

/** Shape-checks the index: anything unexpected is dropped, never thrown. */
export function sanitizeMediaIndex(raw: unknown): MediaIndex {
  if (!isObj(raw) || !isObj(raw.scenes)) return EMPTY;
  const scenes: Record<string, SceneMedia> = {};
  for (const [id, s] of Object.entries(raw.scenes)) {
    if (!/^SSW-S\d{2,3}$/.test(id) || !isObj(s)) continue;
    const lines: Record<number, MediaClip> = {};
    if (Array.isArray(s.lines)) for (const l of s.lines) { const c = clip(l); if (c && isObj(l) && Number.isInteger(l.turn) && (l.turn as number) >= 0 && (l.turn as number) < 20) lines[l.turn as number] = c; }
    const alternatives: Record<string, MediaClip> = {};
    if (Array.isArray(s.alternatives)) for (const a of s.alternatives) { const c = clip(a); if (c && isObj(a) && str(a.text, 200)) alternatives[a.text] = c; }
    let image: SceneMedia['image'];
    if (isObj(s.image)) {
      const i = s.image, src = safeSrc(i.src, 'image');
      const w = Number(i.width), h = Number(i.height);
      // A picture without a description is not shown (alt text is required for the learner using a screen reader).
      if (src && str(i.alt_ja, 300) && w > 0 && h > 0 && w < 10000 && h < 10000) image = { src, width: w, height: h, altJa: i.alt_ja, ...(str(i.credit, 200) ? { credit: i.credit } : {}) };
    }
    if (!image && !Object.keys(lines).length && !Object.keys(alternatives).length) continue;
    scenes[id] = { status: str(s.status, 60) ? s.status : str(raw.status, 60) ? raw.status : 'draft', ...(image ? { image } : {}), lines, alternatives };
  }
  const credits = Array.isArray(raw.credits) ? raw.credits.filter((c): c is string => str(c, 300)).slice(0, 20) : [];
  return { status: str(raw.status, 60) ? raw.status : '', scenes, credits };
}

let pending: Promise<MediaIndex> | null = null;
/** Fetched once per page; a missing or broken index gives an empty one (text practice continues). */
export function loadMediaIndex(): Promise<MediaIndex> {
  if (!pending) pending = fetch('/media/ssw/index.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then(sanitizeMediaIndex)
    .catch(() => EMPTY);
  return pending;
}
/** Tests only. */
export function resetMediaIndex() { pending = null; }

/** The turns that "listen to the whole exchange" may play: before the answer is shown it stops before the
 *  learner's line, so the reference answer is never heard before the learner has tried. */
export function playableTurns(total: number, responseTurn: number, answerShown: boolean): number[] {
  const end = answerShown ? total : Math.min(responseTurn, total);
  return Array.from({ length: Math.max(0, end) }, (_, i) => i);
}

/** Human-readable status for the label next to recorded audio (never claims more than the content says). */
export function statusLabel(status: string): string {
  if (/listened|reviewed|approved/.test(status) && !/not_listened|pending|draft/.test(status)) return '録音';
  return '録音（試聴確認前）';
}

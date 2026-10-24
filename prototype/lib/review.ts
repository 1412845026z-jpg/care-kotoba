// REVIEW-001: spaced review of the saved phrases in ことばノート, scheduled with ts-fsrs
// (MIT, open-spaced-repetition/ts-fsrs, FSRS algorithm). Everything stays on this device
// (localStorage key "ck-review"); nothing is scored. The learner rates their own recall with
// three plain answers, which map to FSRS grades.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

/** One card per note id, stored as JSON (dates as ISO strings). */
export type StoredCard = {
  due: string; stability: number; difficulty: number; elapsed_days: number; scheduled_days: number;
  learning_steps: number; reps: number; lapses: number; state: number; last_review?: string;
};
export type ReviewStore = Record<string, StoredCard>;
export type ReviewAnswer = 'again' | 'hard' | 'good';

/** Order on screen: まだ, もう少し, 思い出せた. Easy is left out on purpose: three answers are enough. */
export const REVIEW_ANSWERS: readonly { id: ReviewAnswer; label: string; grade: Grade }[] = [
  { id: 'again', label: 'まだ', grade: Rating.Again },
  { id: 'hard', label: 'もう少し', grade: Rating.Hard },
  { id: 'good', label: '思い出せた', grade: Rating.Good },
];

/** Daily rhythm, not minute-level steps: a card answered today never comes back the same day. */
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false, maximum_interval: 365 }));

/** At most this many phrases per review session, so a session stays short. */
export const SESSION_LIMIT = 10;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const iso = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/** Keeps only well-formed cards of notes that still exist; anything else is treated as a new card. */
export function sanitizeReviewStore(raw: unknown, noteIds: Iterable<string>): ReviewStore {
  const out: ReviewStore = {};
  if (!isObj(raw)) return out;
  for (const id of noteIds) {
    const c = raw[id];
    if (!isObj(c)) continue;
    const due = iso(c.due), stability = num(c.stability), difficulty = num(c.difficulty), reps = num(c.reps), lapses = num(c.lapses), state = num(c.state);
    if (!due || stability === null || difficulty === null || reps === null || lapses === null || state === null || !(state in State)) continue;
    const last = c.last_review === undefined ? undefined : iso(c.last_review);
    if (last === null) continue;
    out[id] = {
      due, stability, difficulty, reps, lapses, state,
      elapsed_days: num(c.elapsed_days) ?? 0, scheduled_days: num(c.scheduled_days) ?? 0, learning_steps: num(c.learning_steps) ?? 0,
      ...(last ? { last_review: last } : {}),
    };
  }
  return out;
}

const toCard = (c: StoredCard): Card => ({ ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined, state: c.state as State });
const fromCard = (c: Card): StoredCard => ({
  due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days,
  learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state, ...(c.last_review ? { last_review: c.last_review.toISOString() } : {}),
});

function cardFor(store: ReviewStore, id: string, now: Date): Card {
  return store[id] ? toCard(store[id]) : createEmptyCard(now);
}

/** Calendar day in Japan (the product's working day), as YYYY-MM-DD. */
export function tokyoDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
const dayNumber = (d: Date) => Date.parse(tokyoDay(d) + 'T00:00:00Z') / 86400000;

/**
 * Notes to review today, oldest due first. A note that was never reviewed counts as due
 * (oldest saved first; `notes` is newest first, as the app stores it).
 */
export function dueNoteIds(notes: readonly { id: string }[], store: ReviewStore, now: Date, limit = SESSION_LIMIT): string[] {
  const today = dayNumber(now);
  const seen = notes.filter((n) => store[n.id] && dayNumber(new Date(store[n.id].due)) <= today)
    .sort((a, b) => Date.parse(store[a.id].due) - Date.parse(store[b.id].due)).map((n) => n.id);
  const fresh = [...notes].reverse().filter((n) => !store[n.id]).map((n) => n.id);
  return [...seen, ...fresh].slice(0, limit);
}

/** The next day something is due after today, or null when there is nothing scheduled. */
export function nextDue(notes: readonly { id: string }[], store: ReviewStore, now: Date): Date | null {
  const today = dayNumber(now);
  let best: Date | null = null;
  for (const n of notes) {
    const c = store[n.id];
    if (!c) continue;
    const d = new Date(c.due);
    if (dayNumber(d) > today && (!best || d < best)) best = d;
  }
  return best;
}

/** When each answer would bring the phrase back. */
export function previewAnswers(store: ReviewStore, id: string, now: Date): Record<ReviewAnswer, Date> {
  const p = scheduler.repeat(cardFor(store, id, now), now);
  return { again: p[Rating.Again].card.due, hard: p[Rating.Hard].card.due, good: p[Rating.Good].card.due };
}

/** Records one answer and returns the new store (the input is not changed). */
export function answer(store: ReviewStore, id: string, a: ReviewAnswer, now: Date): ReviewStore {
  const grade = REVIEW_ANSWERS.find((x) => x.id === a)!.grade;
  const { card } = scheduler.next(cardFor(store, id, now), now, grade);
  return { ...store, [id]: fromCard(card) };
}

/** 「明日」「3日後」「2週間後」「3か月後」 — distance in Japanese calendar days. */
export function intervalLabel(due: Date, now: Date): string {
  const n = dayNumber(due) - dayNumber(now);
  if (n <= 0) return '今日';
  if (n === 1) return '明日';
  if (n < 7) return `${n}日後`;
  if (n < 30) return `${Math.round(n / 7)}週間後`;
  if (n < 365) return `${Math.round(n / 30)}か月後`;
  return '1年後';
}

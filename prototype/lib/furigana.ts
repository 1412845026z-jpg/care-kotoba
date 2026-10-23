// Furigana (reading aids) for the app's fixed Japanese text: scene titles, contexts, opening lines,
// reference phrases, goals and demo replies. The readings are generated offline (tools/furigana/)
// and stored in a reviewable notation: {漢字|かんじ}. AI-generated replies are not covered.
import { FURIGANA } from './furigana-data';

export type RubySegment = string | { base: string; rt: string };

const NOTATION = /\{([^{}|]+)\|([^{}|]+)\}/g;

/** "{温|あたた}かい" -> ['', {base:'温',rt:'あたた'}, 'かい'] (empty strings removed). */
export function parseRuby(notation: string): RubySegment[] {
  const out: RubySegment[] = [];
  let last = 0;
  for (const m of notation.matchAll(NOTATION)) {
    if (m.index! > last) out.push(notation.slice(last, m.index));
    out.push({ base: m[1], rt: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < notation.length) out.push(notation.slice(last));
  return out;
}

/** The plain text a notation annotates. */
export function plainOf(notation: string): string {
  return notation.replace(NOTATION, '$1');
}

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Ruby segments for a known fixed text, or null when the text has no reviewed annotation.
 * Only the table's OWN string entries count: a note or AI reply that happens to read
 * "constructor", "toString" or "__proto__" must not pick up Object.prototype members.
 */
export function furiganaFor(text: string): RubySegment[] | null {
  if (typeof text !== 'string' || !hasOwn.call(FURIGANA, text)) return null;
  const n: unknown = (FURIGANA as Record<string, unknown>)[text];
  return typeof n === 'string' && n ? parseRuby(n) : null;
}

export const FURIGANA_COVERAGE = Object.keys(FURIGANA).length;

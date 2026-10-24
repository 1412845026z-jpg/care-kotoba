// I18N-CONTENT-QA: what the basic-course sources actually provide per support language, read straight from
// content/ssw-basic (catalog inline <field>_<locale> keys and locales/<locale>.json packs). Tests compare the
// generated app data and the screen against this, so adding a real language pack does not trip a fixed
// "Chinese only" expectation, and a dropped translation is still caught.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SUPPORT = ['zh', 'en', 'vi', 'my', 'id'];
const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function basicSources(repo) {
  const catalog = JSON.parse(readFileSync(join(repo, 'content', 'ssw-basic', 'catalog.json'), 'utf8'));
  const dir = join(repo, 'content', 'ssw-basic', 'locales');
  const packs = {};
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) packs[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const sceneField = (s, field, packField) => SUPPORT.filter((l) => text(field === 'check' ? s.practice?.[`check_${l}`] : s[`${field}_${l}`]) || text(packs[l]?.scenes?.[s.id]?.[packField || field]));
  const lineLangs = (s, i) => SUPPORT.filter((l) => text(s.dialogue[i][l]) || text(packs[l]?.scenes?.[s.id]?.lines?.[i]));
  const topicLangs = (t) => SUPPORT.filter((l) => text(t[`title_${l}`]) || text(packs[l]?.topics?.[t.id]?.title));
  const support = {};
  for (const l of SUPPORT) {
    const n = catalog.scenes.filter((s) => sceneField(s, 'goal').includes(l)).length;
    if (n) support[l] = { status: packs[l]?.status || catalog.status, scenes: n };
  }
  /** The language a learner with this support language sees for explanations, by the app's rule. */
  const shownFor = (locale) => (support[locale] ? locale : ['vi', 'my', 'id'].includes(locale) && support.en ? 'en' : null);
  return { catalog, packs, support, sceneField, lineLangs, topicLangs, shownFor };
}

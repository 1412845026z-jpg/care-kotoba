// Optional preview of the 12 core scenario drafts (content/scenarios, copied by tools/core-scenarios/generate.mjs).
// Shown only when the learner turns on 「コア練習（草稿）」 in settings (or opens the app with ?core=1);
// the regular 48 scenes, their counts and the learning record are unchanged.
// Client-safe: hidden facts and partner branches live in core-scenarios-server.ts (server only).
import { categories, scenes, type Scene, type PartnerInfo, type PartnerKind, type CategoryId } from './content';
import { coreScenarioData, type CoreSkill, type CoreScenarioPublic } from './core-scenarios-data';

export const coreCategory = { id: 'core' as const, name: 'コア練習（草稿）', en: 'Core practice (draft)', icon: 'target', color: 'blue' };

export const coreSkills: Record<CoreSkill, { ja: string; zh: string; en: string; level: 1 | 2 | 3; minutes: number }> = {
  clarification: { ja: '聞き返して確かめる', zh: '听不懂时主动问清', en: 'Ask until it is clear', level: 2, minutes: 3 },
  refusal_respect: { ja: '断りを受け止める', zh: '遇到拒绝时尊重回应', en: 'Respect a refusal', level: 2, minutes: 3 },
  report_certainty: { ja: '確認済みと未確認を分ける', zh: '报告时分清已确认与未确认', en: 'Separate confirmed from unconfirmed', level: 3, minutes: 4 },
};

/** Who the AI plays, from the draft's npc_role_ja. Roles not listed here fall back to a generic staff member (see unit test). */
export const coreCasts: Record<string, { partner: PartnerKind; cast?: PartnerInfo }> = {
  先輩介護職: { partner: 'senior' },
  看護師: { partner: 'nurse' },
  リーダー: { partner: 'senior', cast: { label: 'リーダー', card: 'リーダー（介護職）', short: 'リ', role: 'フロアのリーダー（介護職員）', staff: true } },
  // The drafts do not name the resident; the app does not add a name.
  利用者: { partner: 'resident', cast: { label: '利用者さん', card: '利用者（架空・名前なし）', short: '利', role: '施設の利用者（架空の高齢者。名前は場面に出てこない）', staff: false } },
};

export function toScene(d: CoreScenarioPublic): Scene {
  const skill = coreSkills[d.skill];
  const c = coreCasts[d.role] || { partner: 'colleague' as const, cast: { label: d.role, card: d.role, short: d.role.slice(0, 1), role: d.role, staff: true } };
  return {
    id: d.id, category: 'core', title: d.title, en: `${skill.en} · draft ${d.version}`, action: d.title,
    context: `${d.setting.replace(/[。．.]$/, '')}。${d.known.join('')}`,
    starter: d.opening, phrases: d.examples, goals: d.objectives, level: skill.level, minutes: skill.minutes,
    partner: c.partner, ...(c.cast ? { cast: c.cast } : {}),
    core: { skill: d.skill, version: d.version, status: d.status },
  };
}

export const coreScenes: Scene[] = coreScenarioData.map(toScene);

const baseIds = new Set(scenes.map((s) => s.id));
/** True for the regular 48 scenes (used by progress counts, which must not include the drafts). */
export const isBaseScene = (id: string) => baseIds.has(id);
/** Looks a scene up in both sets (history and notes can point at a core draft even after the preview is turned off). */
export const findScene = (id: unknown): Scene | undefined => typeof id === 'string' ? scenes.find((s) => s.id === id) || coreScenes.find((s) => s.id === id) : undefined;
export const findCategory = (id: CategoryId | string | undefined) => id === 'core' ? coreCategory : categories.find((c) => c.id === id);

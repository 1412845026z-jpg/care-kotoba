// CORE-PREVIEW-001: the 12 core scenario drafts (content/scenarios) as an optional 「コア練習（草稿）」 preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { scenes, categories } from '@/lib/content';
import { coreScenes, coreCasts, coreSkills, findScene, findCategory, isBaseScene, toScene } from '@/lib/core-scenarios';
import { coreScenarioData } from '@/lib/core-scenarios-data';
import { coreScenarioPrivate } from '@/lib/core-scenarios-server';
import { context } from '@/lib/ai-server';
import { quote } from '@/lib/core-prompt';

const repo = join(process.cwd(), '..');
const readRepo = (p) => readFileSync(join(repo, p), 'utf8');
const sources = readdirSync(join(repo, 'content', 'scenarios')).filter((f) => /^CK-.+\.json$/.test(f)).map((f) => JSON.parse(readRepo(`content/scenarios/${f}`)));

test('generated files match content/scenarios (rerun tools/core-scenarios/generate.mjs after content changes)', () => {
  const r = spawnSync(process.execPath, [join(repo, 'tools', 'core-scenarios', 'generate.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

test('12 core drafts, separate from the regular 48 scenes and their 8 fields', () => {
  assert.equal(coreScenes.length, sources.length);
  assert.equal(coreScenes.length, 12);
  assert.equal(new Set(coreScenes.map((s) => s.id)).size, 12);
  assert.equal(scenes.length, 48, 'the regular scene list is unchanged');
  assert.equal(categories.length, 8, 'the core category is not one of the regular fields');
  for (const s of coreScenes) {
    assert.equal(s.category, 'core');
    assert.ok(!isBaseScene(s.id), `${s.id} must not count as a regular scene`);
    assert.ok(s.core && coreSkills[s.core.skill], s.id);
    assert.ok(s.phrases.length && s.goals.length && s.starter && s.context, s.id);
  }
  assert.equal(coreScenes.filter((s) => s.core.skill === 'clarification').length, 4);
  assert.equal(coreScenes.filter((s) => s.core.skill === 'refusal_respect').length, 4);
  assert.equal(coreScenes.filter((s) => s.core.skill === 'report_certainty').length, 4);
});

test('every draft role maps to a defined partner; the unnamed resident gets no invented name', () => {
  for (const d of coreScenarioData) assert.ok(coreCasts[d.role], `npc_role_ja "${d.role}" (${d.id}) has no entry in coreCasts`);
  const r01 = findScene('CK-R01');
  assert.equal(r01.partner, 'resident');
  assert.equal(r01.cast.label, '利用者さん');
  assert.equal(findScene('CK-C04').cast.label, 'リーダー');
  assert.equal(findScene('CK-P01').partner, 'nurse');
  assert.equal(findScene('CK-C01').partner, 'senior');
  // An unknown role falls back to a generic staff member named by the role itself.
  const odd = toScene({ ...coreScenarioData[0], id: 'CK-X99', role: '相談員' });
  assert.equal(odd.cast.label, '相談員');
  assert.equal(odd.cast.staff, true);
});

test('learner-facing data has no hidden facts, branches or Chinese 学員', () => {
  const client = readFileSync(join(process.cwd(), 'lib', 'core-scenarios-data.ts'), 'utf8');
  for (const src of sources) {
    for (const h of src.hidden_information) assert.ok(!client.includes(h.fact_ja), `${h.id} leaked into the browser data`);
    for (const b of src.conversation_branches) assert.ok(!client.includes(b.trigger_zh), `${b.id} trigger leaked`);
  }
  assert.ok(!/学員/.test(JSON.stringify(coreScenarioData)), '学員 is shown to learners as あなた');
  assert.ok(findScene('CK-P03').context.includes('あなたは居室の床に座っている利用者を見つけた'));
  // Client modules must not import the server-only files.
  for (const f of ['app/page.tsx', 'components/practice.tsx', 'components/ui.tsx', 'components/line-drill.tsx', 'lib/core-scenarios.ts', 'lib/content.ts']) {
    const text = readFileSync(join(process.cwd(), f), 'utf8');
    assert.ok(!/(from|import)\s*\(?\s*['"][^'"]*(core-scenarios-server|core-prompt)['"]/.test(text), `${f} imports a server-only core module`);
  }
  assert.deepEqual(Object.keys(coreScenarioPrivate).sort(), coreScenes.map((s) => s.id).sort());
});

test('scene context is setting + what the learner knows; lookups cover both sets', () => {
  const c01 = findScene('CK-C01');
  assert.equal(c01.context, '午前の申し送り後、職員室。木村さんという利用者がいる。先輩から「準備」を頼まれたが、何の準備かは説明されていない。');
  assert.equal(c01.starter, '木村さんの準備、いつもどおりお願い。');
  assert.equal(findScene('bath-5').category, 'bath');
  for (const bad of ['constructor', '__proto__', undefined, null, 42, 'CK-Z00']) assert.equal(findScene(bad), undefined, String(bad));
  assert.equal(findCategory('core').name, 'コア練習（草稿）');
  assert.equal(findCategory('bath').name, '入浴・清潔');
  assert.equal(findCategory('nope'), undefined);
});

test('AI instructions for a core draft keep hidden facts behind branches and the partner in character', () => {
  const ctx = context({ scenarioId: 'CK-C01', variant: 'decline', locale: 'zh', level: 'gentle' });
  const i = ctx.instructions;
  assert.ok(i.includes('10時の家族面会で使う写真アルバム'), 'the partner knows the hidden fact');
  assert.ok(i.includes('Reveal a hidden fact only when'), 'reveal rule');
  assert.ok(i.includes('reveals CK-C01-H1') && i.includes('reveals nothing'), 'branches say what they reveal');
  assert.ok(i.includes('never put it into suggestions or corrections'));
  assert.ok(i.includes('Stay in character') && i.includes('coaching belongs to the feedback'), 'coach-like reference replies are not spoken as a coach');
  assert.ok(i.includes('shorter separate parts'), 'a request to slow down is really honoured');
  assert.ok(i.includes('Role: 先輩の介護職員'));
  assert.ok(i.includes('Opening line (your first utterance in this scene): 「木村さんの準備、いつもどおりお願い。」'), 'voice sessions append 最初の発話（Opening line）を一度だけ話して, so the opening must be named, not marked as already said');
  assert.ok(!i.includes('最初は提案を断る'), 'the variant instruction is ignored for core drafts');
  assert.ok(i.includes('N4程度'));
  assert.ok(i.includes('简体中文'));
  assert.ok(i.includes('untrusted conversation content'));
  assert.ok(ctx.feedbackNotes.includes('never expect the learner to know or guess it'));
  assert.ok(ctx.feedbackNotes.includes('只根据实际学员发话'), 'scene feedback rules are passed on');
  assert.ok(ctx.feedbackNotes.includes('はい、いつもの薬を準備します。'), 'counterexamples are passed on as patterns');
});

test('refusal drafts: accepting the refusal is success; pressure is not rewarded', () => {
  const ctx = context({ scenarioId: 'CK-R04', variant: 'gentle', locale: 'en', level: 'challenge' });
  assert.ok(ctx.instructions.includes('finding out the reason is NOT required'));
  assert.ok(ctx.instructions.includes('keep declining politely and do not give in'));
  assert.ok(ctx.instructions.includes('Role: 施設の利用者（架空の高齢者。名前は場面に出てこない）'));
  assert.ok(ctx.instructions.includes('N3程度') && ctx.instructions.includes('English'));
  assert.ok(ctx.feedbackNotes.includes('never require the learner to find out the reason'));
});

test('report drafts: no invented causes; resumed voice sessions keep the history', () => {
  const ctx = context({ scenarioId: 'CK-P03', locale: 'ja' }, { history: [{ role: 'user', text: '床に座っていました。' }] });
  assert.ok(ctx.instructions.includes('Never supply causes, diagnoses'));
  assert.ok(ctx.instructions.includes('学習者: 床に座っていました。'));
  assert.ok(ctx.instructions.includes('Do not repeat the opening line'));
});

test('regular scenes are unchanged: variant instruction, no core notes', () => {
  const ctx = context({ scenarioId: 'bath-5', variant: 'decline', locale: 'zh', level: 'gentle' });
  assert.ok(ctx.instructions.includes('最初は提案を断る'));
  assert.ok(!ctx.instructions.includes('Hidden facts'));
  assert.equal(ctx.feedbackNotes, '');
  assert.throws(() => context({ scenarioId: 'constructor' }), /SCENE_NOT_FOUND/);
});

test('multi-line draft replies are quoted on one line in the instructions', () => {
  assert.equal(quote('一つずつ言いますね。\n面会用の写真アルバムです。\n談話室に置いてください。'), '「一つずつ言いますね。 / 面会用の写真アルバムです。 / 談話室に置いてください。」');
  assert.equal(quote('今日はお風呂に入りたくないです。'), '「今日はお風呂に入りたくないです。」');
});

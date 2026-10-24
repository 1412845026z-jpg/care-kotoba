#!/usr/bin/env node
// Copies the core scenario drafts (content/scenarios/CK-*.json, owned by the content side) into the app.
//
//   prototype/lib/core-scenarios-data.ts    learner-facing fields only (bundled into the browser app)
//   prototype/lib/core-scenarios-server.ts  hidden facts, partner branches, counterexamples, feedback
//                                           rules, transfer task (imported only by server code, so the
//                                           hidden facts are not shipped to the browser)
//
// content/ stays the single source: never edit the generated files by hand, change content/ and rerun.
// Usage (from the repository root, no dependencies):
//   node tools/core-scenarios/generate.mjs           write both files
//   node tools/core-scenarios/generate.mjs --check   exit 1 if the committed files are out of date
//
// Learner-facing display wording (browser file only; the server file keeps the content wording; counted on every run):
//   learner_known_ja describes the learner in the third person (「学習者は…」, earlier drafts 「学員は…」, a Chinese
//   word). The app shows these lines to the learner as the scene description, so they read 「あなたは…」.
//   Any remaining 「学員」 elsewhere also becomes 「あなた」.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const srcDir = join(repo, 'content', 'scenarios');
const outPublic = join(repo, 'prototype', 'lib', 'core-scenarios-data.ts');
const outServer = join(repo, 'prototype', 'lib', 'core-scenarios-server.ts');
const check = process.argv.includes('--check');

const SKILLS = ['clarification', 'refusal_respect', 'report_certainty'];
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };
const str = (v) => typeof v === 'string' && v.trim().length > 0;
const strList = (v) => Array.isArray(v) && v.length > 0 && v.every(str);

const files = readdirSync(srcDir).filter((f) => /^CK-[A-Z]\d{2}\.json$/.test(f)).sort();
need(files.length > 0, `no CK-*.json files in ${srcDir}`);
const hash = createHash('sha256');
let displayEdits = 0;
const swap = (s, re, to) => { const n = (s.match(re) || []).length; displayEdits += n; return n ? s.replace(re, to) : s; };
const toDisplay = (s) => swap(s, /学員/g, 'あなた');
const knownToDisplay = (s) => toDisplay(swap(s, /学習者は/g, 'あなたは'));

const pub = [], priv = {};
for (const f of files) {
  const raw = readFileSync(join(srcDir, f), 'utf8');
  hash.update(f + '\0' + raw + '\0');
  let d;
  try { d = JSON.parse(raw); } catch (e) { problems.push(`${f}: invalid JSON (${e.message})`); continue; }
  const at = (k) => `${f}: ${k}`;
  need(d.id === f.replace(/\.json$/, ''), at(`id "${d.id}" does not match the file name`));
  need(str(d.version), at('version'));
  need(d.fictional === true, at('fictional must be true (all training uses fictional cases)'));
  need(SKILLS.includes(d.primary_skill), at(`primary_skill must be one of ${SKILLS.join(', ')}`));
  for (const k of ['title_ja', 'setting_ja', 'npc_role_ja', 'opening_ja']) need(str(d[k]), at(k));
  for (const k of ['learning_objectives_ja', 'learner_known_ja', 'feedback_rules_zh']) need(strList(d[k]), at(`${k} (non-empty list of strings)`));
  const hidden = Array.isArray(d.hidden_information) ? d.hidden_information : [];
  need(hidden.every((h) => str(h?.id) && str(h?.fact_ja)), at('hidden_information[].id / fact_ja'));
  const hiddenIds = new Set(hidden.map((h) => h?.id));
  const branches = Array.isArray(d.conversation_branches) ? d.conversation_branches : [];
  need(branches.length > 0, at('conversation_branches (at least one)'));
  for (const b of branches) {
    need(str(b?.id) && str(b?.trigger_zh) && str(b?.npc_reply_ja) && str(b?.coach_rule_zh), at(`branch ${b?.id}: id / trigger_zh / npc_reply_ja / coach_rule_zh`));
    need(Array.isArray(b?.reveals) && b.reveals.every((r) => hiddenIds.has(r)), at(`branch ${b?.id}: reveals must list hidden_information ids`));
  }
  const examples = Array.isArray(d.examples) ? d.examples : [];
  need(examples.length > 0 && examples.every((e) => str(e?.learner_ja)), at('examples[].learner_ja'));
  const counter = Array.isArray(d.counterexamples) ? d.counterexamples : [];
  need(counter.every((c) => str(c?.learner_ja) && str(c?.why_problematic_ja)), at('counterexamples[].learner_ja / why_problematic_ja'));
  need(str(d.transfer_task?.prompt_ja) && strList(d.transfer_task?.expected_intents_ja), at('transfer_task.prompt_ja / expected_intents_ja'));
  if (problems.length) continue;

  pub.push({
    id: d.id, version: d.version, status: String(d.status || 'draft'), skill: d.primary_skill,
    title: toDisplay(d.title_ja), setting: toDisplay(d.setting_ja), role: d.npc_role_ja, opening: toDisplay(d.opening_ja),
    objectives: d.learning_objectives_ja.map(toDisplay), known: d.learner_known_ja.map(knownToDisplay),
    examples: examples.map((e) => toDisplay(e.learner_ja)),
  });
  priv[d.id] = {
    // Content wording (third person) for the AI instructions: in them 「あなた」 would read as the AI partner itself.
    learnerKnown: d.learner_known_ja,
    hidden: hidden.map((h) => ({ id: h.id, fact: h.fact_ja })),
    branches: branches.map((b) => ({ id: b.id, trigger: b.trigger_zh, reply: b.npc_reply_ja, reveals: b.reveals, coach: b.coach_rule_zh })),
    counterexamples: counter.map((c) => ({ text: c.learner_ja, why: c.why_problematic_ja })),
    feedbackRules: d.feedback_rules_zh,
    transfer: { prompt: d.transfer_task.prompt_ja, intents: d.transfer_task.expected_intents_ja },
  };
}
need(new Set(pub.map((p) => p.id)).size === pub.length, 'duplicate scenario ids');

if (problems.length) {
  console.error(`core scenarios: ${problems.length} problem(s) in content/scenarios — nothing written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

const fingerprint = hash.digest('hex');
const header = (what) => `// GENERATED by tools/core-scenarios/generate.mjs from content/scenarios (${files.length} files, sha256 ${fingerprint.slice(0, 16)}).
// Do not edit by hand: change content/scenarios and rerun the generator. ${what}
// Status: drafts pending review by care professionals and Japanese teachers; fictional cases only.
`;
const publicTs = `${header('Learner-facing fields only; this file is bundled into the browser app.')}
export type CoreSkill = 'clarification' | 'refusal_respect' | 'report_certainty';
export type CoreScenarioPublic = { id: string; version: string; status: string; skill: CoreSkill; title: string; setting: string; role: string; opening: string; objectives: string[]; known: string[]; examples: string[] };
export const CORE_SOURCE = { files: ${files.length}, sha256: '${fingerprint}' } as const;
export const coreScenarioData: CoreScenarioPublic[] = ${JSON.stringify(pub, null, 2)};
`;
const serverTs = `${header('SERVER ONLY: hidden facts must not be imported by client components.')}
export type CoreScenarioPrivate = {
  learnerKnown: string[];
  hidden: { id: string; fact: string }[];
  branches: { id: string; trigger: string; reply: string; reveals: string[]; coach: string }[];
  counterexamples: { text: string; why: string }[];
  feedbackRules: string[];
  transfer: { prompt: string; intents: string[] };
};
export const CORE_SERVER_SOURCE_SHA256 = '${fingerprint}';
export const coreScenarioPrivate: Record<string, CoreScenarioPrivate> = ${JSON.stringify(priv, null, 2)};
`;

const outputs = [[outPublic, publicTs], [outServer, serverTs]];
const note = displayEdits ? ` (learner-facing wording: 学習者は/学員→あなた ×${displayEdits})` : '';
if (check) {
  const stale = outputs.filter(([p, t]) => !existsSync(p) || readFileSync(p, 'utf8') !== t).map(([p]) => p.slice(repo.length + 1));
  if (stale.length) { console.error(`core scenarios out of date: ${stale.join(', ')}\nRun: node tools/core-scenarios/generate.mjs`); process.exit(1); }
  console.log(`core scenarios up to date: ${pub.length} scenarios, sha256 ${fingerprint.slice(0, 16)}${note}`);
} else {
  for (const [p, t] of outputs) writeFileSync(p, t);
  console.log(`wrote ${outputs.map(([p]) => p.slice(repo.length + 1)).join(', ')}: ${pub.length} scenarios${note}`);
}

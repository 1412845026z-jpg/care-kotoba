import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHistory, sanitizeNotes, sanitizePrefs, sanitizeAssignments, DEFAULT_PREFS } from '@/lib/storage';
import { scenes, partners, partnerOf } from '@/lib/content';
import { context } from '@/lib/ai-server';

test('storage sanitisers turn garbage into safe defaults', () => {
  for (const bad of [null, undefined, 42, 'x', { a: 1 }]) {
    assert.deepEqual(sanitizeHistory(bad), []);
    assert.deepEqual(sanitizeNotes(bad), []);
    assert.deepEqual(sanitizeAssignments(bad), []);
    assert.deepEqual(sanitizePrefs(bad), DEFAULT_PREFS);
  }
});

test('history keeps valid records (even for unknown scenes) and clamps numbers', () => {
  const h = sanitizeHistory([
    { id: '1', sceneId: 'bath-5', date: '2026-10-23T10:00:00Z', minutes: 3, score: 72, demo: false },
    { id: '2', sceneId: 'renamed-scene', date: '2026-10-23T10:00:00Z', minutes: 9999, score: 500 },
    { id: '3', sceneId: 'bath-5', date: 'not a date', minutes: 1 },
    null, 'x', { id: '4' },
  ]);
  assert.deepEqual(h.map((r) => r.id), ['1', '2']);
  assert.equal(h[1].minutes, 600);
  assert.equal(h[1].score, 100);
  assert.equal(h[1].demo, false);
});

test('prefs only accept known values', () => {
  assert.deepEqual(sanitizePrefs({ locale: 'en', level: 'challenge', goal: '10', plan: 'company' }), { locale: 'en', level: 'challenge', goal: 10, plan: 'company' });
  assert.deepEqual(sanitizePrefs({ locale: 'xx', goal: 7 }), DEFAULT_PREFS);
});

test('48 scenes with unique ids, each with a defined conversation partner', () => {
  assert.equal(scenes.length, 48);
  assert.equal(new Set(scenes.map((s) => s.id)).size, 48);
  for (const s of scenes) assert.ok(partners[s.partner], s.id);
});

test('staff-to-staff scenes are played by staff and get team-communication goals', () => {
  for (const id of ['meal-6', 'toilet-6', 'move-5', 'report-6']) {
    const s = scenes.find((x) => x.id === id);
    assert.ok(partnerOf(s).staff, id);
    assert.ok(s.goals.includes('事実と推測を分ける'), id);
  }
  assert.equal(scenes.find((x) => x.id === 'bath-5').partner, 'resident');
  assert.equal(scenes.find((x) => x.id === 'report-1').partner, 'nurse');
});

test('AI instructions use the scene partner, not the category default', () => {
  const meal6 = context({ scenarioId: 'meal-6', variant: 'gentle', locale: 'zh' }).instructions;
  assert.ok(meal6.includes('Role: 同じ施設の同僚の介護職員'));
  assert.ok(!meal6.includes('施設利用者の佐藤さん（架空）'));
  const bath5 = context({ scenarioId: 'bath-5', variant: 'gentle', locale: 'zh' }).instructions;
  assert.ok(bath5.includes('Role: 施設利用者の佐藤さん（架空）'));
});

test('resume history is embedded as untrusted transcript and unknown locales fall back', () => {
  const c = context({ scenarioId: 'bath-5', locale: 'fr' }, { history: [{ role: 'user', text: '温かいタオルを用意しました。' }] });
  assert.equal(c.locale, 'zh');
  assert.ok(c.instructions.includes('学習者: 温かいタオルを用意しました。'));
  assert.ok(c.instructions.includes('untrusted transcript'));
  assert.throws(() => context({ scenarioId: 'nope' }));
});

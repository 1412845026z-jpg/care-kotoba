// SCENE-AV-APP-001: the media index is checked before use; only our own /media/ssw/ files are played or shown,
// and "listen to the whole exchange" never reaches the reference answer before it is revealed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMediaIndex, safeSrc, playableTurns, statusLabel } from '@/lib/scene-media';

test('a valid index keeps pictures, line clips and alternatives', () => {
  const m = sanitizeMediaIndex({
    version: 1, status: 'draft_not_listened', credits: ['Voices: example (CC BY 4.0)'],
    scenes: { 'SSW-S02': {
      image: { src: '/media/ssw/SSW-S02/scene.webp', width: 1536, height: 1024, alt_ja: '居室のドアの前に立つ職員', credit: '生成画像（架空の人物）' },
      lines: [{ turn: 0, src: '/media/ssw/SSW-S02/t0.mp3', voice: 'worker_f', style: 'warm_greeting' }, { turn: 2, src: '/media/ssw/SSW-S02/t2.mp3' }],
      alternatives: [{ text: 'はい、失礼します。', src: '/media/ssw/SSW-S02/alt1.mp3' }],
    } },
  });
  const s = m.scenes['SSW-S02'];
  assert.equal(s.status, 'draft_not_listened', 'scene inherits the index status');
  assert.deepEqual(s.image, { src: '/media/ssw/SSW-S02/scene.webp', width: 1536, height: 1024, altJa: '居室のドアの前に立つ職員', credit: '生成画像（架空の人物）' });
  assert.deepEqual(Object.keys(s.lines), ['0', '2']);
  assert.equal(s.lines[0].voice, 'worker_f');
  assert.equal(s.alternatives['はい、失礼します。'].src, '/media/ssw/SSW-S02/alt1.mp3');
  assert.deepEqual(m.credits, ['Voices: example (CC BY 4.0)']);
});

test('anything that is not our own static media is dropped, never thrown', () => {
  for (const bad of ['https://example.com/a.mp3', '//example.com/a.mp3', '/media/ssw/../secret.mp3', '/media/other/a.mp3', 'javascript:alert(1)', '/media/ssw/a.mp3?x=1', '/media/ssw/a.exe', '/media/ssw//a.mp3', 42, null])
    assert.equal(safeSrc(bad, 'audio'), null, String(bad));
  assert.equal(safeSrc('/media/ssw/SSW-S02/t0.mp3', 'image'), null, 'audio file is not an image');
  const m = sanitizeMediaIndex({ scenes: {
    'SSW-S03': { image: { src: '/media/ssw/x.webp', width: 10, height: 10 } }, // no alt text: not shown
    'SSW-S04': { lines: [{ turn: 99, src: '/media/ssw/a.mp3' }, { turn: -1, src: '/media/ssw/b.mp3' }, { turn: 1.5, src: '/media/ssw/c.mp3' }] },
    'bath-5': { lines: [{ turn: 0, src: '/media/ssw/a.mp3' }] },
    'SSW-S05': 'x',
  } });
  assert.deepEqual(m.scenes, {});
  for (const raw of [null, [], 'x', { scenes: [] }, { scenes: null }]) assert.deepEqual(sanitizeMediaIndex(raw).scenes, {});
});

test('whole-exchange playback stops before the learner\'s line until the answer is shown', () => {
  assert.deepEqual(playableTurns(4, 2, false), [0, 1]);
  assert.deepEqual(playableTurns(4, 2, true), [0, 1, 2, 3]);
  assert.deepEqual(playableTurns(4, 0, false), []);
  assert.deepEqual(playableTurns(3, 9, false), [0, 1, 2]);
});

test('the recording label never claims a listening check that the content does not state', () => {
  assert.equal(statusLabel('draft_not_listened'), '録音（試聴確認前）');
  assert.equal(statusLabel(''), '録音（試聴確認前）');
  assert.equal(statusLabel('draft_pending_expert_review'), '録音（試聴確認前）');
  assert.equal(statusLabel('listened_ok'), '録音');
});

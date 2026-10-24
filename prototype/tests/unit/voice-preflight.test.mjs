import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdict, overall } from '@/lib/voice-preflight';

const good = {
  support: { secureContext: true, getUserMedia: true, rtc: true, audioContext: true },
  server: { reachable: true, ms: 120, aiConfigured: true, accessRequired: false, accessGranted: false },
  ice: { total: 2, host: 2, srflx: 0, relay: 0, ms: 40 },
  mic: { granted: true, peak: 0.2, label: 'Built-in' },
  speaker: { heard: true },
};

test('all checks passing gives ok', () => {
  const items = verdict(good);
  assert.deepEqual(items.map((i) => [i.id, i.status]), [['support', 'ok'], ['server', 'ok'], ['ice', 'ok'], ['mic', 'ok'], ['speaker', 'ok']]);
  assert.equal(overall(items), 'ok');
});

test('typical phone problems are reported with a next step, never as an AI or skill judgement', () => {
  const cases = [
    [{ support: { ...good.support, secureContext: false } }, 'support', 'fail', /https/],
    [{ server: { reachable: false } }, 'server', 'fail', /接続できません/],
    [{ server: { ...good.server, aiConfigured: false } }, 'server', 'warn', /デモ/],
    [{ server: { ...good.server, accessRequired: true, accessGranted: false } }, 'server', 'warn', /アクセスコード/],
    [{ server: { ...good.server, ms: 2400 } }, 'server', 'warn', /遅め/],
    [{ ice: { total: 0, host: 0, srflx: 0, relay: 0, ms: 2500 } }, 'ice', 'fail', /VPN/],
    [{ mic: { granted: false, error: 'NotAllowedError' } }, 'mic', 'fail', /許可/],
    [{ mic: { granted: false, error: 'NotFoundError' } }, 'mic', 'fail', /見つかりません/],
    [{ mic: { granted: true, peak: 0.001 } }, 'mic', 'warn', /ほとんど入っていません/],
    [{ speaker: { heard: false } }, 'speaker', 'fail', /音量/],
    [{ speaker: { heard: null } }, 'speaker', 'skipped', /まだ/],
  ];
  for (const [partial, id, status, re] of cases) {
    const item = verdict({ ...good, ...partial }).find((i) => i.id === id);
    assert.equal(item.status, status, `${id} ${JSON.stringify(partial)}`);
    assert.match(item.detail, re);
    assert.doesNotMatch(item.detail, /発音|能力|合格/);
  }
  assert.equal(overall(verdict({ ...good, mic: { granted: true, peak: 0.001 } })), 'warn');
  assert.equal(overall(verdict({ ...good, speaker: { heard: false } })), 'fail');
  assert.equal(overall([]), 'skipped');
});

test('every message has help in Chinese and English for learners; Japanese UI shows none', () => {
  const variants = [good, { support: { ...good.support, rtc: false } }, { server: { reachable: false } }, { server: { ...good.server, aiConfigured: false } }, { server: { ...good.server, accessRequired: true } }, { server: { ...good.server, ms: 3000 } }, { ice: { total: 0, host: 0, srflx: 0, relay: 0, ms: 1, error: 'NotSupportedError' } }, { ice: { total: 0, host: 0, srflx: 0, relay: 0, ms: 1 } }, { mic: { granted: false, error: 'NotAllowedError' } }, { mic: { granted: false, error: 'NotFoundError' } }, { mic: { granted: false, error: 'AbortError' } }, { mic: { granted: true, peak: 0 } }, { speaker: { heard: false } }, { speaker: { heard: null } }];
  for (const v of variants) {
    for (const locale of ['zh', 'en', 'vi', 'my', 'id']) for (const i of verdict({ ...good, ...v }, locale)) assert.ok(i.help && i.help.length > 4, `${locale} ${i.key}`);
    for (const i of verdict({ ...good, ...v }, 'ja')) assert.equal(i.help, undefined);
  }
});

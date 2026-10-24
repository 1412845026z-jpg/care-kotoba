import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextBefore } from '@/lib/drill';

const conv = [
  { role: 'assistant', text: '今日は入りたくないの。' },
  { role: 'user', text: '今日は、入りたくないのですね。' },
  { role: 'assistant', text: 'そうなのよ。' },
  { role: 'user', text: '何か気になることはありますか。' },
];

test('the drill replays the moment just before the corrected line', () => {
  assert.deepEqual(contextBefore(conv, '何か気になることはありますか'), conv.slice(0, 3));
  assert.deepEqual(contextBefore(conv, '今日は入りたくないのですね。'), conv.slice(0, 1), 'punctuation differences are ignored');
  assert.deepEqual(contextBefore(conv, '入りたくない'), conv.slice(0, 1), 'a part of the line also works; partner lines are not matched');
  assert.deepEqual(contextBefore(conv, 'まったく別の文'), conv, 'unknown original: whole conversation');
  assert.deepEqual(contextBefore(conv, 'ね'), conv, 'too short to locate');
});

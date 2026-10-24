// Node 22 --experimental-strip-types; no app files are modified.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const [repoArg = '.', outArg = 'verification/AUDIO-SAMPLES-001'] = process.argv.slice(2);
const repo = resolve(repoArg), out = resolve(outArg);
const content = join(repo, 'prototype/lib/content.ts');
const { scenes } = await import(pathToFileURL(content).href);
const selection = [['daily-1', 0], ['daily-5', 0], ['handover-2', 2], ['report-1', 1], ['report-3', 1]];
const sentences = selection.map(([sceneId, phraseIndex], i) => {
  const scene = scenes.find(scene => scene.id === sceneId);
  const text = scene?.phrases[phraseIndex];
  if (typeof text !== 'string' || !text.trim()) throw new Error(`Missing reference phrase: ${sceneId}[${phraseIndex}]`);
  return { id: `s${i + 1}`, sceneId, phraseIndex, text };
});
if (sentences[2].text !== 'この理解で、合っていますか。') throw new Error('Reference example changed; review before generating.');
await mkdir(out, { recursive: true });
await writeFile(join(out, 'sentences.json'), JSON.stringify({
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  sourcePath: 'prototype/lib/content.ts',
  sourceSha256: createHash('sha256').update(await readFile(content)).digest('hex'),
  note: 'Existing learner reference phrases, identical text for all voices. Elderly voice timbre comparison is not NPC dialogue validation.',
  sentences,
}, null, 2) + '\n');
console.log(JSON.stringify({ sentences: sentences.length, output: join(out, 'sentences.json') }));

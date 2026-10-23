// Diagnostic only. Imports the reviewed signing code; no server, key, or API.
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2]);
const report = resolve(process.argv[3]);
const require = createRequire(join(root, 'package.json'));
const esbuild = require('esbuild');
const temp = mkdtempSync(join(tmpdir(), 'ck-cookie-'));
try {
  const bundle = join(temp, 'signing.mjs');
  esbuild.buildSync({ entryPoints: [join(root, 'lib/signing.ts')], outfile: bundle, bundle: true, platform: 'node', format: 'esm', target: 'node22', logLevel: 'error' });
  const { signToken, verifyToken, fromB64url } = await import(pathToFileURL(bundle));
  const secret = 'diagnostic-only-not-a-real-secret';
  let token, counter;
  for (counter = 0; counter < 512; counter++) {
    token = await signToken(secret, 'access', { sub: 'fictional', exp: 1900000000, counter });
    if (token.endsWith('A')) break;
  }
  if (!token.endsWith('A')) throw new Error('Could not find the deterministic fixture');
  const alias = token.slice(0, -1) + 'B';
  const parts = token.split('.');
  const signature = parts[3];
  parts[3] = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
  const changedSignature = parts.join('.');
  const a = fromB64url(token.split('.')[3]), b = fromB64url(alias.split('.')[3]);
  const originalPayload = await verifyToken(secret, 'access', token);
  const aliasPayload = await verifyToken(secret, 'access', alias);
  const result = {
    fixtureCounter: counter,
    originalLastCharacter: 'A', aliasLastCharacter: 'B',
    signatureBytesEqual: Buffer.from(a).equals(Buffer.from(b)),
    originalAccepted: originalPayload !== null,
    aliasAccepted: aliasPayload !== null,
    sameVerifiedPayload: JSON.stringify(originalPayload) === JSON.stringify(aliasPayload),
    changedSignatureBytesRejected: (await verifyToken(secret, 'access', changedSignature)) === null,
    interpretation: 'The existing test can alter unused base64 pad bits without changing HMAC bytes. This needs a valid signed token; this diagnostic does not show unauthenticated access or a forged payload.',
  };
  writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  rmSync(temp, { recursive: true, force: true });
}

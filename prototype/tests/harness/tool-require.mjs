// Resolve tooling packages (esbuild, react, playwright, ...) from the project's
// node_modules first and fall back to CK_TOOL_NODE_MODULES. The fallback exists
// for sandboxes where `pnpm install` cannot reach the npm registry but a
// machine-wide set of packages is available.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const projectModules = join(projectRoot, 'node_modules');
const fallbackModules = process.env.CK_TOOL_NODE_MODULES || '';

export function moduleDirs() {
  return [projectModules, fallbackModules].filter((d) => d && existsSync(d));
}

export function toolRequire(name) {
  const errors = [];
  for (const dir of moduleDirs()) {
    try {
      return createRequire(join(dir, 'noop.js'))(name);
    } catch (e) {
      errors.push(`${dir}: ${e.code || e.message}`);
    }
  }
  throw new Error(`Cannot resolve "${name}". Run pnpm install, or set CK_TOOL_NODE_MODULES. Tried: ${errors.join('; ') || 'no module dirs'}`);
}

export function toolResolve(name) {
  for (const dir of moduleDirs()) {
    try {
      return createRequire(join(dir, 'noop.js')).resolve(name);
    } catch {}
  }
  throw new Error(`Cannot resolve "${name}"`);
}

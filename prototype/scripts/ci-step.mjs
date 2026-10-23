import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Expected a command and arguments');
const label = [command, ...args].join(' ');
const started = performance.now();
console.log(`Running: ${label}`);
const child = spawn(command, args, { stdio: 'inherit', shell: false });
let finished = false;
function finish(code, detail = '') {
  if (finished) return;
  finished = true;
  const seconds = ((performance.now() - started) / 1000).toFixed(3);
  console.log(`Result: ${label}; exit=${code}; elapsed=${seconds}s${detail}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- \`${label}\`: exit ${code}, ${seconds}s${detail}\n`);
  }
  process.exitCode = code;
}
child.once('error', error => finish(1, `; ${error.message}`));
child.once('exit', (code, signal) => finish(code ?? 1, signal ? `; signal=${signal}` : ''));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));

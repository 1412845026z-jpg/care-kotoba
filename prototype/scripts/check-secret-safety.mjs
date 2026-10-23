import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
try{execFileSync('git',['check-ignore','--quiet','.env.local'],{cwd:root,stdio:'ignore'});}catch{throw Error('Local environment must be ignored before publication.');}
const line=readFileSync(path.join(root,'.env.local'),'utf8').split('\n').find(s=>s.startsWith('OPENAI_API_KEY='));
if(!line)throw Error('Expected confirmed local configuration was not found.');
const secret=Buffer.from(line.slice(15));
function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else if(entry.isFile()&&readFileSync(p).includes(secret))throw Error('Secret found in build output; publication blocked.');}}
if(!existsSync(path.join(root,'dist')))throw Error('Build output is missing.');
scan(path.join(root,'dist'));console.log('Secret safety passed: local configuration is ignored and build output contains no plaintext API key.');

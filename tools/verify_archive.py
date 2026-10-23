from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'ARCHIVE_MANIFEST.json').read_text())
errors=[]
patterns=[rb'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}',rb'(?:ghp_|github_pat_)[A-Za-z0-9_]{25,}',rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}']
for item in manifest['files']:
 p=root/item['path']
 if not p.is_file():errors.append('Missing file: '+item['path']);continue
 data=p.read_bytes()
 if hashlib.sha256(data).hexdigest()!=item['sha256']:errors.append('Checksum mismatch: '+item['path'])
 if any(re.search(pattern,data) for pattern in patterns):errors.append('Possible secret: '+item['path'])
 if any(s in {'.git','node_modules','.sites-runtime','.wrangler'} for s in p.relative_to(root).parts):errors.append('Excluded path: '+item['path'])
 if p.name.startswith(('.env','.dev.vars')):errors.append('Environment file: '+item['path'])
source=json.loads((root/'verification/SOURCE_FILES_SHA256.json').read_text())
if len(source)!=130:errors.append('Unexpected original source count')
for item in source:
 if hashlib.sha256((root/item['path']).read_bytes()).hexdigest()!=item['sha256']:errors.append('Original source changed: '+item['path'])
print(json.dumps({'status':'failed' if errors else 'passed','files_checked':len(manifest['files']),'original_source_files':len(source),'errors':errors},ensure_ascii=False,indent=2))
sys.exit(bool(errors))

#!/usr/bin/env python3
"""Build a self-contained, offline review page from fictional repository drafts."""
import hashlib
import json
from pathlib import Path
import sys

root=Path(__file__).resolve().parents[2]
files=sorted((root/'content/scenarios').glob('CK-*.json'))+[
 root/'content/terminology/terms.json',root/'content/terminology/scenario-map.json',
 root/'evals/samples.jsonl',root/'evals/source-confidence/samples.jsonl']
assert len(files)==16,'Expected 12 scenes and four linked data files'
fingerprints={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
digest=hashlib.sha256(json.dumps(fingerprints,sort_keys=True).encode()).hexdigest()
data={'version':'0.1.0','source_digest':digest,'source_files_sha256':fingerprints,
 'scenarios':[json.loads(p.read_text()) for p in files[:12]],
 'terms':json.loads(files[12].read_text()),'term_map':json.loads(files[13].read_text()),
 'evals':[json.loads(x) for x in files[14].read_text().splitlines() if x.strip()],
 'pairs':[json.loads(x) for x in files[15].read_text().splitlines() if x.strip()]}
template=(root/'content/review/template.html').read_text()
assert template.count('__CARE_KOTOBA_DATA__')==1
payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html=template.replace('__CARE_KOTOBA_DATA__',payload)
out=root/'content/review/index.html'
if '--check' in sys.argv:
 assert out.exists() and out.read_text()==html,'Review page is stale; run python3 content/review/build.py'
 print(json.dumps({'current':True,'scenarios':len(data['scenarios']),'terms':len(data['terms']),'evals':len(data['evals'])+len(data['pairs']),'source_digest':digest}))
else:
 out.write_text(html)
 print(json.dumps({'built':str(out),'bytes':out.stat().st_size,'source_digest':digest}))

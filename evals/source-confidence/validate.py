#!/usr/bin/env python3
"""Validate paired fictional scoring data; no provider, network, or extra dependency."""
from collections import defaultdict
import json
from pathlib import Path
import re


def validate(folder):
    rows=[json.loads(line) for line in (folder/'samples.jsonl').read_text().splitlines() if line.strip()]
    errors=[]
    def check(ok,message):
        if not ok:errors.append(message)
    ids=set();pairs=defaultdict(list)
    gates={'quote_attribution','source_and_verification','bounded_inference','respect_refusal','transcript_uncertainty'}
    sources={'resident_statement','learner_observation','colleague_statement','unattributed_inference','uncertain_transcription'}
    fields={'id','version','pair_id','scenario_anchor','status','review_notice','fictional','scope','facts','learner_turn','expected_information','candidate_feedback_ja','expected_feedback','not_proven'}
    for row in rows:
        key=row['id']
        check(set(row)==fields,f'{key}: unexpected fields')
        check(bool(re.fullmatch(r'CK-I[0-9]{3}',key)) and key not in ids,f'{key}: invalid/duplicate ID')
        ids.add(key);pairs[row['pair_id']].append(row)
        check(bool(re.fullmatch(r'0\.[0-9]+\.[0-9]+',row['version'])),f'{key}: version')
        check(row['status']=='draft_pending_expert_review' and row['review_notice']=='草稿，待介护经验者与日语教育者审稿',f'{key}: review flags')
        check(row['fictional'] is True,f'{key}: must be fictional')
        check(row['scope']=='independent_evaluation_fragment_not_runtime_scenario',f'{key}: scope')
        check(bool(re.fullmatch(r'CK-[CRP]0[1-4]',row['scenario_anchor'])),f'{key}: scenario anchor')
        facts=row['facts'];fact_ids={f['id'] for f in facts}
        check(len(fact_ids)==len(facts) and all(f['text_ja'].strip() for f in facts),f'{key}: fact IDs/text')
        turn=row['learner_turn']
        check(set(turn)=={'id','text_ja','transcript_status'} and turn['id']=='U1' and bool(turn['text_ja'].strip()),f'{key}: learner turn')
        check(turn['transcript_status'] in ['reliable','uncertain'],f'{key}: transcript status')
        for info in row['expected_information']:
            check(set(info)=={'assertion_ja','source_kind','evidence_ids','verification'},f'{key}: assertion fields')
            check(info['source_kind'] in sources and bool(info['assertion_ja'].strip()),f'{key}: assertion/source')
            check(info['verification'] in ['supported_by_context','not_established','transcript_uncertain'],f'{key}: verification label')
            check(set(info['evidence_ids'])<=fact_ids and len(info['evidence_ids'])==len(set(info['evidence_ids'])),f'{key}: unknown/duplicate evidence')
            if info['verification']=='supported_by_context':check(bool(info['evidence_ids']),f'{key}: supported assertion without evidence')
            if info['verification']=='transcript_uncertain':check(turn['transcript_status']=='uncertain',f'{key}: inconsistent transcript uncertainty')
        expected=row['expected_feedback']
        check(set(expected)=={'acceptable','gates','feedback_evidence','reason_zh','additional_rejection_tags'},f'{key}: feedback fields')
        check(type(expected['acceptable']) is bool and bool(row['candidate_feedback_ja'].strip()),f'{key}: candidate/label')
        check(set(expected['gates'])==gates and set(expected['gates'].values())<={'pass','fail','not_applicable'},f'{key}: gate names/values')
        fails=sum(v=='fail' for v in expected['gates'].values())
        check((fails==0)==expected['acceptable'],f'{key}: overall label contradicts applicable gates')
        for ev in expected['feedback_evidence']:
            check(set(ev)=={'turn_id','quote_ja'} and ev['turn_id']=='U1' and bool(ev['quote_ja']) and ev['quote_ja'] in turn['text_ja'],f'{key}: quote not verbatim from U1')
        if turn['transcript_status']=='uncertain':check(not expected['feedback_evidence'],f'{key}: uncertain transcript must not supply hard quote evidence')
        check(set(expected['additional_rejection_tags'])<={'pronunciation_claim_without_audio'},f'{key}: rejection tags')
        check(row['not_proven']==['pronunciation','clinical_competence','real_model_quality'],f'{key}: evidence limits')
    for key,group in pairs.items():
        check(len(group)==2 and {r['expected_feedback']['acceptable'] for r in group}=={True,False},f'{key}: expected one good and one bad candidate')
        if len(group)==2:
            for field in ['facts','learner_turn','expected_information','scenario_anchor']:
                check(group[0][field]==group[1][field],f'{key}: paired context changed: {field}')
            check(group[0]['candidate_feedback_ja']!=group[1]['candidate_feedback_ja'],f'{key}: candidates identical')
    check(len(rows)==12 and len(pairs)==6,'Expected this fixed set of 12 samples / 6 paired contexts')
    return {'samples':len(rows),'paired_contexts':len(pairs),'acceptable':sum(r['expected_feedback']['acceptable'] for r in rows),'unacceptable':sum(not r['expected_feedback']['acceptable'] for r in rows),'uncertain_transcripts':sum(r['learner_turn']['transcript_status']=='uncertain' for r in rows),'errors':errors,'model_calls':0,'professional_reviewed':False}


if __name__=='__main__':
    try:result=validate(Path(__file__).resolve().parent)
    except (OSError,ValueError,KeyError,TypeError) as error:result={'errors':[str(error)]}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    raise SystemExit(1 if result['errors'] else 0)

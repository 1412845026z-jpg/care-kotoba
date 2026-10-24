#!/usr/bin/env python3
"""Offline terminology contract and cross-reference checks; no API or dependencies."""
import argparse
import json
from pathlib import Path
import re


def validate(root):
    folder = root / 'content/terminology'
    terms = json.loads((folder / 'terms.json').read_text())
    maps = json.loads((folder / 'scenario-map.json').read_text())
    sources = json.loads((folder / 'sources.json').read_text())
    scenarios = {json.loads(p.read_text())['id'] for p in (root / 'content/scenarios').glob('CK-*.json')}
    errors = []
    def check(ok, message):
        if not ok:
            errors.append(message)
    expected_scenes = {f'CK-{skill}0{n}' for skill in 'CRP' for n in range(1, 5)}
    check(scenarios == expected_scenes, 'Expected the existing 12 core scenario IDs')
    check(isinstance(terms, list) and bool(terms), 'terms must be a non-empty array')
    fields = {'id','version','status','review_notice','fictional_examples','ja','reading_ja',
              'learning_gloss','example_ja','feedback_guard_zh','scenario_ids','placement','provenance','authorship'}
    ids, words = set(), set()
    source_ids = {x['id'] for x in sources['sources']}
    sources_by_id = {x['id']:x for x in sources['sources']}
    check(len(source_ids) == len(sources['sources']), 'Duplicate source ID')
    check(sources['pdf_commercial_reuse_permission'] == 'not_confirmed', 'PDF permission must not be assumed cleared')
    referenced = authored = 0
    for n, term in enumerate(terms):
        label = f'term[{n}]'
        check(isinstance(term, dict), f'{label}: object required')
        if not isinstance(term, dict):
            continue
        check(set(term) == fields, f'{label}: unexpected or missing fields')
        if not fields <= set(term):
            continue
        key = term['id']
        check(isinstance(key, str) and re.fullmatch(r'CK-T[0-9]{3}', key), f'{label}: invalid ID')
        check(key not in ids, f'{label}: duplicate ID')
        ids.add(key)
        check(term['ja'] not in words, f'{label}: duplicate headword')
        words.add(term['ja'])
        check(bool(re.fullmatch(r'0\.[0-9]+\.[0-9]+', term['version'])), f'{key}: unexpected data version')
        check(term['status'] == 'draft_pending_expert_review', f'{key}: review status')
        check(term['review_notice'] == '草稿，待介护经验者与日语教育者审稿', f'{key}: review notice')
        check(term['fictional_examples'] is True, f'{key}: examples must be fictional')
        for field in ['ja','reading_ja','example_ja','feedback_guard_zh','authorship']:
            check(isinstance(term[field], str) and bool(term[field].strip()), f'{key}: {field} must be non-empty')
        check(isinstance(term['reading_ja'], str) and re.fullmatch(r'[ぁ-ゖァ-ヺー・]+', term['reading_ja']), f'{key}: kana reading')
        check(term['ja'] in term['example_ja'], f'{key}: example must contain its headword')
        if not re.search(r'[一-龯々]', term['ja']):
            check(term['reading_ja'] == term['ja'], f'{key}: katakana must keep its spelling')
        gloss = term['learning_gloss']
        check(isinstance(gloss, dict) and set(gloss) == {'zh-Hans','en'}, f'{key}: bilingual gloss keys')
        if isinstance(gloss, dict):
            check(all(isinstance(v,str) and bool(v.strip()) for v in gloss.values()), f'{key}: empty gloss')
        scenes = term['scenario_ids']
        check(isinstance(scenes,list) and bool(scenes), f'{key}: scene IDs required')
        if isinstance(scenes,list):
            check(len(scenes) == len(set(scenes)), f'{key}: repeated scene ID')
            check(set(scenes) <= scenarios, f'{key}: unknown scene')
        check(term['placement'] in ['core','transfer_only'], f'{key}: placement')
        p = term['provenance']
        check(isinstance(p,dict), f'{key}: provenance object required')
        if not isinstance(p,dict):
            continue
        check(p.get('copied_definition') is False and p.get('copied_artwork') is False, f'{key}: no copied definition or artwork allowed')
        if p.get('kind') == 'common_headword_reference':
            referenced += 1
            check(set(p) == {'kind','source_id','index_pdf_page','printed_entry_page','pdf_entry_page','copied_definition','copied_artwork'}, f'{key}: reference fields')
            check(p.get('source_id') in source_ids, f'{key}: unknown source')
            for field in ['index_pdf_page','printed_entry_page','pdf_entry_page']:
                check(type(p.get(field)) is int and p[field] > 0, f'{key}: positive integer {field}')
            source = sources_by_id.get(p.get('source_id'), {})
            if type(p.get('pdf_entry_page')) is int and type(p.get('printed_entry_page')) is int:
                check(p['pdf_entry_page'] == p['printed_entry_page'] + 6, f'{key}: printed/PDF page mismatch')
                check(p['pdf_entry_page'] <= source.get('pdf_pages',0), f'{key}: entry page outside PDF')
            if type(p.get('index_pdf_page')) is int:
                check(199 <= p['index_pdf_page'] <= 223, f'{key}: Japanese index page range')
        elif p.get('kind') == 'project_authored':
            authored += 1
            check(set(p) == {'kind','copied_definition','copied_artwork'}, f'{key}: authored entry must not invent PDF provenance')
        else:
            check(False, f'{key}: unknown provenance kind')
    map_ids = [x['scenario_id'] for x in maps]
    check(len(map_ids) == len(set(map_ids)) and set(map_ids) == scenarios, 'Map must cover each existing scenario exactly once')
    for m in maps:
        check(set(m) == {'scenario_id','core_term_ids','transfer_term_ids'}, 'Unexpected scenario map fields')
        scene = m['scenario_id']
        for placement, field in [('core','core_term_ids'),('transfer_only','transfer_term_ids')]:
            expected = {t['id'] for t in terms if scene in t['scenario_ids'] and t['placement'] == placement}
            values = m[field]
            check(isinstance(values,list) and len(values) == len(set(values)) and set(values) == expected, f'{scene}: {field} does not match term references')
        check(bool(m['core_term_ids']), f'{scene}: no core terms')
    return {'terms':len(terms),'source_headwords':referenced,'project_authored':authored,
            'scenarios':len(scenarios),'errors':errors,'professional_reviewed':False,'app_integrated':False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    try:
        result = validate(args.root.resolve())
    except (OSError, ValueError, KeyError, TypeError) as error:
        result = {'errors':[str(error)]}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result['errors'] else 0)

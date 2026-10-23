"""Validate this data package with Python stdlib; no model or network calls.

Checks the JSON Schema keyword subset used here, not arbitrary JSON Schema.
Cross-file checks protect transcript evidence, ASR abstention and coverage.
"""
from collections import Counter
import json
from pathlib import Path
import re
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ('clarification', 'refusal_respect', 'report_certainty')
CASE_TYPES = ('positive', 'common_error', 'uncertain_transcript', 'acceptable_variation')
KEYWORDS = {'$schema', '$id', 'title', 'description', 'type', 'const', 'enum',
            'properties', 'required', 'additionalProperties', 'items',
            'minItems', 'uniqueItems', 'minLength', 'pattern'}


def same_value(a, b):
    return type(a) is type(b) and a == b


def schema_keywords(schema, path, errors):
    for name in schema:
        if name not in KEYWORDS:
            errors.append(f'{path}: unsupported schema keyword {name}')
    for name, child in schema.get('properties', {}).items():
        schema_keywords(child, f'{path}.{name}', errors)
    if 'items' in schema:
        schema_keywords(schema['items'], f'{path}[]', errors)


def schema_check(value, schema, path, errors):
    types = {'object': dict, 'array': list, 'string': str, 'boolean': bool, 'integer': int}
    kind = schema.get('type')
    if kind and (kind not in types or type(value) is not types[kind]):
        errors.append(f'{path}: expected {kind}')
        return
    if 'const' in schema and not same_value(value, schema['const']):
        errors.append(f'{path}: const mismatch')
    if 'enum' in schema and not any(same_value(value, allowed) for allowed in schema['enum']):
        errors.append(f'{path}: enum mismatch')
    if isinstance(value, dict):
        props = schema.get('properties', {})
        for name in schema.get('required', []):
            if name not in value:
                errors.append(f'{path}: missing {name}')
        if schema.get('additionalProperties') is False:
            for name in value.keys() - props.keys():
                errors.append(f'{path}: unexpected {name}')
        for name in value.keys() & props.keys():
            schema_check(value[name], props[name], f'{path}.{name}', errors)
    elif isinstance(value, list):
        if len(value) < schema.get('minItems', 0):
            errors.append(f'{path}: too few items')
        if schema.get('uniqueItems') and len({json.dumps(v, sort_keys=True) for v in value}) != len(value):
            errors.append(f'{path}: duplicate items')
        if 'items' in schema:
            for index, child in enumerate(value):
                schema_check(child, schema['items'], f'{path}[{index}]', errors)
    elif isinstance(value, str):
        if len(value) < schema.get('minLength', 0):
            errors.append(f'{path}: text is too short')
        if 'pattern' in schema and not re.search(schema['pattern'], value):
            errors.append(f'{path}: pattern mismatch')


def sample_links(sample, scenario, errors):
    label = sample.get('id', '?')
    if sample.get('scenario_version') != scenario.get('version'):
        errors.append(f'{label}: scenario version mismatch')
    hidden = {item['id'] for item in scenario['hidden_information']}
    if not set(sample.get('revealed_hidden_ids', [])).issubset(hidden):
        errors.append(f'{label}: unknown hidden-information reference')
    utterances = sample.get('learner_transcript', [])
    by_id = {item['utterance_id']: item for item in utterances}
    if len(by_id) != len(utterances):
        errors.append(f'{label}: duplicate utterance ID')
    expected = sample.get('expected', {})
    labels = expected.get('labels', {})
    primary = scenario['primary_skill']
    for skill in SKILLS:
        if skill != primary and labels.get(skill) != 'not_applicable':
            errors.append(f'{label}: unrelated skill must be not_applicable')
    is_uncertain = any(item.get('asr_quality') == 'uncertain' for item in utterances)
    if is_uncertain and (labels.get(primary) != 'uncertain' or expected.get('feedback_evidence')):
        errors.append(f'{label}: uncertain ASR requires abstention and no invented quote')
    if sample.get('case_type') == 'uncertain_transcript' and not is_uncertain:
        errors.append(f'{label}: uncertain case lacks ASR uncertainty')
    required = {'positive': 'met', 'acceptable_variation': 'met',
                'common_error': 'missed', 'uncertain_transcript': 'uncertain'}
    if labels.get(primary) != required.get(sample.get('case_type')):
        errors.append(f'{label}: case type and expected primary label disagree')
    evidence = expected.get('feedback_evidence', [])
    if not is_uncertain and not evidence:
        errors.append(f'{label}: clear labeled sample needs transcript evidence')
    for item in evidence:
        utterance = by_id.get(item.get('utterance_id'))
        if not utterance or not item.get('quote') or item['quote'] not in utterance['text_ja']:
            errors.append(f'{label}: evidence must be a verbatim learner transcript span')


def validate(root=ROOT):
    errors = []
    scenario_schema = json.loads((root / 'content/scenarios/schema.json').read_text())
    sample_schema = json.loads((root / 'evals/schema.json').read_text())
    schema_keywords(scenario_schema, 'scenario_schema', errors)
    schema_keywords(sample_schema, 'sample_schema', errors)
    scenarios = {}
    for file in sorted((root / 'content/scenarios').glob('CK-*.json')):
        value = json.loads(file.read_text())
        before = len(errors)
        schema_check(value, scenario_schema, file.name, errors)
        if len(errors) != before:
            continue
        if value['id'] != file.stem or value['id'] in scenarios:
            errors.append(f'{file.name}: filename/ID mismatch or duplicate ID')
        scenarios[value['id']] = value
        hidden = {item['id'] for item in value['hidden_information']}
        branch_ids = [item['id'] for item in value['conversation_branches']]
        if len(branch_ids) != len(set(branch_ids)):
            errors.append(f'{file.name}: duplicate branch ID')
        for branch in value['conversation_branches']:
            if not set(branch['reveals']).issubset(hidden):
                errors.append(f'{file.name}: branch reveals an unknown hidden fact')
    if Counter(v['primary_skill'] for v in scenarios.values()) != Counter({s: 4 for s in SKILLS}):
        errors.append('scenario coverage must be four drafts per skill')
    samples = []
    seen = set()
    for line_number, line in enumerate((root / 'evals/samples.jsonl').read_text().splitlines(), 1):
        value = json.loads(line)
        before = len(errors)
        schema_check(value, sample_schema, f'samples:{line_number}', errors)
        if len(errors) != before:
            continue
        if value['id'] in seen:
            errors.append(f'{value["id"]}: duplicate sample ID')
        seen.add(value['id'])
        scenario = scenarios.get(value['scenario_id'])
        if scenario is None:
            errors.append(f'{value["id"]}: unknown scenario')
        else:
            sample_links(value, scenario, errors)
        samples.append(value)
    for scenario_id in scenarios:
        cases = Counter(s['case_type'] for s in samples if s['scenario_id'] == scenario_id)
        if cases != Counter({kind: 1 for kind in CASE_TYPES}):
            errors.append(f'{scenario_id}: needs one of each case type')
    return {'status': 'failed' if errors else 'passed', 'scenario_count': len(scenarios),
            'sample_count': len(samples), 'skill_coverage': dict(Counter(v['primary_skill'] for v in scenarios.values())),
            'case_coverage': dict(Counter(s['case_type'] for s in samples)), 'errors': errors}


if __name__ == '__main__':
    started = time.perf_counter()
    result = validate()
    result['seconds'] = round(time.perf_counter() - started, 6)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(result['status'] != 'passed')

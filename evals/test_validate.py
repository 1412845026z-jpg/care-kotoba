"""Guard against misleading evidence and scoring uncertainty as learner failure."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('care_eval_validate', ROOT/'evals/validate.py')
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
SCENARIO = json.loads((ROOT/'content/scenarios/CK-R04.json').read_text())
SAMPLES = {v['id']: v for v in (json.loads(line) for line in (ROOT/'evals/samples.jsonl').read_text().splitlines())}


class EvidenceGuards(unittest.TestCase):
    def test_reference_answer_cannot_replace_the_actual_utterance(self):
        sample = deepcopy(SAMPLES['CK-R04-E2'])
        sample['expected']['feedback_evidence'][0]['quote'] = SCENARIO['examples'][0]['learner_ja']
        errors = []
        checks.sample_links(sample, SCENARIO, errors)
        self.assertTrue(any('verbatim learner transcript' in e for e in errors))

    def test_uncertain_negation_cannot_be_scored_as_a_clear_error(self):
        sample = deepcopy(SAMPLES['CK-R04-E3'])
        sample['expected']['labels']['refusal_respect'] = 'missed'
        errors = []
        checks.sample_links(sample, SCENARIO, errors)
        self.assertTrue(any('uncertain ASR requires abstention' in e for e in errors))

    def test_evidence_must_refer_to_an_existing_learner_turn(self):
        sample = deepcopy(SAMPLES['CK-R04-E1'])
        sample['expected']['feedback_evidence'][0]['utterance_id'] = 'NPC1'
        errors = []
        checks.sample_links(sample, SCENARIO, errors)
        self.assertTrue(any('verbatim learner transcript' in e for e in errors))


if __name__ == '__main__':
    unittest.main()

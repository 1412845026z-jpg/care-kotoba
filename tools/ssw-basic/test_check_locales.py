"""Content-import failure cases independent of the App's language UI tests."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from check_locales import load_json, validate_pack


class LocaleValidation(unittest.TestCase):
    def setUp(self):
        self.catalog = {"topics": [{"id": "T01"}], "scenes": [{"id": "SSW-S01", "dialogue": [{}, {}]}]}
        self.pack = {"locale": "en", "status": "draft_unreviewed", "topics": {"T01": {"title": "Greetings"}},
                     "scenes": {"SSW-S01": {"title": "Ask first", "goal": "Ask for permission.",
                                            "context": "A fictional room.", "check": "Wait for an answer.",
                                            "lines": ["May I come in?", "Please come in."]}}}

    def test_complete_pack_keeps_draft_status(self):
        errors, counts = validate_pack(self.pack, self.catalog, "en", True)
        self.assertEqual(errors, [])
        self.assertEqual(counts, {"topics": 1, "scenes": 1, "dialogue_lines": 2})
        self.assertEqual(self.pack["status"], "draft_unreviewed")

    def test_mistyped_topic_or_scene_cannot_silently_disappear(self):
        for section, key in [("topics", "T99"), ("scenes", "SSW-S99")]:
            with self.subTest(section=section):
                pack = deepcopy(self.pack)
                pack[section][key] = next(iter(pack[section].values()))
                errors, _ = validate_pack(pack, self.catalog, "en")
                self.assertTrue(any("unknown ID" in error for error in errors))

    def test_dialogue_order_cannot_gain_or_lose_entries_in_complete_mode(self):
        for lines in [["May I come in?"], ["A", "B", "C"], ["A", None]]:
            pack = deepcopy(self.pack)
            pack["scenes"]["SSW-S01"]["lines"] = lines
            self.assertTrue(validate_pack(pack, self.catalog, "en", True)[0])

    def test_partial_pack_can_explicitly_leave_a_translation_gap(self):
        pack = {"locale": "en", "status": "draft_unreviewed", "scenes": {"SSW-S01": {"lines": [None, "Please come in."]}}}
        self.assertEqual(validate_pack(pack, self.catalog, "en")[0], [])
        self.assertTrue(validate_pack(pack, self.catalog, "en", True)[0])

    def test_invalid_metadata_or_shape_is_rejected(self):
        for field, value in [("locale", "vi"), ("status", ""), ("topics", []), ("scenes", None)]:
            with self.subTest(field=field):
                pack = deepcopy(self.pack)
                pack[field] = value
                self.assertTrue(validate_pack(pack, self.catalog, "en")[0])

    def test_wrong_script_or_misspelled_field_is_rejected(self):
        for change in [{"goal": "確認してください。"}, {"gola": "Ask first."}]:
            pack = deepcopy(self.pack)
            pack["scenes"]["SSW-S01"].update(change)
            self.assertTrue(validate_pack(pack, self.catalog, "en")[0])

    def test_duplicate_json_keys_are_not_silently_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "en.json"
            path.write_text('{"scenes":{"SSW-S01":{},"SSW-S01":{}}}')
            with self.assertRaisesRegex(ValueError, "duplicate JSON key"):
                load_json(path)


if __name__ == "__main__":
    unittest.main()

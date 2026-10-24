"""Validate support-language source packs without generating or editing App data."""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
LOCALES = {"en", "zh", "vi", "my", "id"}
SCRIPTS = {"zh": r"[\u4e00-\u9fff]", "my": r"[\u1000-\u109f]"}
FIELDS = {"title", "goal", "context", "check"}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique_object)


def validate_pack(pack, catalog, locale, complete=False):
    errors = []
    counts = {"topics": 0, "scenes": 0, "dialogue_lines": 0}
    topics = {t["id"] for t in catalog["topics"]}
    scenes = {s["id"]: s for s in catalog["scenes"]}
    if not isinstance(pack, dict):
        return ["pack must be an object"], counts
    if locale not in LOCALES or pack.get("locale") != locale:
        errors.append("filename and locale must agree on a supported locale")
    if not isinstance(pack.get("status"), str) or not pack["status"].strip():
        errors.append("review status is required")
    unknown = set(pack) - {"locale", "status", "topics", "scenes"}
    if unknown:
        errors.append(f"unknown pack fields: {sorted(unknown)}")

    def text(value, where):
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{where}: expected nonempty text")
        elif not re.search(SCRIPTS.get(locale, r"[A-Za-z]"), value):
            errors.append(f"{where}: no letters of the selected language's script")

    for section, valid in [("topics", topics), ("scenes", scenes)]:
        entries = pack.get(section, {})
        if not isinstance(entries, dict):
            errors.append(f"{section}: expected object")
            continue
        for key, entry in entries.items():
            where = f"{section}.{key}"
            if key not in valid:
                errors.append(f"{where}: unknown ID")
                continue
            if not isinstance(entry, dict):
                errors.append(f"{where}: expected object")
                continue
            allowed = {"title"} if section == "topics" else FIELDS | {"lines"}
            if set(entry) - allowed:
                errors.append(f"{where}: unknown fields {sorted(set(entry) - allowed)}")
            if complete and allowed - set(entry):
                errors.append(f"{where}: missing fields {sorted(allowed - set(entry))}")
            for field in allowed - {"lines"}:
                if field in entry:
                    text(entry[field], f"{where}.{field}")
            counts[section] += 1
            if section == "scenes" and "lines" in entry:
                lines = entry["lines"]
                expected = len(scenes[key]["dialogue"])
                if not isinstance(lines, list):
                    errors.append(f"{where}.lines: expected array")
                else:
                    if len(lines) > expected or (complete and len(lines) != expected):
                        errors.append(f"{where}.lines: wrong dialogue length")
                    for index, value in enumerate(lines):
                        if value is None and not complete:
                            continue
                        text(value, f"{where}.lines[{index}]")
                        if isinstance(value, str) and value.strip():
                            counts["dialogue_lines"] += 1
        if complete and set(valid) - set(entries):
            errors.append(f"{section}: missing IDs {sorted(set(valid) - set(entries))}")
    return errors, counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=ROOT / "content/ssw-basic/catalog.json")
    parser.add_argument("--locales-dir", type=Path, default=ROOT / "content/ssw-basic/locales")
    parser.add_argument("--require-complete", action="store_true", help="Require all source IDs, fields and lines in each pack")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    catalog = load_json(args.catalog)
    reports, errors = {}, []
    files = sorted(args.locales_dir.glob("*.json"))
    if not files:
        errors.append("no locale packs found")
    for path in files:
        try:
            pack = load_json(path)
            problems, counts = validate_pack(pack, catalog, path.stem, args.require_complete)
            reports[path.stem] = {**counts, "status": pack.get("status") if isinstance(pack, dict) else None,
                                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
            errors.extend(f"{path.name}: {problem}" for problem in problems)
        except (ValueError, OSError) as error:
            errors.append(f"{path.name}: {error}")
    result = {"passed": not errors, "complete_required": args.require_complete,
              "catalog_sha256": hashlib.sha256(args.catalog.read_bytes()).hexdigest(),
              "packs": reports, "errors": errors,
              "limits": ["Checks structure, IDs and text-script presence; not translation accuracy or professional review.",
                         "Does not generate App data, call APIs, or establish that a pack is integrated in the App."]}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

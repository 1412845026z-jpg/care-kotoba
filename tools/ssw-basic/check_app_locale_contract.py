"""Exercise a pinned Claude generator with source data in a temporary directory."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

from check_locales import LOCALES, ROOT, load_json, validate_pack


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generator-ref", required=True, help="An already-fetched Git revision; no network access")
    parser.add_argument("--locale", choices=sorted(LOCALES), default="en")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    revision = subprocess.check_output(
        ["git", "rev-parse", "--verify", "--end-of-options", args.generator_ref + "^{commit}"],
        cwd=ROOT, text=True).strip()
    generator = subprocess.check_output(
        ["git", "show", revision + ":tools/ssw-basic-app/generate.mjs"], cwd=ROOT)
    catalog_path = ROOT / "content/ssw-basic/catalog.json"
    pack_path = ROOT / f"content/ssw-basic/locales/{args.locale}.json"
    catalog, pack = load_json(catalog_path), load_json(pack_path)
    errors, counts = validate_pack(pack, catalog, args.locale, complete=True)
    if errors:
        raise ValueError("Invalid complete language pack: " + "; ".join(errors))
    with tempfile.TemporaryDirectory(prefix="ck-locale-contract-") as directory:
        fixture = Path(directory)
        script = fixture / "tools/ssw-basic-app/generate.mjs"
        script.parent.mkdir(parents=True)
        script.write_bytes(generator)
        data = fixture / "content/ssw-basic"
        (data / "locales").mkdir(parents=True)
        shutil.copyfile(catalog_path, data / "catalog.json")
        shutil.copyfile(pack_path, data / "locales" / pack_path.name)
        result = subprocess.run(["node", str(script), "--json"], capture_output=True,
                                text=True, check=True, timeout=60)
        generated = json.loads(result.stdout)
    locale = args.locale
    assert generated["support"][locale] == {"status": pack["status"], "scenes": counts["scenes"]}
    assert len(generated["topics"]) == len(catalog["topics"])
    assert len(generated["scenes"]) == len(catalog["scenes"])
    for topic, original in zip(generated["topics"], catalog["topics"]):
        assert topic["id"] == original["id"]
        assert topic["titleJa"] == original["title_ja"]
        assert topic["title"][locale] == pack["topics"][topic["id"]]["title"]
    for scene, original in zip(generated["scenes"], catalog["scenes"]):
        assert scene["id"] == original["id"]
        translated = pack["scenes"][scene["id"]]
        for field in ("title", "goal", "context"):
            assert scene[field][locale] == translated[field]
        assert scene["practice"]["check"][locale] == translated["check"]
        assert scene["practice"]["alternatives"] == original["practice"]["alternatives_ja"]
        assert len(scene["dialogue"]) == len(original["dialogue"])
        for index, (line, source) in enumerate(zip(scene["dialogue"], original["dialogue"])):
            assert line["ja"] == source["ja"] and line["kana"] == source["kana"]
            assert line["tr"][locale] == translated["lines"][index]
            if "zh" in source:
                assert line["tr"]["zh"] == source["zh"]
    report = {"passed": True, "generator_commit": revision,
              "generator_sha256": hashlib.sha256(generator).hexdigest(),
              "catalog_sha256": hashlib.sha256(catalog_path.read_bytes()).hexdigest(),
              "locale_sha256": hashlib.sha256(pack_path.read_bytes()).hexdigest(),
              "support": generated["support"], **counts,
              "preserved": ["Japanese titles/dialogue", "kana", "original Chinese translations", "Japanese alternatives"],
              "app_integrated": False,
              "limits": ["Runs the pinned generator --json in a data-only temporary fixture; no checkout output overwritten.",
                         "Does not verify App language UI, translation quality, or professional review."]}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

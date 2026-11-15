"""Freeze NASA CSV assertions; run with python -I. Never execute source files."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = "BRSMFMT_Campaign_1_Functional_Mobility_Test_Obsv_All.csv"
SUMMARY = "BRSMFMT_Campaign_1_Functional_Mobility_Test_ Avgs_All.csv"
DATASET_ID = "5fca791c-e1b8-5ee8-aba0-c6220789547e"


def read(name):
    with (ROOT / "raw" / name).open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        return [{"sourceRow": reader.line_num, "row": row} for row in reader]


catalog = json.loads((ROOT / "raw" / "catalog.txt").read_bytes())
downloads = {
    item["__original_file_name"]: item["id"]
    for item in catalog["related"]["data_files"]["items"]
}
urls = {
    "catalog.txt": f"https://nlsp.nasa.gov/api/v1/data/datasets/{DATASET_ID}/full",
    "experiment.txt": "https://nlsp.nasa.gov/api/v1/data/experiments/dcff3b64-7700-5441-b4c3-2af31b9bb7b0/full",
}
artifact = {
    "datasetId": DATASET_ID,
    "downloadDate": "2026-11-15",
    "files": [
        {
            "name": p.name,
            "url": urls[p.name] if p.name in urls else
                f"https://nlsp.nasa.gov/api/v1/files/{downloads[p.name]}/download",
            "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
        }
        for p in sorted((ROOT / "raw").iterdir()) if p.is_file()
    ],
    "trials": read(MAIN),
    "summaries": read(SUMMARY),
}
assert len(artifact["trials"]) == 108
assert len(artifact["summaries"]) == 18
(ROOT / "mobility.json").write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")

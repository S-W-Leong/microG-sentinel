"""Curate downloaded NASA CSVs as data only. Run with python -I curate.py."""

import csv
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
DATASET_ID = "4d613f00-9304-5d1b-8d30-836bb2023079"
MEASURES = {
    "energy": ("Energy", "kcal", "Energy (kcal)"),
    "protein": ("Protein", "g", "Total Protein (g)"),
    "sodium": ("Sodium", "mg", "Sodium (mg)"),
    "calcium": ("Calcium", "mg", "Calcium (mg)"),
    "vitaminD": ("Vitamin D", "mcg", "Vitamin D (calciferol) (mcg)"),
    "fibre": ("Fibre", "g", "Total Dietary Fiber (g)"),
}


def number(raw):
    if raw.strip() in ("", "NA", "N/A"):
        return None
    value = float(raw)
    if not math.isfinite(value) or value < 0:
        raise ValueError(f"Unexpected nutrient value: {raw!r}")
    return value


def curate():
    catalog = json.loads((RAW / "catalog.txt").read_text(encoding="utf-8"))
    files = []
    observations = []
    seen = set()
    for source in sorted(catalog["related"]["data_files"]["items"], key=lambda f: f["file_name"]):
        name = source["file_name"]
        if not name.endswith("_obsv.csv"):
            continue
        if Path(name).name != name:
            raise ValueError("Unexpected source path")
        path = RAW / name
        files.append({
            "name": name,
            "downloadId": source["id"],
            "url": f"https://nlsp.nasa.gov/api/v1/files/{source['id']}/download",
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                participant = f"{row['Campaign']}-{row['Subject']}"
                date = datetime.strptime(row["Date of Intake"], "%m/%d/%Y").date().isoformat()
                key = (participant, date)
                if key in seen:
                    raise ValueError(f"Duplicate participant/date: {key}")
                seen.add(key)
                phase = row["Test_Phase"]
                if phase not in ("PRE_TEST", "IN_TEST", "POST_TEST"):
                    raise ValueError(f"Unknown phase: {phase}")
                observations.append({
                    "id": f"{participant}:{row['ID']}",
                    "participant": participant,
                    "date": date,
                    "sourceDate": row["Date of Intake"],
                    "phase": phase,
                    "studyDay": int(row["BR_Day"]),
                    "sourceId": row["ID"],
                    "sourceFile": name,
                    "sourceRow": reader.line_num,
                    "values": {key: number(row[column]) for key, (_, _, column) in MEASURES.items()},
                    "rawValues": {key: row[column] for key, (_, _, column) in MEASURES.items()},
                })
    observations.sort(key=lambda r: (r["participant"], r["date"], r["sourceId"]))
    artifact = {
        "dataset": "UTMB Bedrest Campaign 3 Dietary Intake",
        "catalogId": "MR016G_Campaign_3_Dietary_Intake",
        "datasetId": DATASET_ID,
        "url": f"https://nlsp.nasa.gov/search/data/details/{DATASET_ID}?dataType=DATASETS",
        "downloadDate": "2026-11-15",
        "catalogSha256": hashlib.sha256((RAW / "catalog.txt").read_bytes()).hexdigest(),
        "measures": {key: {"label": label, "unit": unit, "sourceColumn": column}
                     for key, (label, unit, column) in MEASURES.items()},
        "files": files,
        "observations": observations,
    }
    (ROOT / "dietary-intake.json").write_text(
        json.dumps(artifact, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8", newline="\n",
    )
    print(f"Curated {len(observations)} observations from {len(files)} files")


if __name__ == "__main__":
    curate()

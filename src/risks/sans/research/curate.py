"""Read NASA data only. Run from any directory with: python -I path/to/curate.py."""
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
OCT = "LSDS-81_Ophthalmologic Diagnostic Technique_Fuller_OCT_TRANSFORMED.csv"
ISA = "OSD-679_metadata_OSD-679-ISA.zip"
SELECTED = ("MT51", "MT66", "MT01", "MT08", "MT07", "MT305")
PHASES = ("Baseline ", "End_of_Hindlimb_Unloading", "End_of_Recovery")
REGIONS = ("Nasal", "Temporal", "Linear")
TISSUES = ("Total_Retinal", "Choroidal")


def number(value):
    if value.strip() in ("", "NA", "N/A"):
        return None
    parsed = float(value)
    if not math.isfinite(parsed) or parsed < 0:
        raise ValueError(f"Unexpected thickness: {value!r}")
    return parsed


with zipfile.ZipFile(RAW / ISA) as archive:
    # Read one named text member; never extract or execute archive contents.
    text = archive.read("s_OSD-679.txt").decode("utf-8-sig")
metadata = {}
for line, row in enumerate(csv.DictReader(io.StringIO(text), delimiter="\t"), 2):
    if row["Source Name"] in SELECTED and row["Characteristics[Material Type]"] in ("Right Eye", "Left Eye"):
        key = row["Sample Name"]
        assert key not in metadata, f"Duplicate metadata: {key}"
        metadata[key] = (line, row)

records = []
seen = set()
with (RAW / OCT).open(encoding="utf-8-sig", newline="") as source:
    for line, row in enumerate(csv.DictReader(source), 2):
        sample = row["Sample Name"]
        if sample.split("_")[0] not in SELECTED:
            continue
        assert sample not in seen, f"Duplicate OCT sample: {sample}"
        seen.add(sample)
        metadata_line, meta = metadata[sample]
        assert meta["Characteristics[Organism]"] == "Rattus norvegicus"
        visits = []
        for phase in PHASES:
            values = {}
            for region in REGIONS:
                values[region] = {
                    tissue: number(row[f"{phase}_{region}_{tissue}_Thickness_millimeter"])
                    for tissue in TISSUES
                }
            visits.append({"phase": phase.strip(), "values": values})
        records.append({
            "sample": sample,
            "participant": meta["Source Name"],
            "eye": meta["Characteristics[Material Type]"],
            "species": meta["Characteristics[Organism]"],
            "cohort": meta["Comment[Cohort Name]"],
            "group": meta["Factor Value[Hindlimb Unloading]"],
            "unloadingDays": meta["Factor Value[Hindlimb Unloading Duration]"],
            "reloadingDays": meta["Factor Value[Hindlimb Reloading Duration]"],
            "sourceRow": line,
            "metadataRow": metadata_line,
            "visits": visits,
            "raw": {k: v for k, v in row.items() if k},
        })
assert len(records) == 12
records.sort(key=lambda r: (SELECTED.index(r["participant"]), r["eye"]))
listing = json.loads((RAW / "files-api.txt").read_text(encoding="utf-8"))
files = []
for item in listing["studies"]["OSD-679"]["study_files"]:
    path = RAW / item["file_name"]
    if path.is_file():
        files.append({"name": path.name, "url": "https://osdr.nasa.gov" + item["remote_url"],
                      "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
artifact = {"dataset": "OSD-679", "downloaded": "2026-11-15", "files": files, "records": records}
(ROOT / "oct.json").write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Curated {len(records)} eyes from {len(SELECTED)} rats; no inferred dates or measurements.")

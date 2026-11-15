"""Curate NASA's processed table as data only. Run with python -I curate.py."""

import csv
import hashlib
import io
import json
import math
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
TABLE = "GLDS-566_GMetagenomics_Metaphlan-taxonomy_GLmetagenomics.tsv"
METADATA = "OSD-574_metadata_OSD-574-ISA.zip"
SAMPLES = "s_OSD-574.txt"
CATALOG_URL = "https://osdr.nasa.gov/osdr/data/osd/files/574"


def percentage(raw):
    """Keep missing/invalid values unknown; a source zero remains zero."""
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) and 0 <= value <= 100 else None


def curate():
    lines = (RAW / TABLE).read_text(encoding="utf-8-sig").splitlines()
    if lines[0] != "#mpa_vJan21_CHOCOPhlAnSGB_202103":
        raise ValueError("Unexpected MetaPhlAn database")
    table = list(csv.reader(lines[1:], delimiter="\t"))
    header = table[0]
    if header[0] != "clade_name" or len(set(header)) != len(header):
        raise ValueError("Unexpected or duplicate sample columns")
    if any(len(row) != len(header) for row in table[1:]):
        raise ValueError("Ragged taxonomy table")
    if len({row[0] for row in table[1:]}) != len(table) - 1:
        raise ValueError("Duplicate taxonomy rows")
    genera = [(line, row) for line, row in enumerate(table[1:], 3)
              if row[0].split("|")[-1].startswith("g__")]
    # A fixed set across all samples avoids changing the displayed taxa per visit.
    # Unknown cells cannot participate in a ranking; fail rather than treat as zero.
    if any(percentage(v) is None for _, row in genera for v in row[1:]):
        raise ValueError("Incomplete genus values: review selection before curation")
    top = sorted(genera, key=lambda item: (-sum(map(float, item[1][1:])), item[1][0]))[:6]
    unclassified = next((line, row) for line, row in enumerate(table[1:], 3)
                        if row[0] == "UNCLASSIFIED")
    with zipfile.ZipFile(RAW / METADATA) as archive:
        # Read known text members in memory; never extract or execute archive content.
        metadata = list(csv.DictReader(io.StringIO(
            archive.read(SAMPLES).decode("utf-8-sig")), delimiter="\t"))
        investigation = archive.read("i_Investigation.txt").decode("utf-8-sig")
    title = next(line.split("\t", 1)[1] for line in investigation.splitlines()
                 if line.startswith("Study Title\t"))
    samples = []
    expected_ids = {f"C00{p}_{t}_DEL" for p in range(1, 5) for t in ["L-44", "R+1"]}
    if set(header[1:]) != expected_ids:
        raise ValueError("Unexpected sample coverage")
    for column, sample in enumerate(header[1:], 1):
        participant, timepoint, site = sample.split("_")
        sample_name = f"{participant}_Swab_{timepoint}_{site}"
        matches = [(line, row) for line, row in enumerate(metadata, 2)
                   if row["Sample Name"] == sample_name]
        if len(matches) != 1:
            raise ValueError(f"Missing or duplicate metadata: {sample}")
        metadata_row, meta = matches[0]
        phase, time_label = ("pre-flight", "Launch minus 44") if timepoint == "L-44" else (
            "post-flight", "Return plus 1")
        expected = {"Source Name": participant, "Characteristics[Organism]": "Microbiota",
                    "Characteristics[Host Organism]": "Homo sapiens",
                    "Characteristics[Material Type]": "Swab",
                    "Factor Value[Spaceflight]": phase, "Factor Value[Time]": time_label}
        if any(meta.get(key) != value for key, value in expected.items()):
            raise ValueError(f"Conflicting sample metadata: {sample}")

        def cell(line, row):
            return {"sourceRow": line, "raw": row[column], "valuePct": percentage(row[column])}

        samples.append({
            "id": sample, "participant": participant, "sampleName": sample_name,
            "timepoint": timepoint, "phase": phase, "timeLabel": time_label,
            "site": "Deltoid skin", "material": "Swab", "sourceColumn": column + 1,
            "metadataRow": metadata_row,
            "genera": [{"name": row[0].split("|")[-1][3:], "clade": row[0], **cell(line, row)}
                       for line, row in top],
            "unclassified": cell(*unclassified),
        })
    catalog = json.loads((RAW / "file-catalog.txt").read_bytes())
    files = {f["file_name"]: f for f in catalog["studies"]["OSD-574"]["study_files"]}
    manifest = []
    for path in sorted(RAW.iterdir()):
        data = path.read_bytes()
        if path.name == "file-catalog.txt":
            url = CATALOG_URL
        else:
            entry = files[path.name]
            if entry["restricted"] or not entry["visible"] or entry["file_size"] != len(data):
                raise ValueError(f"File catalog mismatch: {path.name}")
            url = "https://osdr.nasa.gov" + entry["remote_url"]
        manifest.append({"name": path.name, "url": url, "bytes": len(data),
                         "sha256": hashlib.sha256(data).hexdigest()})
    return {
        "dataset": {"id": "OSD-574", "title": title,
                    "url": "https://osdr.nasa.gov/bio/repo/data/studies/OSD-574",
                    "doi": "10.26030/hn08-ja66", "downloadDate": "2026-11-15"},
        "table": TABLE, "metadata": METADATA, "metadataMember": SAMPLES,
        "database": lines[0][1:], "genusCount": len(genera),
        "selection": "Six genera with highest mean supplied abundance across all eight samples; no renormalization.",
        "files": manifest, "samples": samples,
    }


if __name__ == "__main__":
    artifact = curate()
    (ROOT / "osd574.json").write_text(
        json.dumps(artifact, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8", newline="\n")
    print(f"Curated {len(artifact['samples'])} samples, six of {artifact['genusCount']} genera.")

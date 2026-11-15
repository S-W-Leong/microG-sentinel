"""Freeze the HD71 assay and its independent transformed representation."""
import csv
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / 'raw'
SUBMITTED = 'LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv'
TRANSFORMED = 'LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv'


def rows(file):
    with (RAW / file).open(encoding='utf-8-sig', newline='') as source:
        return [(i, row) for i, row in enumerate(csv.DictReader(source), 2)]


def canonical(name):
    name = name.lower().replace('/', '_per_').replace('+', '_plus_')
    return re.sub(r'[^\w]+', '_', name).strip('_')


wide = rows(TRANSFORMED)
wide_index = {r['Sample Name']: (i, r) for i, r in wide}
assert len(wide_index) == len(wide), 'Duplicate transformed samples'
columns = {k.split('_concentration_')[0]: k for k in wide[0][1] if '_concentration_' in k}
records = []
for index, r in rows(SUBMITTED):
    sample = f"{r['ID']}_serum_{r['Timepoint']}"
    column = columns[canonical(r['Analyte'])]
    wi, wr = wide_index[sample]
    records.append({'sourceRow': index, 'raw': r, 'transformedRow': wi, 'transformedSample': wr['Sample Name'],
                    'transformedColumn': column, 'transformedRaw': wr[column],
                    'transformedPercent': wr[canonical(r['Analyte']) + '_percent']})

archive = zipfile.ZipFile(RAW / 'OSD-575_metadata_OSD-575-ISA.zip')
metadata_file = 's_OSD-575.txt'
samples = []
for index, r in enumerate(csv.DictReader(io.StringIO(archive.read(metadata_file).decode('utf-8-sig')), delimiter='\t'), 2):
    samples.append({'sourceRow': index, 'sample': r['Sample Name'], 'participant': r['Source Name'],
                    'time': r['Factor Value[Time]'], 'phase': r['Factor Value[Spaceflight]'],
                    'material': r['Characteristics[Material Type]']})
manifest = [{'file': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
            for p in sorted(RAW.iterdir())]
artifact = {'retrieved': '2026-11-15', 'files': manifest, 'samples': samples, 'records': records}
(ROOT / 'hd71.json').write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + '\n')
# Plain-text metadata copies make protocol inspection possible without extra tools.
metadata = ROOT / 'metadata'
metadata.mkdir(exist_ok=True)
for name in archive.namelist():
    assert Path(name).name == name, 'Unexpected archive path'
    (metadata / name).write_bytes(archive.read(name))

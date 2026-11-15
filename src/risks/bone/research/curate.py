"""Curate a documented subset; preserve every source assertion unchanged."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
records = []
selected = []
for path in sorted((ROOT / 'raw').rglob('*.csv')):
    name = path.name
    use = (
        ('C3A_All_' in name or 'C3C_7352_' in name or 'C3C_7772_' in name)
        and (name.endswith('_RH_Bone.csv') or name.endswith('_LH_Bone.csv') or name.endswith('_S_Bone.csv'))
    ) or ('C3D_3985_' in name and path.parent.name in ['hip', 'spine'])
    if not use:
        continue
    file = path.relative_to(ROOT / 'raw').as_posix()
    selected.append({'file': file, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    with path.open(encoding='utf-8-sig', newline='') as source:
        for index, row in enumerate(csv.DictReader(source), 2):
            records.append({'file': file, 'sourceRow': index, 'raw': row})
(ROOT / 'dxa.json').write_text(json.dumps({'files': selected, 'records': records}, indent=2) + '\n')

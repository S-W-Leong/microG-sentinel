"""Freeze source assertions, without reconciling or repairing measurements."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = 'BRSMACT_Campagin_1_Actigraphy.csv'
QUERY = 'BRSMACT_Campagin_1_Actigraphy_Query_Result.csv'


def read(name):
    with (ROOT / 'raw' / name).open(encoding='utf-8-sig', newline='') as source:
        return [dict(row=r, sourceRow=i) for i, r in enumerate(csv.DictReader(source), 2)]


artifact = {
    'files': [{'name': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
              for p in sorted((ROOT / 'raw').iterdir())],
    'main': read(MAIN),
    'query': read(QUERY),
}
(ROOT / 'actigraphy.json').write_text(json.dumps(artifact, indent=2) + '\n')

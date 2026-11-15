"""Curate recorded AD ASTRA items; never infer scores, anchors or study phases.

Run with python -I src/risks/mood/research/curate.py (standard library only).
"""
import csv
import hashlib
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = 'NNX12AB40G_CFT70_All_Subjects.csv'
PARTICIPANTS = ('5160', '6611', '8936')
MEASURES = ('Happy', 'Stressed', 'Fatigued', 'Relaxed')


def curate():
    rows = []
    seen = set()
    with (ROOT / 'raw' / SOURCE).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        for raw in reader:
            row = {key.strip(): value for key, value in raw.items()}
            if row['Subject'] not in PARTICIPANTS:
                continue
            key = (row['Subject'], row['DayCount'])
            assert key not in seen, 'Duplicate participant/day requires explicit review'
            seen.add(key)
            values = {}
            for measure in MEASURES:
                value = row[measure]
                values[measure] = None if value in ('', 'NA') else int(value)
            rows.append({
                'id': row['ID'],
                'participant': row['Subject'],
                'date': datetime.strptime(row['Date'], '%m/%d/%Y').date().isoformat(),
                'day': int(row['DayCount']),
                'sourceRow': reader.line_num,
                'values': values,
                'raw': {key: row[key] for key in ('ID', 'Subject', 'Date', 'DayCount', *MEASURES)},
            })
    artifact = {
        'dataset': 'NNX12AB40G_CFT70',
        'downloadDate': '2026-11-15',
        'files': [{'name': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                  for path in sorted((ROOT / 'raw').iterdir())],
        'observations': rows,
    }
    with (ROOT / 'mood-replay.json').open('w', encoding='utf-8', newline='\n') as output:
        output.write(json.dumps(artifact, indent=2) + '\n')


if __name__ == '__main__':
    curate()

# NASA dietary intake replay

Read-only Food view following Sleep's Crew check-in / NASA replay switch. The
crew panel stays mounted and is the default; research never saves inputs, emits
signals, loads scenarios, or registers research participants as crew.

## Provenance

- Dataset: **UTMB Bedrest Campaign 3 Dietary Intake**.
- Experiment: **MR016G**; catalog: `MR016G_Campaign_3_Dietary_Intake`.
- Dataset ID: `4d613f00-9304-5d1b-8d30-836bb2023079`.
- [NASA Life Sciences Portal catalog](https://nlsp.nasa.gov/search/data/details/4d613f00-9304-5d1b-8d30-836bb2023079?dataType=DATASETS).
- Download date: **2026-11-15**. Public downloads required no login.
- Credit: NASA Life Sciences Data Archive, UTMB bed-rest Campaign 3, MR016G.
- Availability is “Available online”. No separate reuse licence was stated in
  the inspected catalog metadata; public access is not a blanket licence claim.

`raw/` preserves the downloaded bytes. `catalog.txt` is the original JSON response
from `https://nlsp.nasa.gov/api/v1/data/datasets/4d613f00-9304-5d1b-8d30-836bb2023079/full`;
the `.txt` suffix keeps formatters from changing this source evidence.

| Source file                                           | Download ID                            |
| ----------------------------------------------------- | -------------------------------------- |
| `MR016G_Campaign_3_C3C _7352_Dietary_Intake_obsv.csv` | `6c82c3f2-52f4-505c-9f9c-eabc0cad3544` |
| `MR016G_Campaign_3_C3C_7772_Dietary_Intake_obsv.csv`  | `da78b1ab-dda3-5d05-8f5e-0b0159213c3c` |

Downloads use `https://nlsp.nasa.gov/api/v1/files/<downloadId>/download`.
The space in the first filename is original. SHA-256 hashes, file URLs and
download IDs are recorded in `dietary-intake.json`.

## Curation

Keep all 236 observations: 118 per participant (`C3C-7352`, `C3C-7772`), with
15 pre-test, 90 bed-rest and 13 recovery dates each. Join the source Campaign
and Subject fields to label participants; never map them to simulated crew.
Keep six columns that match Food's intake display: Energy (kcal), Total Protein
(g), Sodium (mg), Calcium (mg), Vitamin D (calciferol) (mcg), Total Dietary Fiber
(g). No conversion to IU, nutrient summation, averaging, baseline calculation,
target comparison or missing-value replacement is performed.

Keep original numeric strings, source ID, filename, physical CSV line number
(header is line 1), original date, phase and bed-rest day. Parse dates explicitly
as month/day/year to ISO date-only strings. Never invent times. Pre-test days are
negative for 7352 and positive for 7772; retain both source conventions. The chart
uses dates, not these inconsistent signs. Zero remains zero; blanks/NA/N/A become
null. The six selected columns contain no missing values in this release.
Unexpected negative/nonfinite values or duplicate participant/date keys fail
curation rather than being silently repaired.

The separate mean/stdev exports are omitted to avoid mixing summaries with daily
observations. Other nutrient columns remain available in raw files but are not
included in the small replay artifact. No published ReadMe is listed for this
Campaign 3 dataset; the catalog and explicit CSV headers supply the provenance.

Regenerate from the repository root, with no network access or extra packages:

```powershell
python -I src/risks/food/research/curate.py
```

Downloaded files are parsed only as CSV/JSON data, never executed. Curation uses
Python's standard library in isolated mode.

## Limits

Research participants are not our crew. Bed rest is a ground analog, not ISS
flight. Recorded intake does not establish requirements, absorption, a deficiency,
or clinical meaning. These are two participants from a larger experiment, not a
representative cohort estimate. The source does not supply an energy requirement
or personal dietary target here. The replay makes no clinical determination and
does not affect Food's shrimp meal, scenario loading, signals, or Immune results.

The replay bundles all selected values for offline use; source links need a
connection. Select participant, measure and visit to inspect a recorded value,
its date-based scatter chart and source evidence.

## Verification (2026-11-15)

- `npx tsc -b --noEmit`: passed on the final run.
- `npx vitest run src/risks/food`: 3 files, 36 tests passed, including the
  unchanged existing Food tests.
- `npx eslint src/risks/food` and `npx prettier --check src/risks/food`: passed.
- All 1,416 selected numeric values and original numeric strings were checked
  against the raw CSVs; all source SHA-256 hashes matched. Curation regenerated
  byte-identical JSON.
- The worker's temporary browser check passed in installed headless Chrome
  through the actual app route, using the real scenario and vector. Both
  participants, all six measures, pre-test/bed-rest/recovery boundaries and the
  final visit worked. The chart is keyboard focusable; 320 px and 1280 px had no
  document overflow, including expanded provenance. The 320 px screenshot was
  visually inspected.
- Unsaved body-mass input survived the toggle; crew inputs, vector, Food signals,
  storage and Immune evaluation were identical before/after replay browsing.
  The seeded shrimp meal was present and Immune remained 80%.
- External requests were blocked throughout the browser check, including reload.
  This verifies locally served bundled data, not fully disconnected installation
  or service-worker behaviour. No other browser, device or clinical validation
  is claimed.

The worker's scratch browser script was removed during integration. The
source-integrity and rendering tests remain in this folder.

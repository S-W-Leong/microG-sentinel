# NASA functional mobility replay

Read-only Balance replay following Sleep's source switch. Crew check-in remains
the default, mounted while hidden to preserve drafts. Research selection is local
React state with no crew store, vector, signal, timestamp or network-write path.

## Provenance

- Dataset: **UTMB Bedrest Campaign 1 Functional Mobility Test**.
- Experiment: **BRSMFMT**, Bed Rest Standard Measures: Functional Mobility Test.
- Catalog: `BRSMFMT_Campaign_1_Functional_Mobility_Test`.
- Dataset ID: `5fca791c-e1b8-5ee8-aba0-c6220789547e`.
- [NASA Life Sciences Portal dataset](https://nlsp.nasa.gov/search/data/details/5fca791c-e1b8-5ee8-aba0-c6220789547e?dataType=DATASETS).
- [Experiment DOI](https://doi.org/10.83263/ahtd-k915).
- Downloaded **2026-11-15**, without authentication from the NASA public file API.
- Credit NASA LSDA, UTMB Flight Analogs Research Unit and principal investigator
  Jacob J. Bloomberg.

NASA's catalog identifies Campaign 1 as three male research participants in
2004: 10 ambulatory days, 60 consecutive days of strict 6-degree head-down tilt,
then 14 days of rehabilitation/testing. The experiment lists NASA as its agency,
Neuroscience as its research area and postural equilibrium as a keyword.
This is a NASA ground analog dataset, not the Earth-only HBEDB.

The catalog says "Available online"; the experiment says all datasets are
publicly available. No separate reuse licence was stated in the downloaded
metadata. Public availability is not asserted as a blanket licence.

Byte-for-byte source downloads are in `raw/`. `catalog.txt` and `experiment.txt`
hold JSON API responses as inert text, including the study description and file
IDs. `mobility.json` records each source URL and SHA-256.

| File suffix           | Download ID                            |
| --------------------- | -------------------------------------- |
| `Obsv_All.csv`        | `2ec6b043-dca4-5cca-a128-5d96ef1aa77f` |
| ` Avgs_All.csv`       | `de65b904-0672-5a20-af83-a9c550b26185` |
| `Chart_Subject_1.png` | `2106a343-76b6-5563-960e-9eed4cdbf339` |

All three names start with `BRSMFMT_Campaign_1_Functional_Mobility_Test_`.
The leading space before `Avgs` is preserved. Downloads use
`https://nlsp.nasa.gov/api/v1/files/<ID>/download`. The NASA chart explicitly
labels time in seconds, verifying the CSV time unit; no chart values are digitized.

## Curation

Run `python -I src/risks/balance/research/curate.py` from the repository root.
Then format the generated JSON with the repository's existing Prettier.
The script uses Python's standard library only and never executes downloaded data.
It preserves all 108 trial records and all 18 published summary records with
physical one-based CSV row numbers (header is row 1) and original strings.
The selected files provide a small, complete trial export for three participants,
six visits each, six trials per visit. Redundant participant-specific exports and
the remaining PNG charts are omitted; this is not all BRSMFMT campaigns.

`replay.ts` parses numeric time and total hits, retaining NA as null and measured
zero as zero. It rejects malformed values. Original obstacle fields, comments,
directions and summary assertions remain available in source evidence. Dates are
absent from the CSV and never inferred from the campaign dates. PRE_TEST and
POST_TEST plus the original BR_Day distinguish visits; no calendar or mission
timeline is manufactured. Test selection filters clockwise/counterclockwise
course trials within the selected participant and visit; original trial numbers
and recorded directions are retained.

The main display shows individual trial time and recorded total hits, never a
baseline comparison. The small bars compare times only within the visible visit.
Detailed evidence shows the published average beside a clearly labelled local
arithmetic mean of all six trials. These are distinct assertions. A mismatch
over 0.011 seconds (allowing two-decimal rounding) is labelled; neither source
is overwritten. Missing or duplicate trial numbers prevent that local mean.

Known discrepancy: C1G0001 POST_TEST day 0 has times 32.96, 31.80, 29.35,
25.82, 28.77 and 25.29 seconds, whose mean is 28.998333 seconds. The summary
instead reports Avg. Time 25.29 and Min. Time 25.82. The NASA chart also shows
25.29; this is not silently corrected. The source does not explain the discrepancy.

The catalog describes three trials per direction. C1G0001 POST_TEST day 11
actually records four CW and two CCW trials; those source directions are preserved.

## Limits

Research participants are not the app's crew. Course completion times and obstacle
hits are not angular sway, force-platform measurements or a vestibular score.
No inference, diagnosis, clinical meaning, risk category, treatment, interpolated
data or simulated research value is generated. Raw comments are historical source
notes, including protocol interruptions, not advice. Direction ordering varies
between visits and is not normalized. The small ground study does not establish
spaceflight outcomes or a personal crew baseline. Research navigation does not
save inputs, emit vector signals or alter the selected crew.

## Verification (2026-11-15)

- `npx tsc -b --noEmit`: final run passed. An earlier run reported concurrent
  Microbiome test errors; no files outside Balance were changed by this worker.
- `npx vitest run src/risks/balance`: four files, 22 tests passed.
- `npx eslint src/risks/balance` and `npx prettier --check src/risks/balance`: passed.
- All five raw-file SHA-256 values match. Re-running curation reproduces identical
  parsed JSON content; run Prettier after generation for repository formatting.
- Actual registered Balance route on port 5182, in the background browser:
  all 54 participant/visit/direction combinations matched original trial numbers,
  directions and times. The mounted crew panel, selected crew vector, latest
  Balance signals, current saved input and local storage remained unchanged
  during the selector sweep. An unsaved dizziness value survived toggling back.
- At 320 CSS pixels, all combinations and expanded source details had no document
  overflow. The top of the mobile view was visually inspected; later screenshot
  attempts timed out, so a complete visual review is not claimed.
- Preview tab closed and the port 5182 server stopped after checking.

No production build, disconnected installation/service-worker test, sensor test
or clinical validation was performed. Runtime data are bundled JSON, with no
research fetch path; external links are attribution links only.

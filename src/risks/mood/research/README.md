# NASA mood replay

## Provenance

- Dataset: **NNX12AB40G CFT70 DATA**, catalog ID `NNX12AB40G_CFT70`.
- Study: AD ASTRA: Automated Detection of Attitudes and States through Transaction
  Recordings Analysis, experiment `NNX12AB40G`; UTMB Campaign 11 bed-rest analog.
- [NASA LSDA catalog](https://nlsp.nasa.gov/search/data/details/046fc310-ee58-5463-a2bf-3e8c1df7cb18?dataType=DATASETS).
- [Public CSV download](https://nlsp.nasa.gov/api/v1/files/631f5fd5-5d06-59bb-a6fe-af7da20ba0e3/download),
  file ID `631f5fd5-5d06-59bb-a6fe-af7da20ba0e3`.
- Downloaded **2026-11-15**, without login, cookies or an access request.
- `raw/NNX12AB40G_CFT70_All_Subjects.csv` preserves the downloaded bytes.
  Its MD5 `1943937b329bdbd303e8f7e274023b7c` matches NASA's file metadata.
- `raw/catalog.txt` preserves the JSON response from
  `https://nlsp.nasa.gov/api/v1/data/datasets/046fc310-ee58-5463-a2bf-3e8c1df7cb18/full`.
  This includes study description and file metadata. Both raw files have SHA-256
  hashes in the curated artifact.
- Terms: the catalog says **Available online**. No separate reuse licence was
  established from the retrieved metadata; public availability is not a blanket
  licence claim. Credit NASA LSDA and the AD ASTRA investigators.

## Selection and interpretation

The full CSV has 1,208 records for 19 participants. The offline replay keeps 187
records for three participants: `5160` (92 records), `6611` (3), and `8936` (92).
This explicit demonstration subset includes a longer sequence, a sparse sequence,
and missing item values. It is not a representative population sample.

Keep only Happy, Stressed, Fatigued and Relaxed, plus source ID, participant,
date, DayCount and one-based CSV row (including the header). These four literal
source items fit the Mood tab without inventing composite scores. The raw file
retains every other field. Anxiety screening fields, text-analysis measures,
physical symptoms and other survey items are not interpreted or displayed.

Header whitespace is stripped. `NA` and blank values become `null`; measured zero
would remain zero. Dates are parsed explicitly as month/day/year and displayed
as ISO dates, with no invented time of day. DayCount remains the source index;
it is not called a flight day or a verified bed-rest phase. Absent days stay absent.
The selected records have no duplicate participant/day keys; curation rejects
duplicates for review rather than silently choosing one.

Scale anchors and scoring instructions are not supplied in the downloaded CSV
or catalog. Values are displayed as recorded, without an inferred denominator,
normalization, thresholds, baseline comparison, total score or clinical meaning.
Research subjects are not the app's crew. No screening score is a diagnosis.
The replay makes no causal claim about bed rest or a participant's condition.

## Reproduction and isolation

Run `python -I src/risks/mood/research/curate.py` from the repository root.
The script uses Python's standard library and only parses data; downloaded files
are never executed. JSON generation is deterministic and requires no network.

The component imports only React, its private adapter and CSS. It cannot save
crew inputs or emit vector signals. The Crew check-in / NASA replay switch matches
Sleep's mounted-but-hidden crew panel; crew check-in is the default. Participant
changes reset the selected source day. All data used by the replay is bundled.
An urgent crew check-in hides the switch and replay, preserving Mood's existing
contact-only state; the crew panel remains mounted throughout.

## Verification (2026-11-15)

- Mood Vitest: 31 tests passed across three files; ESLint and Prettier passed.
- Curation regenerates byte-identical JSON. Both SHA-256 hashes match, and all
  187 curated records match their raw CSV rows.
- Actual Mood route in headless installed Chrome at 320 px, with external
  requests blocked: all three participants and four measures, first/last days,
  missing values and expanded provenance passed. Document width stayed 320 px.
  The resulting screenshot was visually inspected.
- Browsing replay left the real crew vector, Mood signals, private history and
  localStorage unchanged; an unsaved mood value survived switching back.
- A live urgent draft hid the source switch and retained the contact-only panel.
- Repository TypeScript was blocked by concurrently edited SANS research tests
  importing `node:crypto` and `node:fs` without available type declarations.
  No Mood TypeScript errors were reported. Those files were not changed here.
- No production build, service-worker offline installation or other-browser
  coverage is claimed. Browser checks used the dev server on port 5184.

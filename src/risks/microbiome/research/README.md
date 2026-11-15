# NASA skin microbiome replay

Read-only Inspiration4 skin-swab research inside Microbiome, following Sleep's
Crew check-in / NASA replay switch. Crew check-in is the default and stays mounted
while hidden so drafts and local photos survive switching. Research has no vector,
crew-store, save, score, or timestamp-generation path.

## Provenance

- NASA OSDR **OSD-574**, “SpaceX Inspiration4 Deltoid Skin and Microbiome Data:
  Spatial Transcriptomics (NanoString GeoMx), Metageomics, and Metatranscriptomics”
  (source title spelling retained).
- Study: <https://osdr.nasa.gov/bio/repo/data/studies/OSD-574>
- Dataset DOI: <https://doi.org/10.26030/hn08-ja66>
- Public file API: <https://osdr.nasa.gov/osdr/data/osd/files/574>
- Downloaded **2026-11-15**, without authentication.
- Credit the Inspiration4 investigators and NASA OSDR/GeneLab; the source processing
  README credits Olabiyi A. Obayomi and protocol GL-DPPD-7107.

The public API marks the downloaded study files `restricted: false` and
`visible: true`. No separate licence was stated in the inspected ISA metadata,
processing README, or study metadata API; no blanket CC0 or human-data reuse
permission is asserted. Study attribution and original public sample IDs remain.

`raw/` preserves downloaded bytes, never executable input:

| File                                                           | Role                                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `file-catalog.txt`                                             | Original JSON API response, saved as text                                    |
| `GLDS-566_GMetagenomics_Metaphlan-taxonomy_GLmetagenomics.tsv` | Processed relative abundance table, 67,940 bytes                             |
| `GLDS-566_GMetagenomics_README.txt`                            | Defines the table as MetaPhlAn estimated taxonomic relative abundances       |
| `OSD-574_metadata_OSD-574-ISA.zip`                             | Study title, DOI, sample identities, material and relative collection timing |

The `GLDS-566` filenames are the actual names served by OSD-574, not a local rename
or an inferred accession. `osd574.json` records each exact download URL, byte count,
SHA-256, table row/column, original numeric string and ISA sample row. Rows and
columns are one-based physical positions including headers and the table comment.
The ZIP is read in memory for known text members only, never extracted or executed.

## What is shown

All eight processed skin-swab samples: C001–C004, each at L-44 (Launch minus 44,
pre-flight) and R+1 (Return plus 1, post-flight). These are source relative labels;
there are no invented calendar dates or in-flight measurements. The ISA study
description mentions seven spatial-transcriptomics biopsies, but its skin-swab
metadata and the metagenomics table both contain eight swabs; those are distinct
assays and are not conflated.

The chart shows six of 58 genus-level rows, selected by highest mean supplied
abundance across all eight samples: Cutibacterium, Corynebacterium, Malassezia,
Staphylococcus, GGB2722 and Streptococcus. The same set and order is used for every
sample. GGB2722 remains the source taxonomy label. Bacterial and fungal genera
retain their source taxonomy; kingdom/species/strain rows are not added together.
The source's unclassified estimate appears separately.

Values are displayed on the source's 0–100 percentage scale, without rescaling the
subset to 100%, filling an “other” category, estimating diversity, computing a
baseline, or assigning health thresholds. Display rounds to two decimals, while
source evidence retains full precision; tiny positive values display `<0.01 %`
rather than zero. Null/invalid values display `Not recorded`; reported zero stays
zero. Curation rejects incomplete genus values before ranking, duplicate rows or
columns, unexpected sample sets and contradictory identity/material/timing.

Hand check: table row 50, column 2 is C001 L-44 Cutibacterium
`88.24965757185652` (88.25% displayed); column 3 is C001 R+1
`69.00715656421609` (69.01%). C002 R+1 Malassezia is a supplied `0.0`, not missing.

## Limits

Four research participants on a three-day mission are not the app's selected crew.
Deltoid skin swabs do not measure gut composition or explain Bristol, fibre,
antibiotics or skin-photo observations. Relative abundance estimates are not
absolute counts, and reported zero is not proof of biological absence. This
subset is a research browsing example with no clinical meaning in the app; it
does not establish a flight effect, causal association or population threshold.

## Reproduce and check

From the repository root, using existing dependencies only:

```powershell
python -I src/risks/microbiome/research/curate.py
npx.cmd tsc -b --noEmit
npx.cmd vitest run src/risks/microbiome
npx.cmd eslint src/risks/microbiome
npx.cmd prettier --check src/risks/microbiome
```

Tests check raw-source hashes, every curated cell, fixed genus selection, participant
separation, zero/null handling, deterministic regeneration and read-only rendering.
Downloaded raw files are excluded from formatting by their data/text extensions.

## Verification (2026-11-15)

- `npx.cmd tsc -b --noEmit`: passed across the shared checkout.
- `npx.cmd vitest run src/risks/microbiome`: three files, 29 tests passed.
- Scoped ESLint and Prettier checks passed; the existing Microbiome `ui-check.mjs`
  received formatting-only changes to satisfy the requested whole-folder check.
- Every curated cell matches the frozen table; all four source hashes match and
  isolated Python regeneration produces identical bytes.
- Real registered route in headless installed Chrome, served on port 5180:
  all eight samples, source zero, participant reset, keyboard source/participant
  controls and expanded evidence passed. No overflow at 320 or 1280 px;
  both saved screenshots were visually inspected.
- The original crew panel remained the same mounted DOM node. Its unsaved Bristol
  draft and decoded local photo survived switching. Crew vector, latest Microbiome
  signals, private history and local storage were identical before/after research.
- External HTTP requests were blocked during browser verification; none were
  attempted and no page errors occurred. This verifies local replay loading, not
  disconnected service-worker installation, production deployment or other browsers.

The worker's temporary browser script and its two screenshots were removed during
integration. The source-integrity and rendering tests remain in this folder.

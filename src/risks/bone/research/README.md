# MR035G Bone research replay

## Design

Add a read-only NASA replay inside Bone, following the established Sleep source
switch. Participant/site/side/visit selection is private to research; it never
saves crew inputs, emits vector signals or invents timestamps. Keep the mounted
crew panel hidden when replay is selected, preserving drafts and history.
Use a separate adapter rather than forcing incomplete research scans into crew
forms or changing shared contracts, vector registrations or shell ownership.

## Download and provenance

Retrieved 2026-11-15 through NASA Life Sciences Portal's public file API.
Catalogs:
- Hip: https://nlsp.nasa.gov/search/data/details/96121725-e9bf-5084-82f9-9efd4696ae65?dataType=DATASETS
- Spine: https://nlsp.nasa.gov/search/data/details/eb66adbb-6998-5f24-9c74-2126572cd987?dataType=DATASETS
- Femur/subregions: https://nlsp.nasa.gov/search/data/details/54ca2f3a-72e5-57f2-9355-f81c70d45d7c?dataType=DATASETS
- ReadMe: https://nlsp.nasa.gov/search/data/details/92f606cc-8759-56f8-b66e-77a4329280e7?dataType=DATASETS

Downloaded 302 files: the first 100 listings each for hip (244 total), spine
(122 total), and femur/subregions (122 total), plus both ReadMes. This is an
explicit research subset, not an exhaustive download of MR035G or all Campaign 3
scans. All downloaded bytes are preserved under `raw/`. `download-manifest.json`
records file IDs and SHA-256. Individual downloads use
`https://nlsp.nasa.gov/api/v1/files/<downloadId>/download`.
Public catalog availability is verified; a separate blanket reuse licence is
not asserted. Credit NASA LSDA, UTMB Flight Analog Project, MR035G Campaign 3.

## Curation and evidence rules

Replay selects detailed hip/spine files for C3A participants, C3C-7352 and
C3C-7772, plus C3D-3985 representations to expose missing metadata. No femur
shaft/whole-body, trochanter or Ward's BMD becomes total hip or femoral neck.
Map `HTOT_BMD` / `Total Hip BMD` to total hip, `NECK_BMD` / `Femur neck BMD` to
femoral neck, and spine `TOT_BMD` to the declared lumbar region. BMD uses the DXA
areal density unit g/cm². Preserve physical one-based source row including header.

Repeated scans are not independent visits. Deduplicate overlapping exports using
source scan ID where available, otherwise participant/site/side/date/phase/day
and source record ID. Incomplete date/phase assertions retain distinct identities.
Repeated representations must agree on known values/metadata; disagreements
block comparison, never pick an arbitrary representation. Group independent
repeat scans by participant, site, side, date, phase and bed-rest day.

Visit BMD is the mean of all known repeats, only when every repeat is present
and nonconflicting. Baseline is exactly one complete PRE_TEST visit for the
same participant/site/side. Do not count triplicates as three baseline visits.
The arithmetic mean is an explicit demonstration rule, not NASA approval.

Comparison requires date ordering, positive BMD, known matching scanner serial,
scan type/mode, analysis version, ROI type, and (for spine) included vertebrae.
The protocol signature records these actual fields; it is not clinical validation.
Changes in analysis version block comparison. Missing scanner/protocol information
stays unknown. Date-only intervals use actual elapsed days / 30.4375 months.
PRE_TEST/IN_TEST/POST_TEST are bed-rest phases, never astronaut mission phases.
Unknown phase/day stays unknown, regardless of a filename's `1Y` or `6MO` suffix.

The two C3C ReadMes state the UTMB Hologic scanner tube was replaced 2006-06-09,
then recalibrated 2006-08-10. Source data were corrected with BMD ×1.0120,
BMC ×1.0107, area ×0.9987. Do not apply those factors again. A scan within that
window without explicit correction provenance cannot support comparison.
Unknown scan dates and calibration comments remain visible.

No diagnosis, fracture probability, T/Z classification, inferred nutrients,
exercise adherence, daily interpolation or crew health scores are generated.

## Implementation plan

1. Freeze and hash downloads; audit repeats, missing dates, protocol and calibration.
2. Generate deterministic selected source JSON with file/row provenance.
3. Test deduplication, visit grouping, same-person/site/side baseline gates,
   protocol/calibration/date conflicts and numeric calculations before adapter code.
4. Add participant, site/side and visit selectors, skeleton, visit chart and source
   evidence; keep the existing crew evaluator/store unchanged.
5. Run full tests, TypeScript, lint, build; verify actual registered Bone route
   in Chrome at desktop/320 px, with external requests blocked, and compare crew
   vector/signals/history/drafts before and after browsing research.

Regenerate: `python3 src/risks/bone/research/curate.py`.

## Audit results

The selected artifact preserves 285 source rows from 20 files for seven
participants. Overlapping original/6MO/1Y exports repeat earlier scans; filename
suffixes do not establish scan date or study phase. C3A detailed files include
scanner serial 49354, scan type/mode, analysis version and ROI/vertebra metadata.
Later 12.4 analysis versus a 12.3 baseline is a protocol change and blocks rates.
C3D-3985 exports lack scanner/protocol fields, so they show raw BMD without rates.
Some C3C hip rows explicitly have unknown scan dates; never fill those from
another representation's analysis date or a neighbouring row.

Hand check: C3A-224 right total hip pre-test repeats 1.134, 1.114, 1.114 yield
1.1206666667 g/cm². The 2005-05-09 repeats 1.084, 1.095, 1.092 yield
1.0903333333 g/cm². Across 70 days this is −2.70672219% total, or
−1.17694081%/month under the documented 30.4375-day convention. These are
research comparisons, not an astronaut record or a clinical classification.

## Verification

The actual registered Bone route was exercised in installed Chrome, both dev
and production, with external requests blocked. All seven participants, every
available site/side and visit, missing scanner metadata, unknown dates, changed
protocols, keyboard skeleton selection and 320 px layout passed without page
errors. Expanded provenance did not cause document overflow; charts scroll
inside their labelled containers. Crew vector, current Bone signals and private
history were identical before/after; the unsaved crew timestamp draft survived.
Production storage was unchanged. No wearable/hardware or clinical validation
is claimed, and browser coverage is Chrome only.

All 302 downloaded source hashes match, and curation regenerates byte-identical
JSON. Test, TypeScript, lint and production-build results are reported in the
completion message. Vite's existing large-chunk warning remains.

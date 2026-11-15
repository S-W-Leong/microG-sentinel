# OSD-575 laboratory research replay

## Design and ownership

Add a read-only `NASA labs` view inside Immune, with independent participant,
marker and sample selection. The existing hives workflow stays mounted but hidden
while browsing research, preserving photos, drafts and crew records. Research
never calls `saveImmune`, changes the crew store, emits vector signals, or feeds
the hives score. All changes stay under `src/risks/immune/`.

Use one assay platform first: Eve Technologies HD71. Combining Alamar NPQ,
HD71 pg/mL and metabolic results would mix incompatible methods and units.
Do not convert log2 NPQ to pg/mL or present a protein measurement as hives evidence.

## Download and inspection

NASA OSD-575, SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac
Cytokine Arrays: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
DOI: https://doi.org/10.26030/mc5d-p710

Retrieved 2026-11-15. `file-catalog.json` freezes the API response from
https://osdr.nasa.gov/osdr/data/osd/files/575 . Downloaded all nine visible,
unrestricted files, unchanged under `raw/`, including metadata ZIP and the
submitted Alamar workbook. URLs are `https://osdr.nasa.gov` plus each catalog
`remote_url`. The generated artifact includes SHA-256 and byte lengths for all
nine downloads. NASA's study page lists CC0-1.0; retain study attribution.

Inspection of CSV headers, records and ISA protocols found:
- HD71: 1,988 submitted results, 71 markers × 28 samples; all concentrations
  labelled pg/ml and assay type HD71. The wide transformed CSV has the same
  28 samples and 71 concentration columns plus supplied percent columns.
- Four research participants C001–C004 have L-92, L-44, L-3, R+1, R+45, R+82,
  R+194 samples. The study description omits R+194; the actual files and sample
  metadata include it. No absolute sample timestamps or in-flight measurements
  are invented from relative labels.
- Cardiovascular HDCVD9: 252 submitted results, nine markers × 28 samples, mixed
  pg/ml and ng/ml. Downloaded and inspected, not used in this Immune replay.
- CMP: 531 submitted rows and 28 transformed samples, with missing values.
  Downloaded and inspected, not used for immune scoring or classification.
- Alamar transformed panel: 203 marker pairs and 27 samples; C003 L-44 absent.
  ISA describes NPQ as log2 IPC-normalized counts, not mass concentration.
  The submitted workbook is retained; no workbook-derived results are used.
- ISA says HD71 concentrations were extrapolated using a standard curve and
  supplied percentages normalized by the average pre-flight values of all crew.
  These percentages are source annotations, not illness probabilities or
  within-person changes. The replay keeps them only in source evidence.

## Evidence and calculations

Use submitted HD71 concentrations as the primary representation; cross-check each
against the matching transformed sample/marker cell. Preserve both physical rows,
column, source strings and percent annotations. A mismatch or duplicate is
conflicting; never silently repair or average representations. Match ISA sample
identity, serum material and pre/post-flight phase. Unknown, qualified/censored,
negative, malformed or missing concentrations remain null in calculations while
their original strings remain visible. A measured zero stays zero.

Baseline is the arithmetic mean of exactly three compatible pre-flight samples
for the same participant, HD71 marker and pg/mL units: L-92, L-44, L-3. Every
included sample must pass the evidence gates; never drop one to rescue a mean.
This is an explicit demo assumption, not a NASA-approved baseline method.
For post-flight samples show current minus baseline in pg/mL, and optionally
percentage change only with a strictly positive baseline. Zero baselines still
permit absolute differences. Pre-flight samples are displayed without using
later pre-flight samples to construct a comparison for that earlier visit.

No clinical thresholds, diagnosis, treatment, overall immune score, hives-pattern
percentage, allergy attribution or food-driven personalisation applies here.
Four people on a three-day mission do not validate universal astronaut thresholds.

## Implementation plan

1. Download all unrestricted files and preserve catalog/metadata/provenance.
2. Generate a deterministic HD71 artifact with source and transformed assertions.
3. Write failing tests for same-person baselines, units/platform, nulls/zero,
   duplicate/conflicting samples, qualifiers, timing, and source reconciliation.
4. Implement a pure evaluator and labelled participant/marker/sample replay with
   a chart and expandable source evidence; add a source switch outside the crew
   frame without changing the existing evaluator or shared contract.
5. Run full tests, TypeScript, lint and build; verify real registered route in
   Chrome at desktop/320 px with external requests blocked, including preserved
   crew vector/signals/history, hives result, unsaved draft and local photo.

Regenerate: `python3 src/risks/immune/research/curate.py`.

## Audit result and verification (2026-11-15)

All 1,988 submitted HD71 concentration values match the transformed cells
numerically. All 28 sample identities, serum material and relative timing match
ISA sample metadata. The submitted `Timepoint2` field uses `Preflight` for the
three pre-flight visits, but repeats the literal R+ timepoint after flight; it is
not uniformly a pre/post-flight category. Preserve this source convention.

Hand check, C001 IL-6: pre-flight values 2.87, 2.58, 5.94 pg/mL average
3.7966666667 pg/mL. R+1 is 6.86 pg/mL: +3.0633333333 pg/mL, or +80.68481124%
vs that participant's mean. The supplied Percent is 185.2802161, based on the
all-participant reference; it is not substituted into the personal comparison.

- `npm test`: 43 test files passed; 451 tests passed, one existing test skipped.
- `npx tsc -b`, `npm run lint`, `npm run build`: passed; Vite retains its
  large-chunk warning.
- All nine raw-source SHA-256 hashes match and curation regenerates identical
  bytes. The retained Alamar workbook ZIP integrity check passes; no results are
  extracted from it for the replay.
- Actual registered Immune route in installed Chrome, dev and production:
  selected all four participants and 71 markers per participant, and all seven
  sample visits for IL-6. Verified pre-flight unavailable comparison, post-flight
  results and independent supplied source-percent evidence.
- At 320 px, including expanded source/manifest evidence, no document overflow;
  charts scroll inside a labelled keyboard-focusable container. External requests
  were blocked and there were no browser page errors.
- After browsing research, the real dev vector, immune signals, saved symptom
  history and hives evaluation were identical. The production crew headline and
  storage were unchanged. Unsaved symptom selection and a decoded local photo
  retained their values and preview URL after switching sources.
- Browser coverage is Chrome only; no hardware, clinical validation or trained
  image inference is claimed.

Review: only owned Immune paths changed for this task; the existing hives model
and shared vector contract are unchanged, with no research save/emission path.

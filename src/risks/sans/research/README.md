# NASA SANS research replay

Read-only OCT records from **OSD-679 / LSDS-81**, _Head-Down Tilt As a
Model for Intracranial and Intraocular Pressures, and Retinal Changes during
Spaceflight (Eye, MRI, Optical Coherence Tomography, Tonometry, A-scan)_.

- Dataset: https://osdr.nasa.gov/bio/repo/data/studies/OSD-679
- DOI: https://doi.org/10.26030/tcr8-y747
- Public file listing: https://osdr.nasa.gov/osdr/data/osd/files/679
- Download date: **2026-11-15**. All downloads succeeded without login.
- Credit: NASA OSDR / ALSDA, Charles Fuller and the study investigators.
- NASA Open Data lists access as public and links its licence field to
  https://www.usa.gov/government-works; its displayed licence category is
  `other-license-specified`. No broader blanket reuse licence is asserted.
- Catalogue terms source:
  https://data.nasa.gov/dataset/head-down-tilt-as-a-model-for-intracranial-and-intraocular-pressures-and-retinal-changes-d-6a461

## Source files

`raw/` preserves downloaded bytes. `files-api.txt` is the unmodified JSON
response, stored as text to avoid formatter changes. `oct.json` lists exact
download URLs and SHA-256 hashes for each downloaded file.

The OCT transformed CSV supplies measurements in **millimetres**. The ISA ZIP's
`s_OSD-679.txt` supplies animal IDs, species, eye sides, groups and durations.
Only that named text member is read; the archive is never extracted or executed.
The source ReadMe describes Long-Evans rats in a hindlimb suspension ground
analog and Bioptigen spectral-domain OCT. The data dictionary and tonometry CSV
were downloaded during inspection; they are retained for provenance but are
not used for replay values. Large imaging archives were not downloaded.

## Selected records

Six young male rats, both eyes: MT51, MT66, MT01, MT08, MT07 and MT305.
This small, deliberate subset covers 7-day and 14-day unloading, missing
baseline values, a normally loaded control, recovery, and baseline-only data.
It is not a representative sample or the complete study.

The replay preserves nasal, temporal and linear total-retinal and choroidal
thickness for the source columns `Baseline`, `End_of_Hindlimb_Unloading` and
`End_of_Recovery`. Compact labels are Baseline, Unloading end and Recovery end.
Controls use the same source columns but were not unloaded. Empty columns do
not prove that a visit occurred; they display `Not recorded`. No calendar dates
or timestamps are invented, and phase positions do not imply equal intervals.

`curate.py` selects 12 unique eye rows, joins exact sample IDs to metadata,
preserves original raw cell strings and one-based physical source row numbers,
and parses numeric cells without imputation, averaging or unit conversion.
Empty/NA cells become null; zero remains zero. Unexpected numeric values,
duplicate selected eye rows or duplicate selected metadata fail curation.
The full OCT CSV contains other duplicate sample names; those are outside the
explicit subset and are not silently merged into this replay.

Hand checks: MT51 right nasal baseline is 0.231 mm and unloading-end is
0.228 mm (CSV row 14). MT01 right nasal baseline is blank, while its baseline
choroid is 0.047 mm (row 47). MT07 left nasal recovery is 0.084 mm (row 131);
the unusual source value is preserved, not corrected or interpreted.

## Boundaries

These are **research animals, not our crew**. Animal findings have no clinical
meaning in this app and are not human SANS measurements. Total retinal
thickness is not peripapillary retinal nerve fibre layer thickness. No
diagnosis, risk score, treatment, baseline delta or crew comparison is generated.
We do not independently validate the original measurements or source
transformations. Original source workbooks and images are not reconciled.

Research has local selector state only, static bundled JSON and no network,
crew-store or vector mutation path. The crew check-in remains default and
mounted while hidden, matching Sleep's source toggle. Returning restores drafts.

Human sources checked first: NLSP `ESA_BRSM_Ocular` (VaPER), `Ocular_Test`,
`Fluid_Shifts` and `CO2_Head_Down_Tilt` require data requests; DSO 472 public
results are summary graphs, and the optic-disc table in DSO 474 describes
camera repeatability rather than the requested participant/eye/visit replay.
OSD-679 provides public, directly relevant animal OCT data instead.

## Reproduce

Run `python -I src/risks/sans/research/curate.py`, then
`npx prettier --write src/risks/sans/research/oct.json` for repository formatting.
Only Python's standard library is needed for curation; downloaded files are
never executed. Tests verify source hashes, every selected numeric cell,
missing values, eye/animal separation, source identity and crew isolation.

## Verification (2026-11-15)

- `npx tsc -b --noEmit`: passed.
- `npx vitest run src/risks/sans`: 28 tests passed across three files.
- `npx eslint src/risks/sans` and `npx prettier --check src/risks/sans`: passed.
- The worker's temporary browser check passed against the real registered
  SANS route for SIM-PLT in installed Chrome, headless, with external HTTP
  requests blocked on port 5181. The scratch script was removed during integration.
- All six animals, both eyes, three scan regions and three source visit columns
  were exercised. Expanded provenance had no document overflow at 320 and
  1280 px. Crew history, current record, vector, signals and local storage were
  unchanged; an unsaved chart draft survived source switching. No page errors.
- This verifies a served development route, not a production service-worker
  installation, other browsers, original OCT images or clinical validity.

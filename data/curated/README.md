# MR080G research replay

Frozen, offline selection from NASA Life Sciences Data Archive / NASA Life Sciences Portal, **MR080G, UTMB Flight Analog Project, Campaign 3, Physical Fitness Evaluation - Cycle Ergometry**. These are bed-rest research participants, not astronauts. Dataset: https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS . Curated from the supplied download on 2026-11-14; the portal was not re-fetched. Raw files remain unchanged.

`mr080g_replay.json` contains 18 unit-specific representations of seven test occasions: four for 3985, one for 0224, two for 5580. Each occasion has separate absolute and mass-normalized records; two occasions also have linked contradictory representations. These are not 18 independent tests. `src/data/replay.ts` is an identical typed offline projection, checked by a test.

## Selected records

| Participant | Recorded date | Study phase | VO2peak L/min | VO2peak mL/kg/min | Provenance / handling |
|---|---|---|---:|---:|---|
| C3D-3985 | 2007-01-22 | PRE_TEST, BR-12 | 2.60 | 28.6 | Peak summary row 7; first baseline |
| C3D-3985 | 2007-01-27 | PRE_TEST, BR-7 | 2.85 | 31.2 | Peak summary row 8; second baseline |
| C3D-3985 | 2007-05-06 | POST_TEST, BR+0 | 2.04 | 22.1 | Peak summary row 5; immediate post |
| C3D-3985 | 2007-05-17 | POST_TEST, BR+11 | 2.80 | 29.3 | Peak summary row 8; recovery |
| C3A-0224 | 2005-03-03 | PRE_TEST, BR-4 | 2.02 | 22.4 | Summary ReadMe lines 18-21; calculated submaximal estimate; identity conflict |
| C3G-5580 | 2009-05-29 | POST_TEST, BR+0 | 1.27 | 17.7 | 090529 GXT summary row 5; distinct context session, no baseline selected |
| C3G-5580 | **2009-05-29 versus 2009-06-09** | **BR+0 versus BR+11** | 1.59 | 21.7 | 090609 GXT summary row 6 versus same-stem calculation ReadMe; date conflict |

All row numbers are physical, one-based lines including the CSV header as row 1. Every JSON record has repository-relative source paths and row or named-field references in `sourceNotes`. Full filenames, rather than these shortened table descriptions, are authoritative.

## Mapping to Assessment

| Contract field | Source / curation rule |
|---|---|
| `id` | Stable local MR080G participant/file-date key, ending ABS or REL; file-date keys are identifiers, not adjudicated dates |
| `subjectId` | Campaign plus participant, e.g. Campaign=C3D and Subject=3985 become C3D-3985. C3A-0224 retains the zero in C3A_0224 filenames / BR0224-3 ReadMe. Contradictory summary Subject=C3A is preserved literally in its metadata representation |
| `source` | Always nasa-research-replay |
| `date` | Calendar conversion of the source Date / Test Date field to ISO, retaining each conflicting assertion separately |
| `phase` | PRE_TEST maps to pre-bed-rest; POST_TEST BR+0 maps to post-bed-rest; BR+11 maps to recovery as a display convention. No bed-rest measurements selected. A within-test stage named Recovery is not a longitudinal recovery assessment |
| `metric` | VO2peak from Stage=Peak oxygen uptake and ReadMe VO2pk / RVO2pk labels; never VO2max merely because a test is called Maximum Cycle. Metadata-only rows have null metric |
| `value`, `unit` | 3985: VO2 (L/min) and VO2 (ml/kg/min). 5580: GXT VO2 and RVO2 cross-checked with calculation ReadMe VO2pk / VO2pk Rel and Data_Entry VO2 / VO2 (ml/kg/min). 0224: ReadMe VO2pk and RVO2pk, calculated without resting data. Units normalize spelling to L/min and mL/kg/min, without numeric conversion |
| `bodyMassKg` | Weight_kg, Body Weight or ReadMe WT (kg). Preserve source-specific 5580 disagreement; never recompute supplied relative values from weight |
| `method` | Graded cycle ergometry, reported peak oxygen uptake, based on cycle test descriptions and increasing workload stages. 0224 separately uses Submaximal cycle estimate, calculations without resting data |
| `modality`, `protocol` | cycle ergometer; 5580 ReadMe Device=Lode, Pedal Cadence=75, Protocol=Light. Other protocol strings null because no named protocol was established; not proof that all procedural details match |
| `isBaseline` | True only for the two 3985 pre-tests, separately in each unit |
| `duplicateOf` | Same occasion and same unit, different representation. Links 0224 contradictory metadata to its submaximal estimate, and 5580 June ReadMe to June summary. The May and June 5580 files are not linked as duplicates of each other |
| `sourceNotes` | Raw file paths, row/field locations, cross-checks, assumptions and unresolved issues; filenames and paths are provenance, never executable input |

## Baseline assumption and verified arithmetic

The arithmetic mean of **both** selected 3985 pre-bed-rest tests is an explicit demonstration assumption, not a NASA-approved baseline selection rule. Alternative GXT summaries confirm each peak but are not additional sessions. Absolute and mass-normalized measurements remain separate; no unit conversion or rounding occurs before the final displayed percentage.

- Absolute baseline: (2.60 + 2.85) / 2 = **2.725 L/min**.
- Mass-normalized baseline: (28.6 + 31.2) / 2 = **29.9 mL/kg/min**.
- Immediate post: 2.04 / 2.725 × 100 = **74.9% absolute**, 22.1 / 29.9 × 100 = **73.9% relative**.
- Recovery: 2.80 / 2.725 × 100 = **102.8% absolute**, 29.3 / 29.9 × 100 = **98.0% relative**.

The brief's baseline and relative retention numbers match the raw data. Its percentages must not be reused for the absolute series. These comparisons are supported within the demonstration's documented basis, not clinically adjudicated. Every research result has reference state `not-applicable`.

## Actual conflicts and unresolved issues

**0224: swapped identity columns, not evidence of two actual participants.** `MR080G_Campaign_3_C3A_0224_Submax_050303_summary.csv` has header Campaign,Subject but rows 2-6 contain 224,C3A. The matching `..._data_entry_avgs.csv` rows 2-4 contain C3A,224, and the summary ReadMe identifies BR Campaign 3A / BR0224-3 (lines 4 and 10). Date, workloads and stage values establish the same assessment. We retain the likely transposition unresolved. The estimated peak comes from the summary ReadMe lines 20-21, not the 75% workload value or within-test Recovery stage. The metadata-only duplicate has subjectId=C3A, null value and null metric. Its unit only associates it with the relevant estimate series. Existing logic detects the linked identity disagreement and returns `conflicting` for both representations. Neither is marked baseline. The differing identity strings are source assertions, not a claim that C3A is a real participant.

**5580: June file carries May metadata while the peak values differ from May's session.** `...C3G_5580_Peak_090529_gxt_summary.csv` row 5 reports May 29 / BR+0 / 1.27 L/min / 17.7 mL/kg/min. `...C3G_5580_Peak_090609_gxt_summary.csv` row 6 still reports May 29 / BR+0, but its peak is 1.59 / 21.7. The June Data_Entry averages row 4 repeat that May metadata and the higher values. In contrast, `...C3G_5580_090609_calcs_readme.txt` lines 2-3 state June 9 / BR+11 and lines 15 and 23 give the matching higher peaks. The June data-entry ReadMe lines 7-8 independently confirm June 9 / BR+11. This is more than a filename disagreement. Linked June representations preserve both dates and trigger the existing timing check. Do not conclude there were two different peak tests on May 29 or choose the June date as a corrected fact.

The June GXT body weight is also **71.9 kg**, versus **73.3 kg** in both June ReadMes; GXT height 165.0 versus ReadMe 163.0 is an additional metadata disagreement (height is outside the contract). Existing logic blocks the date conflict but does not independently diagnose mass or non-baseline phase conflicts. Those details remain in these notes. To report them as separate machine-readable issues would require an agreed contract/logic extension; none was made.

5580 pre-tests are outside this intentionally small conflict subset. Its uncontested May context records therefore return `insufficient` for missing baseline; the disputed June records return `conflicting`. We do not fabricate a baseline to make every record supported or conflicting. The checked March 17 ReadMe also says BR-12 while its GXT summary says PRE_TEST/BR_Day=13 and lists height 65.0; those March records are not bundled or resolved here.

0224's June 6 submaximal summary, inspected for context but not selected, has apparent column alignment problems (e.g. row 2 HR=87, SBP=0.31, DBP=126, RPE=78). No values from that file were imported. This curation is not an audit of the whole download.

Source labels such as Crew ID, Crewmember, Preflight Maximum Cycle and ISS Exercise Prescription are historical worksheet wording. They do not establish astronaut status, mission compliance, clinical clearance, VO2max verification, or suitability for prescribing exercise. No predicted peak, prescription, EVA or ordinary stage oxygen-uptake values are substituted for measured peaks. The explicitly identified 0224 submaximal estimate remains methodologically separate.

## Source inventory and checks

Under `data/raw/MR080G_Campaign_3_Aerobic_Capacity_`:

- `Summary/`: 3985 Peak summaries dated 070122, 070127, 070506, 070517; their GXT variants (post variants use MR080G in the filename); 0224 Submax 050303 summary; 5580 Peak 090529 and 090609 GXT summaries.
- `ReadMe/`: corresponding 3985 summary ReadMes, 070122 data-entry ReadMe and pre-test exercise-prescription ReadMes confirming VO2pk; 0224 050303 summary and data-entry ReadMes; 5580 090529 and 090609 calculation and data-entry ReadMes.
- `Data_Entry/`: 0224 Submax 050303 averages; 5580 Peak 090529 and 090609 averages and observations used as cross-checks. Exact imported fields appear in each JSON row's provenance.

`npm test` checks frozen-artifact parity, both 3985 baseline means and retained percentages, linked identity/date conflicts, duplicate exclusion from trends, and `not-applicable` reference state for every replay representation. UI behavior and clinical validity are outside these data/logic checks.

## Adaptive exercise stage artifact

`mr080g_exercise_stages.json` separately preserves stages 1–3 of four C3D-3985 occasions (070122, 070127, 070506, 070517), with physical CSV row provenance, watts, seconds, HR and Borg exertion ratings. Peak rows are excluded from these three-minute stages. At 100 W, HR is 125, 124, 166 and 139 bpm respectively. Missing device, posture, named protocol and signal quality remain unknown. May 6 termination context is retained. These are formal analog laboratory tests, not routine astronaut workout records. Existing peak replay data are unchanged.

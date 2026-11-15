# MicroG Sentinel · Battle plan v1

> **For coding agents:** this file is the source of truth. Build only inside your owner's folders (see "File ownership and integration"), implement against the TypeScript contract in "Astronaut vector" → "Agent instructions", and never use diagnosis wording. Shared facts are merged into this document.

Sections: Header · Status · The brief · The polish bar · Risk tabs (main table, indicative clinical scores, ground medical escalation, details) · Astronaut vector and signals contract · Mandatory vs Stretch · Team tracks · Build timeline · Rehearsals and backup

## Header

**Space Apps 2026 · KL · BATTLE PLAN v1**

**MicroG Sentinel** · Team (SW)²: Siang Woo + Shi Wei

An offline crew app that helps astronauts notice changes against their own baselines, starting from an interactive body map. The demo connects existing cardiovascular tracking with an immune photo-pattern match personalised by food exposure and an astronaut vector, making the relevant observations clear without claiming a diagnosis.

> “Your body changes in space. See what changed for you.”

**Tags:** Health tracking · Astronaut health monitoring

## Status

Planning snapshot: Sat 14 Nov 2026, approximately 19:00 KL. All times below are KL (UTC+8).

| Area | Status | Note |
|---|---|---|
| Cardiovascular tab | Ready | Exists: exercise check, VO2peak trend, NASA MR080G replay and export. |
| Body map home | Done | Approved 3D body map implemented in `src/shell/astronaut3d/`; prototype source is in `design/astronaut-3d-v2/`. |
| Branches | Action needed | Work from `unslop/flight-deck`. Shi Wei's `shiwei/sweep` commits ddf69d7 (17:09, guided steps) and 944d8d4 (18:21, guided values) are not merged; walkthrough text moves out of the app per the polish bar. |
| Other 7 tabs + mood | Not started | Sleep, Immune, Bone, Balance, Microbiome, SANS, Food; Mood is optional. |
| Astronaut vector | Not started | Siang Woo owns traits, baselines, exposures and personalisation reasons. |
| Slides | Not started | Seven slides; explanations belong here. |
| 30-s clip | Not started | Record the core story as both presentation asset and backup. |
| User testing | Not started | Sunday 10:00–12:00, three to five people. |
| Submission | Not started | Target Sunday 20:00 via main; one PR, Shi Wei approves. Deadline 23:59. |

## The brief

- Build for astronauts using crew health monitoring during space missions.
- Answer the Space Apps challenge: “Create Health Monitoring Software for Astronauts on Space Missions.”
- Make the body map home: Head → Sleep / Balance / Mood; Eyes → SANS; Heart & lungs → Cardiovascular; Skin → Immune; Gut → Food / Microbiome; Bones → Bone.
- Show numbers first, minimal text, and changes against the person's own baseline or reference-pattern matches.
- Give each risk its own input method and best-fit display, rather than one repeated template.
- Connect tabs only through small signals records and the astronaut vector; never read another tab's internals.
- Demonstrate Food exposure + vector allergy traits informing an Immune photo match; use shellfish, not alcohol.
- Deliver an offline React app, seven slides and a 30-second clip; distinguish real reference data from simulated crew data.

## The polish bar

- [ ] Headlines contain at most six words.
- [ ] Labels and buttons contain at most three words.
- [ ] Main-screen paragraphs contain at most one sentence.
- [ ] Monospace appears only in values, units, IDs and times.
- [ ] Orange marks only the primary action or current selection.
- [ ] Status always has a text or symbol cue, never colour alone.
- [ ] Every demo screen works at 320 px width.
- [ ] Simulated data always carries the label “Simulated”.
- [ ] Footer reads “Prototype · not for clinical use”.
- [ ] Missing values remain null, never zero.
- [ ] Results use pattern-match or personal-baseline language; no “healthy”, “safe”, “cleared”, diagnostic claims, treatment or prescription wording.
- [ ] Use VO2peak, never VO2max; explanations stay in slides or an optional explainer site.


# Risk tabs

Scope and ownership are merged into this document. This is the tab design specification; the [contract section](#astronaut-vector-and-signals-contract) defines the authoritative serialized fields, validation limits, vector API and personalisation rules. The signal lists below match its v1 interfaces. Inputs describe form fields, not extra shared fields. Keep raw input details and chart histories private to each tab.

All proposed numeric ranges are input domains, not medical thresholds. Numeric values must be finite; `null` means unknown, never zero. A known zero is valid only where the domain includes zero. Every observation carries crew identity, observation time, source, and simulation status through the contract section; convert explicit offset-bearing form timestamps to its UTC ISO format before emission. Dates in existing cardiovascular records retain their existing date-only semantics. Never join different people, research participants and crew, or real and simulated observations into a personal baseline.

Common presentation: body map is home; shared regions open a short tab selector. Headlines have at most six words, labels/buttons at most three, and each main-screen paragraph has at most one sentence. Values come first; optional details hold methods and provenance. At 320 px, side-by-side displays stack without losing labels. Status uses text and symbols as well as colour; orange marks only the primary action/current selection. Every simulated observation and derived result shows `Simulated`; every screen has `Prototype · not for clinical use`. Missing values show `Not recorded`; unavailable comparisons show `Baseline needed` or `Comparison unavailable`, not a zero, risk colour or implied result. Reference links open dataset information, not a claim of dataset integration.

Each tab has exactly five metric groups; paired quantities remain separately labelled with their own units. Direction means a change worth noticing, not a clinical classification. Personal targets are explicitly entered medical-team/tab configuration; the contract section does not yet expose a target object. Sleep debt alone uses its documented eight-hour demo reference. Do not silently invent other universal targets. Links navigate to another tab with the same crew/time context; all data passes through the vector, never another tab's internal state. Reasons describe observed associations, never proven causes. Only Immune has an illustrative similarity percentage; other tabs report measured change or clearly labelled raw/target observations. The wording templates below describe screen text: the shared evaluation envelope follows the contract section, so raw sleep debt, nutrient targets and gut-day counts do not become baseline changes. Use a null envelope when its required baseline/model is unavailable, while retaining raw observations.

## Main table — one row per tab

| Tab | Body-map region | Owner | Input method | Display | 5 metrics (short) | Evaluation example | Links to other tabs | Dataset (linked) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cardiovascular | Heart & lungs | Shi Wei | Existing exercise readings + VO2peak report | Workload dot comparison + VO2 trend | HR bpm; VO2peak baseline %; Borg 6–20; resting HR bpm; missing count | `100 W: +41.5 bpm vs baseline · 73.9% retained` | Sleep, Food, Balance | [NASA MR080G](https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS) |
| Sleep | Head | Shi Wei | Wearable import or morning check-in | Night-stage line + 24 h shift overlay | Sleep h; efficiency %; KSS 1–9; fatigue 1–7; clock shift h | `Sleep debt 6.5 h over 3 days` | Cardiovascular, Balance, Mood | [Sleep-EDF Expanded](https://www.physionet.org/content/sleep-edfx/1.0.0/) |
| Immune | Skin | Shi Wei | Photo upload + five observation groups | Photo/reference comparison + similarity bars | Wheals 0–3; itch 0–3; shape yes/no; fade yes/no; areas 0–6 | `Hives pattern 80% · ↑ because shellfish allergy + shellfish 3 h ago` | Food, Microbiome | [SCIN](https://github.com/google-research-datasets/scin), [FoodData Central](https://fdc.nal.usda.gov/download-datasets.html) |
| Bone | Bones | Shi Wei | Medical-team DXA + resistance log | Selectable skeleton, change per site | BMD %/month; load plan %; calcium mg + vitamin D IU; sodium mg; flight days | `Hip −1.2%/month · resistance load 70% of plan` | Food, Cardiovascular | [NHANES DXA](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2013/DataFiles/DXXSPN_H.htm), [NASA LSDA](https://www.nasa.gov/ames/research/space-biosciences/lsda/) |
| Balance | Head | Siang Woo | 30 s tablet stand test + ratings | Live sway trace + baseline ellipse | Open area °²; closed area °²; dizziness 0–10; sickness 0–20; tolerance 0–3 | `Eyes-closed sway 2.1× your baseline` | Sleep, Cardiovascular, SANS | [Human Balance Evaluation Database](https://registry.opendata.aws/hbedb/) |
| Microbiome | Gut | Siang Woo | Gut check-in + skin photo + antibiotics | Gut timeline + Bristol strip | Bristol 1–7; bloating/pain 0–3; fibre g/day; antibiotics yes/no; skin signs 0–3 | `Gut pattern changed 4 days · low fibre since day 12` | Food, Immune | [OSDR](https://osdr.nasa.gov/bio/repo/), [SOMA](https://soma.weill.cornell.edu/apps/SOMA_Browser) |
| SANS | Eyes | Siang Woo | Amsler + near vision + headache + medical OCT | Marked grid + vision/OCT trends | Distortion 0–3; vision lines; headache 0–10; OCT µm; sodium mg + CO₂ mmHg | `Near vision −0.5 lines vs baseline` | Food, Balance, Sleep | [NASA OSDR](https://osdr.nasa.gov/bio/repo/) (mouse retina candidate; crew OCT unavailable) |
| Food | Gut | Siang Woo | Meal photo confirmation or ISS menu pick | Nutrient rings + meal timeline | Energy need %; protein g/kg/day; sodium mg/day; calcium mg/day + vitamin D IU/day; mass kg | `Energy 78% of need for 5 days · −1.4 kg` | Immune, Bone, SANS, Microbiome, Cardiovascular | [USDA FoodData Central](https://fdc.nal.usda.gov/download-datasets.html) |
| Mood (optional) | Head | Siang Woo | 20 s sliders + conflict flag | Calendar heatmap with workload marks | Mood 0–10; stress 0–10; workload 0–10; isolation 0–10; conflict yes/no | `Mood 3/10 · workload 8/10` | Sleep, Food | [HERA Standard Measures](https://nlsp.nasa.gov/explore/home/lsda_sm_hera) |

## Indicative clinical scores

Where an established screening score exists, the tab computes it (self-report) or displays it (medical-team entry) and words the result as "matches the pattern for follow-up", never "you have X". Thresholds come from Earth populations, not astronauts; say so in the slides. **Verified** = checked against a primary or clinical source on 14 Nov; **Unverified** = must be checked before it appears in the app.

| Tab | Score | What it measures | Indicative threshold | Who supplies it | Status |
|---|---|---|---|---|---|
| Cardiovascular | VO2peak % of pre-mission | Aerobic capacity retained | < 80% = below the NASA-STD-3001 V1 4003 reference | Test report | Verified (existing app) |
| Sleep | PSQI (Pittsburgh Sleep Quality Index), 0–21 | Sleep quality over the past month | > 5 = poor sleep quality (sensitivity 89.6%, specificity 86.5% in the 1989 validation) | Self-report | Verified |
| Sleep | KSS (Karolinska Sleepiness Scale), 1–9 | Current sleepiness | ≥ 7 = sleepy | Self-report | Unverified |
| Immune | UAS7 (Urticaria Activity Score, 7 days), 0–42 | Daily wheals 0–3 + itch 0–3, summed over 7 days | 0 none · 1–6 well controlled · 7–15 mild · 16–27 moderate · 28–42 severe | Self-report | Verified |
| Immune | Jackson cold score | 8 cold symptoms, each 0–3 | Total ≥ 14 over 6 days plus feeling of having a cold = likely cold (original criteria) | Self-report | Verified |
| Immune | Latent virus reactivation (saliva) | Dormant viruses becoming active | Detected / not detected | Lab result, display only | Context (NASA measures this) |
| Bone | DXA Z-score | Bone density vs same age group | ≤ −2.0 = below expected range for age | Scan result, display only | Unverified |
| Balance | MISC (Misery Scale), 0–10 | Motion sickness symptom stage | 0–1 none · 2–5 pre-nausea · 6–9 nausea · 10 vomiting; ≥ 6 used as nausea cut-off | Self-report | Verified |
| Microbiome | GSRS (Gastrointestinal Symptom Rating Scale) | GI symptom burden | Higher = more symptoms; no fixed cut-off | Self-report | Unverified |
| SANS | Frisén scale, grade 0–5 | Optic disc swelling | ≥ 1 = swelling present; good for change over time, limited inter-rater agreement | Eye exam, display only | Verified |
| Food | MUST (Malnutrition Universal Screening Tool) | BMI + unplanned weight loss (+ acute illness) | Weight loss < 5% = 0, 5–10% = 1, > 10% = 2; total ≥ 2 = high risk | Self-report + mass | Verified |
| Mood (optional) | PHQ-9, 0–27 | Depressive symptoms (screener) | 10–14 moderate; ≥ 10 = positive screen (88% sensitivity/specificity, 2001) | Self-report | Verified |

## Ground medical escalation

The app never decides alone. It hands the crew member to the real channel: the **flight surgeon** (Mission Control call sign "Surgeon"), reached through the weekly 15-minute **private medical conference (PMC)** or an **unscheduled PMC** requested through the flight director for serious issues. The app prepares the review packet (existing export) so the conversation starts with evidence. It gives no treatment instructions; onboard emergency procedures stay with the crew's medical checklist.

Two escalation levels, shown as a fixed banner above the tab result (text + icon, never colour alone):

| Level | Banner text (≤ 6 words) | Action button | When |
|---|---|---|---|
| `urgent` | `Contact the flight surgeon now` | `Request call` (prepares packet, opens unscheduled-PMC request) | Any red flag below is reported, regardless of pattern scores or baselines |
| `next-pmc` | `Raise at your next PMC` | `Add to PMC` (queues packet for the weekly conference) | The problem cannot be identified: see "unidentified" rules below |

**1. Serious situations — red flags (`urgent`).** Red flags are explicit yes/no questions in each tab's input, asked whenever the tab is used. One "yes" triggers `urgent` immediately and suppresses scores and personalisation on that screen (no "80% hives" next to a breathing problem).

| Tab | Red-flag questions (any yes = urgent) |
|---|---|
| Immune | Trouble breathing or wheezing · throat tightness or hoarse voice · lip/tongue swelling · dizziness or fainting (hives plus any of these can signal a severe allergic reaction) |
| Cardiovascular | Chest pain or pressure · fainting or near-fainting · test stopped for dizziness or breathlessness (as in the MR080G record) · palpitations at rest |
| SANS | Sudden vision loss or new blind spot · severe or worst-ever headache |
| Balance | Fall with head strike · vertigo that does not settle at rest · new weakness or numbness |
| Microbiome | Blood in stool · fever with abdominal pain · unable to keep fluids down for 24 h |
| Food | Unable to eat or drink for 24 h · unplanned weight loss > 10% (MUST 2) |
| Bone | Sudden bone pain after load or impact |
| Sleep | Fell asleep during a critical task |
| Mood (optional) | Thoughts of self-harm (always urgent; show only the contact action, no score) |

**2. Unidentified problems (`next-pmc`).** Any of these:
- No reference pattern reaches the tab's minimum base match (demo rule: best base match < 40%), or fewer than the required metric groups are recorded after two check-ins.
- Evidence is `conflicting` (for example identity, date or method conflicts).
- A metric stays outside the person's observed baseline range for 3 consecutive check-ins with no linked explanation from another tab.
- The crew member uses `Something else` on the body map (a free-text entry that maps to no risk tab).
- An indicative clinical score crosses its threshold (table above) without a red flag.

Wording rules: name what was observed and why it is being shared ("Pattern not recognised · 3 check-ins outside your range"), never a suspected condition. The crew member can always request a PMC manually from any tab; the app never blocks or delays contact.

Future (stretch, not in scope): Mars communication delay — show the estimated one-way delay on `Request call` and queue the packet for transmission.

## Tab details

### Cardiovascular

**Owner:** Shi Wei. **NASA risk name:** Reduced cardiorespiratory and musculoskeletal fitness; Cardiovascular adaptations. This tab implements the cardiorespiratory part, not all musculoskeletal outcomes.

**Input:** Reuse `src/types.ts` and `src/exercise/types.ts`, preserving the existing validation and comparison rules. Vector-only limits apply at the new adapter, without rewriting historical raw records: workload 0–2000 W, HR delta −300–300 bpm, resting HR >0 and ≤300 bpm. Optional completed exercise minutes ≥0 and planned minutes >0 over the trailing 24 h produce `exerciseLoadPct` 0–500; missing plan/log stays null. This contextual signal is not a sixth displayed metric.

| Field | Type, unit and accepted domain | Provided by |
| --- | --- | --- |
| Session/subject/series IDs | Nonempty strings; existing identity/source scope | Imported record or medical team |
| Session date; baseline flag | Valid `YYYY-MM-DD` or null; boolean | Astronaut/medical team |
| Workload; stage duration/index | Number ≥0 W; number >0 s; integer ≥1 | Prescribed exercise record |
| Device/protocol; posture; preceding stages | Strings or null; `seated`/`supine`/null; prior workload/duration pairs or null | Existing exercise record |
| Exercise HR; effort | Number >0 bpm or null; integer 6–20 Borg or null, explicitly `borg-6-20` | Wearable/manual entry |
| Resting HR | Number >0 and ≤300 bpm or null; measured time and posture recorded | Astronaut/wearable |
| VO2peak result | Number >0; unit exactly `L/min` or `mL/kg/min`; metric `VO2peak`; report date, modality, method, protocol, phase and baseline flag | Existing report, transcribed by crew/medical team |
| Body mass; symptoms | Number >0 kg or null; symptom strings, including recorded dizziness | Crew/medical team |

Do not relabel existing VO2max source records as VO2peak; retain the legacy metric distinction and prevent mixed-metric comparison. No prompt to perform a maximal test.

**Display:** `Exercise` view shows horizontal baseline-range bars and baseline/latest dots: x = HR (bpm), y = prescribed workload (W); selecting a workload opens its recorded context. `VO2 Fitness` view shows x = report date, y = VO2peak retained (% of personal baseline), with 100% baseline and a labelled 80% NASA reference. Hollow/absent points preserve evidence gaps; incompatible values are not joined. Keep the next-observation planner, simulated fill-in interaction, and review/export accessible. A resting-HR chip and missing-reading count supplement the existing screens; they are not claims that all five metrics already exist.

**Metrics 1–5:**

1. **HR at same workload:** measured bpm (>0); change = latest − comparable baseline mean, signed bpm. An increase is notable only with matched workload, protocol and posture; no generic HR risk boundary.
2. **VO2peak retained:** `100 × current / baseline`, % ≥0 with positive baseline and same unit/method; decline is notable. The 80% line is the cited reference, not a diagnosis or clearance; research replay gets context only.
3. **Borg effort:** integer 6–20, scale points; higher effort at matched workload is notable. Missing effort stays null.
4. **Resting HR:** bpm >0 and ≤300; optional signed change vs matched resting baseline in bpm. Both upward and downward changes are shown without classification.
5. **Missing readings:** integer ≥0, count of absent HR/RPE fields among the selected current session's expected stage readings; count each field once, excluding optional fields. Higher means less evidence, not worse physiology.

**Evaluation output:** `{workload} W: {signedDelta} bpm vs baseline · {retained}% retained`; show each clause only if independently supported. Missing comparison: `Comparison unavailable · {missingItem}`. Preserve 41.5 bpm and 73.9% in detailed NASA replay; do not fabricate a single simultaneous session if those values come from separate source records.

**Uses from astronaut vector:** personal matched exercise and VO2peak baselines, resting-HR baseline, body mass, mission-day exposure, Food energy intake and Sleep debt as separate contextual reasons, not adjustments to measured HR/VO2peak.

**Signals emitted:** `workloadW`, `hrDeltaBpmAtWorkload`, `vo2PeakPctBaseline`, `exerciseLoadPct`, `restingHrBpm`, `borgRpe`, `missingReadingsCount`.

**Links to other tabs:** Food for energy context; Sleep for recent sleep context; Balance for a recorded dizziness observation. No automatic causal attribution.

**Dataset + licence + demo status:** [NASA MR080G](https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS), real curated bed-rest data already bundled, separate from simulated crew. Preserve NASA citation, source notes and research identity; no specific redistribution licence is established in the local brief, so retain portal terms and verify before adding further assets. C3D-3985 shows 73.9% then 98.0% retained and an exercise record with +41.5 bpm at 100 W/test stopped for dizziness.

**Already built?** Yes. Code inspection confirms the guided exercise screens (`Exercise.tsx`), workload dot/range chart (`ExerciseComparison.tsx`), next-observation planner, review/export, localStorage exercise episodes, manual VO2 entry/My Fitness, Understand/Evidence screens, VO2 trend (`TrendChart.tsx`) and separate NASA replay. Current root still opens the guided demo; making body map home is the settled upcoming integration, not existing behaviour. Resting-HR input and vector integration remain additions. No browser verification was performed for this document.

**Demo script line:** “At 100 W the recorded heart rate is 41.5 bpm above baseline, while the separate NASA fitness replay shows 73.9% retained capacity.”

### Sleep

**Owner:** Shi Wei. **NASA risk name:** Performance decrements and adverse health outcomes resulting from sleep loss, circadian desynchronization and work overload.

**Input:** Morning check-in fields: sleep attempt start/end (ISO timestamps with offsets, end after start, interval ≤24 h); sleep latency and awake-after-onset (numbers ≥0 min, sum ≤time in bed); naps (timestamp pairs within the same 24 h window, non-overlapping); KSS (integer 1–9); Samn–Perelli fatigue (integer 1–7); planned sleep start/end and duty start/end (timestamp pairs). Wearable alternative: timestamped stage intervals (`awake`, `REM`, `light`, `deep`, `unknown`), imported source/device ID and timezone. Do not double-count a manual episode and its wearable copy. Imported movement is optional, number ≥0 in the device's stated unit, not a substitute for sleep stage. The debt calculation uses the contract section's explicit eight-hour demo reference, not an astronaut prescription. Baseline main-sleep midpoint and planned schedule are local Sleep configuration; v1 has no midpoint/target fields.

**Display:** Night line graph with x = clock time, y = categorical stage in the order awake/REM/light/deep; unknown spans are gaps. Wearable movement, when available, gets a separate aligned strip with its own units. Manual-only entries draw a single sleep interval, never invented stages. Toggle `Night`/`24 hours`; shade duty periods and outline planned sleep, with a legend. Tap a time span for source and duration; select previous nights without changing their dates.

**Metrics 1–5:**

1. **Hours slept:** 0–24 h in the selected non-overlapping 24 h window, including naps; lower than the declared demo reference is notable. Manual duration = time in bed − latency − awake-after-onset, plus naps.
2. **Sleep efficiency:** `100 × total sleep / total time in bed` over the same trailing 24 h, 0–100%; include nap sleep and nap time in bed consistently. Null for zero/unknown denominator; lower vs baseline is notable.
3. **Karolinska Sleepiness Scale:** integer 1–9 points, 1 = extremely alert, 9 = very sleepy/fighting sleep; higher is notable.
4. **Samn–Perelli fatigue:** integer 1–7 points, 1 = fully alert/wide awake, 7 = completely exhausted/unable to function effectively; higher is notable. Use the full named scale's anchors in the selector.
5. **Body-clock shift:** signed hours in (−12, +12], shortest circular difference between scheduled main-sleep midpoint and baseline midpoint; positive = later. Larger absolute shift is notable. Label details `Sleep timing proxy`: this does not measure physiological circadian phase.

**Evaluation output:** `Sleep debt {debt} h over {days} days`; debt = sum of `max(0, 8 − hoursSlept)` over three complete, consecutive 24 h windows. Explicit demo reference 8 h/day, totals 5.5/6/6 h gives 6.5 h debt. Do not calculate a three-day debt from two days; show `2/3 days recorded` instead. Optional context line: `Schedule changed`; reserve arrows for the contract section's numerical personalisation contributions.

**Uses from astronaut vector:** sleep-hours baseline, chronotype, Mood workload/stress via `getSignals`; local schedule/midpoint configuration supplies the timing comparison. Shift timing is context, not proof that it caused fatigue.

**Signals emitted:** `sleepHours`, `sleepEfficiencyPct`, `sleepDebtHours`, `sleepinessKarolinska`, `fatigueSamnPerelli`, `bodyClockShiftHours`.

**Links to other tabs:** Cardiovascular and Mood receive sleep/fatigue context through the vector; Balance is a navigation-only link under v1, and Mood can supply coincident workload.

**Dataset + licence + demo status:** [Sleep-EDF Expanded v1.0.0](https://www.physionet.org/content/sleep-edfx/1.0.0/), Open Data Commons Attribution (ODC-By), requiring attribution. Earth sleep recordings are reference material, not crew data. Demo uses a tagged simulated night and three-day totals; no Sleep-EDF processing or wearable integration is claimed until actually implemented.

**Already built?** No.

**Demo script line:** “The night trace sits beside the shift schedule, and three recorded days reveal 6.5 hours below the declared eight-hour demo reference.”

### Immune

**Owner:** Shi Wei. **NASA risk name:** Adverse health events due to altered immune response. Hives-like visual features are one prototype observation path, not a measurement of overall immune function.

**Input:** `Upload photo` accepts a local JPEG/PNG/WebP image; also record photo time (ISO timestamp with offset), body area (enum below) and symptom onset (timestamp ≤observation time or unknown). Decode successfully before showing a preview; unreadable images produce `Choose another photo`, never a score. Keep the file local in the offline demo; no implicit upload to an external AI service. An uploaded image alone cannot supply itch, total-body count, persistence or exposure timing.

After preview, astronaut/medical team confirms exactly these five groups; values may be unknown:

| Observation group | Exact fields/type/range | Collection rule |
| --- | --- | --- |
| Wheals | Count category: integer 0–3; optional observed count integer ≥0 | Ask for total wheals over the last 24 h, not pixels or only the photographed patch |
| Itch | Integer 0–3 | 0 none; 1 mild, present but not troublesome; 2 moderate, troublesome but no interference with normal activity/sleep; 3 severe, interferes with normal activity/sleep |
| Shape | Three independent boolean/null fields: raised, clear edges, pale centre | Explicit yes/no/unknown per feature; no single unchecked checkbox meaning “no” |
| Fades within 24 h | Boolean/null, about the same individual wheal | Yes only when disappearance within 24 h was observed; new/current lesions remain unknown |
| Spread | Unique selected areas from head/neck, trunk, left arm, right arm, left leg, right leg | Array length 0–6; unknown whole-body coverage produces null, not empty array |

Medical-team/vector input: known allergy list (controlled allergen name plus confirmation status; demo has confirmed `shellfish`). Food supplies confirmed ingredients/allergen tags and actual consumed time; a meal photo guess never becomes a confirmed allergen. Distinguish `shellfish`, specific crustacean/mollusc ingredients and `fish`; do not match fish to shellfish by substring. The demo explicitly confirms a shrimp meal as shellfish.

**Display:** Top: user's photo with chosen body area and time; beside it, a labelled reference-pattern tile (stack below at 320 px). Below: five compact observation rows, then one horizontal similarity bar per available reference; x = 0–100% base reference-match fixture score, y = reference-pattern name. Each bar has its numeric value and source label; tie scores remain tied, not a forced winner. Selecting a bar opens its five recorded/unknown observation groups and score provenance; do not invent per-feature contributions. Tapping `Why this?` opens short sourced reasons and `View meal` navigates to Food at that meal's time. Do not draw inferred lesions or segmentation unless that functionality exists.

**Metrics 1–5:**

1. **Wheal category:** ordinal 0–3 points: 0 none; 1 = 1–19; 2 = 20–50; 3 = >50. Higher is more wheals. This follows the settled simplified bins; do not claim the full validated UAS instrument or infer its missing confluent-area criterion.
2. **Itch:** ordinal 0–3 points with the anchors above; higher is more interference. Together with wheal category it resembles the two UAS daily components; do not label the complete five-group set “UAS” or “UAS7.”
3. **Shape:** three categorical yes/no/unknown observations, no units. The raised/clear-edge/pale-centre combination contributes to reference similarity; more “yes” is not a severity score.
4. **Fades within 24 h:** yes/no/unknown, no units; yes is a matching feature for the illustrative hives reference, not lower risk. Never infer this from one photo.
5. **Spread:** integer 0–6 body areas, unit = areas, based on unique selections; increasing spread is notable. One close-up photo cannot establish this number.

**Evaluation output:** `{pattern} pattern {pct}%`; separate reason line `↑ because {reason}`. Judge fixture: `Hives pattern 80%`, `↑ because known shellfish allergy`, `↑ because shellfish eaten 3 h ago`. Keep `Simulated` and `Demo rule` adjacent. Show `Base match 60%` and `Personalised 80%` separately: the latter is an illustrative adjusted pattern score, not image similarity alone, disease probability or calibrated confidence.

**Base score (computed from the five metrics):** compare the confirmed groups to each explicit reference fixture; a group matches only on exact equality, with shape matching only when all three booleans match. An unknown group counts as unmatched. Base = `100 × matched groups / 5`, emitted as `hivesPatternPct`. At least three groups must be recorded, otherwise show `Pattern match unavailable · {n}/5 groups recorded` and no percentage. No partial shape credit or hidden weights. Judge fixture (contract section, `demo-immune-v1`): at `2026-11-14T11:00:00.000Z`, SIM-CDR has a confirmed shellfish allergy and a reviewed shrimp meal at `08:00Z`; rash active true, wheal band 2, itch 2, raised/clear edges/pale centre true, fade unknown, body areas 2. The simulated hives reference is wheal band 2, itch 2, all shape features true, fade true, body areas 1. Matches: wheals, itch, shape = 3/5 = **60%**. This is a synthetic reference, not a validated classifier; other reference tiles need explicit fixtures and provenance, and SCIN-derived classes must not be invented.

Photo upload → preview → confirmed/unknown groups → base reference bars → vector/Food personalisation is the full interaction. Add `Rash present` as a boolean/null input outside the five metric groups. Never infer persistence from one photo; the fixture's fade remains unknown. `Load sample` selects the labelled simulated fixture. Arbitrary photos are scored by the same five-metric rule once enough groups are confirmed; they never auto-fill values from the image.

Call `personalise` once with the base evaluation; only the vector applies the joint allergy/recent-food rule: 60 + 10 + 10 = 80, with both conditions required and no stacking. Emit base `hivesPatternPct: 60`, never 80, avoiding feedback. Details show both contributions as demo assumptions. `3 h ago` is `(observationTime − eatenAt)` in hours; the trigger window is strictly newer than six hours and not in the future. With absent/unknown allergy, unmatched/stale meal, or rash false/unknown, keep the 60% base without adjustment reasons. Each `↑` means this person is more likely than another crew member to show this pattern given their declared allergy and recent exposure; it is a documented rule contribution, never a diagnosis, proven cause or medical probability. Other context has no arrows.

**Uses from astronaut vector:** confirmed known shellfish allergy; Food's confirmed shellfish exposure and consumed time; previous skin observations if available; current observation time and crew identity. Only present matching-person, compatible-source records. No assumed causal link between meal and rash.

**Signals emitted:** `hivesPatternPct`, `rashActive`, `whealCountBand`, `itch`, `raised`, `clearEdges`, `paleCentre`, `fadesWithin24h`, `bodyAreasCount`.

**Links to other tabs:** Food opens the confirmed shrimp meal; Microbiome opens separately logged skin/antibiotic observations. Do not merge a hives-like image with “skin infection” or infer infection from it.

**Dataset + licence + demo status:** [Google SCIN](https://github.com/google-research-datasets/scin) uses the [SCIN Data Use License](https://github.com/google-research-datasets/scin/blob/main/LICENSE): retain attribution/notices and the licence link, identify modifications, and never re-identify or re-link subjects. The licence permits sharing subject to those conditions; check the chosen asset's provenance before bundling it. Hives coverage and any trained model are unverified. Demo uses explicitly simulated observations and reference fixtures, with a consented/cleared local sample photo or a labelled placeholder; no fabricated claim of SCIN photo analysis. [USDA FoodData Central](https://fdc.nal.usda.gov/download-datasets.html) is CC0; ingredient text supports human-confirmed shellfish tagging, not a universal structured allergen database. Do not use alcohol as the ISS exposure example.

**Already built?** No, including photo analysis, reference retrieval and vector/Food personalisation.

**Demo script line:** “The simulated skin-photo case shows five observations and a 60% base match adjusted to 80%, with reasons for the known shellfish allergy and shrimp meal three hours earlier.”

### Bone

**Owner:** Shi Wei. **NASA risk name:** Bone fracture due to spaceflight-induced changes to bone. The display reports measurements and training context, not fracture probability.

**Input:** Medical team enters DXA date (`YYYY-MM-DD`), anatomical site (`lumbar-spine`, `total-hip`, `femoral-neck`), areal BMD (number >0 g/cm²), scanner/protocol IDs (nonempty strings), and baseline flag (boolean); retain hip side and scan region privately in method/protocol context; never compare different sides under the same site key. Extra site enums need an agreed contract revision. Resistance log: date, exercise ID (string), prescribed sets/reps (positive integers), performed sets/reps (nonnegative integers), prescribed load (number >0 kg), actual load (number ≥0 kg), and device ID. Food/vector supplies complete trailing-24-hour calcium 0–10000 mg, vitamin D 0–100000 IU and sodium 0–30000 mg; retain source times. No completeness flag is exposed in v1, so Food emits null for an incomplete nutrient total. Mission start timestamp is explicitly entered local Bone configuration; the vector exposes derived days, not a mission-start field. All unknown fields may be null; unknown planned volume cannot produce a percentage. Use separate entries for differently loaded sets; record a fixed supported machine/device protocol so “kg” is comparable.

**Display:** Front-facing skeleton with selectable hip/spine regions. Each site has a signed numeric `%/month` label plus neutral diverging fill intensity; legend explicitly says `BMD change`. Unknown sites are hatched and labelled `No DXA`. Selecting a site opens baseline/current BMD and elapsed days; x = dates and y = g/cm² in a small site-specific two-point chart. A resistance-plan progress bar accompanies the site panel; nutrient numbers remain distinct from DXA observations. No daily interpolated bone loss between scans.

**Metrics 1–5:**

1. **BMD change per site:** `100 × (latest/baseline − 1) / (elapsedDays/30.4375)`, signed %/month. Positive baseline, later scan and matching site/scanner/protocol required; negative is a measured decline. This is a linear interval-normalized description, not a daily model or compounded forecast.
2. **Resistance load vs plan:** `100 × sum(actual kg × completed reps) / sum(planned kg × planned reps)` across the same seven-day scheduled exercise set, % 0–500 and may exceed 100; lower is less recorded volume than plan. Missing logs make the result incomplete, not zero adherence. This volume proxy is not an exercise prescription.
3. **Calcium + vitamin D:** complete trailing-24-hour calcium 0–10000 mg and vitamin D 0–100000 IU, separately shown against personal targets; below target is notable. If input is vitamin D µg, explicitly convert 1 µg = 40 IU.
4. **Sodium:** 0–30000 mg over the same trailing 24 h; above personal target is notable if a target exists.
5. **Days in flight:** integer 0–10000, floor of elapsed time since entered mission start divided by 24 h; elapsed exposure context, not a severity score. Pre-flight is labelled `Pre-flight`, not negative “days in flight.”

**Evaluation output:** `{site} {signedChange}%/month · resistance load {pct}% of plan`. Fixture: hip 1.000 →0.988 g/cm² over 30.4375 days is −1.2%/month; actual/planned volume 700/1000 kg·reps is 70%. If using date-only scan dates, calculate from their actual whole-day interval and choose fixture BMD accordingly, rather than hard-coding −1.2%.

**Uses from astronaut vector:** baseline DXA by site/method/date, Food nutrient totals and Cardiovascular exercise-load context; mission start, resistance prescription and nutrient targets are explicit local configuration, not extra v1 vector fields. Do not estimate BMD from food or resistance logs.

**Signals emitted:** `site`, `bmdChangePctPerMonth`, `resistanceLoadPct`, `daysInFlight`.

**Links to other tabs:** Food for calcium/vitamin D/sodium evidence; Cardiovascular for the exercise overview, without treating aerobic work as resistance volume.

**Dataset + licence + demo status:** [NHANES 2013–2014 spine DXA](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2013/DataFiles/DXXSPN_H.htm), public-use US government data with NCHS citation/data-use conditions; not a longitudinal astronaut baseline and this linked file is spine-specific, not the hip source. NASA LSDA spaceflight DXA requires request/access terms and is not bundled. Demo hip/spine longitudinal records are `Simulated`; no NHANES-derived flight-loss rate is claimed.

**Already built?** No.

**Demo script line:** “Selecting the hip reveals its measured interval change and the separately logged resistance volume at 70% of plan.”

### Balance

**Owner:** Siang Woo. **NASA risk name:** Altered sensorimotor/vestibular function impacting critical mission tasks.

**Input:** A 30 s stand test with tablet held to chest, explicitly a ground/partial-gravity demonstration rather than free-floating ISS standing. Record condition (`eyes-open`/`eyes-closed`), posture/device/protocol IDs, duration (number >0 s; complete demo =30), timestamped device pitch/roll (finite degrees −180 to180; unwrap before centring), and sensor permission/availability. Manual ratings: dizziness integer 0–10 (none to worst reported), motion sickness integer 0–20 (Fast Motion Sickness Scale, none to frank sickness), head-movement tolerance integer 0–3 (0 unable, 1 small motion, 2 slow full motion, 3 unrestricted reported motion). Abort/incomplete test is a recorded state; do not fill missing samples or ask the user to repeat an eyes-closed task to obtain a score. Sensor-unavailable desktop uses tagged replay, not fake live measurement. Area requires a complete 30 s record with at least three finite paired samples; retain actual sampling rate and gaps, and compare only matching acquisition protocols.

**Display:** Live x = centred roll (°), y = centred pitch (°) trace with equal axis scale, latest-point marker and 30 s progress. Overlay personal same-condition baseline ellipse as dashed outline, current ellipse solid, labelled independently. Toggle eyes open/closed only when those records exist; `Replay`/`Live` is explicit. Trace units are angular sway, never centimetres or force-plate centre-of-pressure.

**Metrics 1–5:**

1. **Eyes-open sway area:** 0–32400 deg²; 95% covariance ellipse area `π × 5.991 × sqrt(det(covariance(pitch,roll)))` from complete finite samples; higher than same-protocol baseline is notable.
2. **Eyes-closed sway area:** same definition and unit; ratio = current/baseline, dimensionless ×, only for positive baseline and comparable acquisition. No ratio across open/closed conditions or different devices.
3. **Dizziness:** integer 0–10 points; higher is more reported dizziness.
4. **Motion sickness:** integer 0–20 points; higher is more reported sickness.
5. **Head-movement tolerance:** ordinal 0–3 points, anchors above; lower is less reported tolerance, not a measured vestibular diagnosis.

**Evaluation output:** `Eyes-closed sway {ratio}× your baseline`; example 4.2 °² /2.0 °² =2.1×. Incomplete sensor record: `Test incomplete · no comparison`.

**Uses from astronaut vector:** matched angular-sway area baseline and motion-sickness history; device/protocol/gravity conditions stay in local test metadata. Sleep/Cardiovascular links are navigation only in v1: do not add undeclared cross-tab readers.

**Signals emitted:** `swayAreaEyesOpenDeg2`, `swayAreaEyesClosedDeg2`, `swayRatioEyesClosed`, `dizziness`, `motionSickness`, `headMovementTolerance`.

**Links to other tabs:** Navigate to Sleep, Cardiovascular and SANS to inspect their own observations; these are navigation-only links under the v1 consumer catalogue, without copying their private records.

**Dataset + licence + demo status:** [Human Balance Evaluation Database](https://registry.opendata.aws/hbedb/), Open Data Commons Attribution License v1.0 (ODC-By), confirmed on its registry page. Its force-platform standing measurements are background references, not interchangeable with tablet angular sway. Demo angular traces and baseline are `Simulated` unless acquired live; do not label synthetic tablet traces as HBEDB measurements.

**Already built?** No.

**Demo script line:** “The tablet trace overlays the astronaut's own baseline, with eyes-closed sway area at 2.1 times that baseline in the simulated replay.”

### Microbiome

**Owner:** Siang Woo. **NASA risk name:** Adverse health effects due to alterations in host–microorganism interactions. These are gut/skin observations, not microbial sequencing or inferred microbial composition.

**Input:** Daily date/time; explicitly changed gut pattern yes/no/unknown; Bristol stool type integer 1–7 or null (no stool recorded is null); bloating and abdominal pain as two separate integers 0–3 (none/mild/moderate/severe); appetite integer 0–3 (none/low/usual/high, context only); antibiotic use entries (name string, start/end dates or ongoing flag); optional local skin photo and three boolean/null signs (redness, warmth, discharge) confirmed by crew/medical team. Food supplies fibre 0–200 g per trailing 24 h; a non-null emitted total means the producing tab completed its data checks. “No antibiotics” requires explicit confirmation for the full last 14 days, not absence of entries.

**Display:** x = mission date; discrete Bristol strip at y =1–7 with one point per recorded stool event. Below it, separate aligned bloating/pain rows and antibiotic interval bands; select a day to view food fibre, appetite and attached skin observation. Missing days are blank, never drawn as type 1 or no symptoms. Bristol appearance labels help selection; do not generate an inferred microbial-species chart.

**Metrics 1–5:**

1. **Bristol type:** ordinal integer 1–7, no physical unit; deviation from the person's usual recorded type is notable in either direction, with low/high ends showing differing stool form.
2. **Bloating/pain:** two independently labelled ordinal 0–3 scores; higher is more symptoms, never an averaged composite.
3. **Fibre:** 0–200 g per trailing 24 h from complete Food logs; below personal target is notable; partial log totals are explicitly partial.
4. **Antibiotics in last 14 d:** yes/no/unknown; window is the preceding 14 ×24 h ending at observation time. Yes is exposure context, not automatically an adverse result.
5. **Skin signs:** integer 0–3, count of confirmed redness/warmth/discharge; unknown component makes the complete count null. More signs means more observations, not a diagnosis of skin infection.

**Evaluation output:** `Gut pattern changed {days} days · low fibre since day {missionDay}`. Crew explicitly confirms changed gut pattern for each daily check-in; count consecutive changed check-ins, integer 0–365 days, and make the run count null if a day is missing rather than inferring continuity from stool type. “Low fibre” requires complete daily totals below a documented target for every included day; otherwise omit the clause. No measured microbiome claim.

**Uses from astronaut vector:** Food fibre totals through exposures; fibre target, antibiotic dates and prior gut observations remain local to this tab, since v1 supplies no usual-Bristol baseline field.

**Signals emitted:** `bristolType`, `bloating`, `abdominalPain`, `appetite`, `antibiotics14d`, `skinInfectionSigns`, `gutChangeDays`.

**Links to other tabs:** Food for fibre; Immune for separate skin observations. An Immune hives similarity is not an infection sign.

**Dataset + licence + demo status:** [NASA OSDR](https://osdr.nasa.gov/bio/repo/) (OSD-252 is a candidate from the shared context; relevance and exact files remain unverified) and [SOMA](https://soma.weill.cornell.edu/apps/SOMA_Browser). Study/file-level reuse and human-data access terms must be checked; neither portal has a blanket licence established here. Demo uses simulated check-ins only; reference microbiology datasets do not validate stool-derived microbiome inference.

**Already built?** No.

**Demo script line:** “Four consecutive days of changed stool observations line up with recorded fibre below this astronaut's target.”

### SANS

**Owner:** Siang Woo. **NASA risk name:** Spaceflight-associated neuro-ocular syndrome (SANS).

**Input:** Amsler check per eye (`left`/`right`): marked grid locations (normalized x/y 0–1), distortion category integer 0–3 (0 none, 1 one quadrant, 2 two quadrants, 3 three/four quadrants reported distorted), viewing distance >0 cm, correction-used boolean and display calibration ID. Near-vision test: identified chart/protocol, smallest line read (number in 0.5-line increments, 0–20), same viewing distance/device/correction and date; half-lines require a chart/scoring protocol that supports them. Headache integer 0–10 (none to worst reported). Medical team enters OCT per eye: mean peripapillary retinal nerve fibre layer thickness >0 µm, scan date, device/protocol and baseline flag. Food provides sodium 0–30000 mg per trailing 24 h; crew/medical telemetry provides cabin CO₂ 0–20 mmHg with timestamp. Do not combine different OCT structures under “swelling.”

**Display:** Interactive Amsler grid, x/y = normalized grid location, with tapped distortion marks preserved per eye; no axes suggesting diagnostic measurements. Below it, aligned date trends for near-vision line change (lines) and OCT thickness change (µm), each on a separate labelled y-axis/panel. Choose left/right eye and tap points for test conditions. Sodium and CO₂ are small contextual readings with source times, not a combined score.

**Metrics 1–5:**

1. **Amsler distortion:** ordinal 0–3 quadrant category using the input anchors; higher is more quadrants reported distorted, not severity or tap count. Count unique quadrants; marks on an axis require explicit crew confirmation of the affected side.
2. **Near-vision change:** signed −20–20 lines vs personal same-chart baseline; define larger line index as finer print/better performance, so negative means fewer lines resolved. No comparison if chart, distance, correction or calibration differs.
3. **Headache:** integer 0–10 points; higher is more reported headache.
4. **OCT thickness change:** latest − personal matched baseline, signed −1000–1000 µm; positive means greater measured thickness. Display `OCT change`, not confirmed swelling or SANS.
5. **Sodium + cabin CO₂:** separately labelled 0–30000 mg per trailing 24 h and 0–20 mmHg; show change/target comparison only when a comparable baseline or target exists. Do not add the two values or claim a causal relation to eye findings.

**Evaluation output:** `Near vision {signedLines} lines vs baseline`; example `Near vision −0.5 lines vs baseline`. Separate clause `OCT {signedChange} µm` only with matched medical records. In-app uncalibrated testing shows `Display calibration needed`, not an acuity claim.

**Uses from astronaut vector:** per-eye vision/OCT baselines, Food sodium and own cabin CO₂ exposure; test conditions remain local; medical-team-provided one-carbon/B-vitamin genetic research flag (yes/no/unknown) as optional research context only, never inferred, a score multiplier or individual disease prediction.

**Signals emitted:** `eye`, `amslerDistortion`, `nearVisionChangeLines`, `headache`, `octThicknessChangeUm`, `cabinCo2MmHg`.

**Links to other tabs:** Food supplies sodium through the vector; Balance and Sleep are navigation-only links for inspecting their own observations, without causal claims.

**Dataset + licence + demo status:** Crew OCT is not public and is not bundled. [NASA OSDR](https://osdr.nasa.gov/bio/repo/) mouse retina study is a reference candidate only; exact accession and licence are unresolved, so do not invent a dataset link or treat animal findings as a human OCT baseline. Demo OCT, vision changes and genetic flag are `Simulated`; in-app grid observations can be user-entered but are not validated diagnostic tests.

**Already built?** No.

**Demo script line:** “A marked grid and separate vision/OCT trends show change against matching personal baselines without naming a condition.”

### Food

**Owner:** Siang Woo. **NASA risk name:** Inadequate nutrition.

**Input:** Meal consumed time (ISO timestamp with offset), meal photo optional local image, selected menu/FoodData Central item ID and food name (strings), confirmed portion mass >0 g, confirmed ingredient text and allergen tags (strings), confirmation status, and trailing-24-hour log-complete flag (boolean). Photo proposes a meal only; crew confirms item, portion and ingredients before totals/exposure signals are used. Nutrient values are per 100 g with source ID/version: energy ≥0 kcal; protein/fibre ≥0 g; sodium/calcium ≥0 mg; vitamin D ≥0 IU or µg with explicit conversion. Unknown nutrient fields remain null. Body mass >0 and ≤500 kg is entered separately. Personal daily targets entered by medical team as local Food configuration: energy >0 kcal/day, protein >0 g/kg/day, sodium/calcium >0 mg/day, vitamin D >0 IU/day; no inferred universal targets.

**Display:** Nutrient rings show actual/target for the trailing 24 h ending at the selected observation time; centre labels display values and units, ring arc visually caps at 100% but text retains >100%. Missing targets show raw values without a ring fraction. Sodium ring says `Of target`, never a rewarded completion state. A meal timeline beneath the rings provides exact consumed times and confirmed allergen chips; a compact date-vs-kg strip shows mass trend. Tap a meal for ingredients, portion and source; tap a nutrient for summed contributions and incomplete records.

**Metrics 1–5:**

1. **Energy vs need:** `100 × summed kcal / personal daily kcal target`, % 0–500; below target over complete days is notable. One incomplete meal day cannot establish an energy deficit.
2. **Protein:** `summed protein g / latest measured body mass kg`, 0–20 g/kg over the preceding 24 h; below personal target is notable. Unknown mass makes this metric null while raw protein remains available.
3. **Sodium:** 0–30000 mg per trailing 24 h; above personal target is notable; not a percentage of clinical risk.
4. **Calcium + vitamin D:** separately 0–10000 mg and 0–100000 IU per trailing 24 h; below individual target is notable. Vitamin D conversion: 1 µg =40 IU.
5. **Body-mass trend:** latest mass >0 and ≤500 kg, with signed −500–500 kg difference against a dated personal reference; downward change is notable in the low-energy example. State interval explicitly; no trend from one reading.

**Evaluation output:** `Energy {pct}% of need for {days} days · {signedMass} kg`. For five complete days, percentage = `100 × total energy / total daily targets`, not an unweighted mean if targets vary; all five daily totals must be below target to say “for 5 days.” Mass difference uses matched endpoints of the shown interval; omit if missing. Example: 9750/12500 kcal =78%, and 70.0→68.6 kg gives −1.4 kg.

**Uses from astronaut vector:** body-mass baseline/latest exposure, mission-day exposure, known allergies and Microbiome appetite; personal targets and full Food history remain local because the v1 vector has no target object or timeline-query API.

**Signals emitted:** `foodsEaten`, `allergensEaten`, `energyPctOfNeed`, `proteinGPerKg`, `sodiumMg`, `calciumMg`, `vitaminDIu`, `fibreG`, `bodyMassKg`, `bodyMassChangeKg`.

**Links to other tabs:** Immune receives confirmed shellfish ingredient plus consumed time; Bone receives calcium/vitamin D/sodium; SANS receives sodium; Microbiome receives fibre; Cardiovascular receives energy context. Exposure remains an observation, not a diagnosed reaction.

**Dataset + licence + demo status:** [USDA FoodData Central](https://fdc.nal.usda.gov/download-datasets.html), CC0/public-domain data; cite item IDs and dataset version for traceability. Ingredient text is not a comprehensive structured allergen source. ISS menu names must be mapped explicitly rather than claimed to be a USDA ISS-menu dataset. Demo meal events, confirmed shellfish exposure and five-day intake history are simulated; nutrient values may use actual FDC records only when their IDs/source values are retained.

**Already built?** No.

**Demo script line:** “Confirming a shrimp meal supplies timed shellfish context to Immune while the nutrient rings update from the chosen portion.”

### Mood (optional)

**Owner:** Siang Woo. **NASA risk name:** Adverse cognitive or behavioral conditions and psychiatric disorders. This optional check-in does not screen for or diagnose those conditions.

**Input:** Daily timestamp and four integer sliders: mood 0–10 (very low to very good), stress 0–10 (none to extreme), workload 0–10 (none to extreme), isolation 0–10 (none to extreme); crew-conflict yes/no/unknown. Each slider starts unset, not at zero or midpoint. User explicitly saves the check-in. NeuroVAS-style interaction is a design reference, not a claim that these five fields are a validated NeuroVAS assessment.

**Display:** Calendar heatmap: x = weekday, y = week; cell fill represents mood with printed numeric value; missing days have an empty hatch. A small workload bar in each populated cell uses a separately labelled 0–10 scale; conflict uses a text-labelled icon, never a public crew ranking. Tap a date to see that day's five values; keep optional history collapsed.

**Metrics 1–5:**

1. **Mood:** integer 0–10 points; lower vs personal pattern is notable.
2. **Stress:** integer 0–10 points; higher is more reported stress.
3. **Workload:** integer 0–10 points; higher is more perceived workload.
4. **Isolation:** integer 0–10 points; higher is more reported isolation.
5. **Crew conflict:** yes/no/unknown, no units; yes records an event, not a severity or diagnosis.

**Evaluation output:** `Mood {mood}/10 · workload {workload}/10`; optional `↓ {difference} vs your baseline` only with a defined personal baseline window. No depression score, disorder label or invented risk threshold.

**Uses from astronaut vector:** personal mood baseline, Sleep duration/fatigue and exercise-load context; calendar history remains private to Mood. Food is a navigation link only, not an appetite source.

**Signals emitted:** `mood`, `stress`, `workload`, `isolation`, `crewConflict`.

**Links to other tabs:** Sleep for temporal context; Food for meal-log navigation, without inferring psychological state from eating.

**Dataset + licence + demo status:** [HERA Standard Measures](https://nlsp.nasa.gov/explore/home/lsda_sm_hera), access by request; public redistribution licence is not established. Demo check-ins are simulated, with no HERA participant data bundled or claimed.

**Already built?** No; optional after the eight required tabs.

**Demo script line:** “A twenty-second check-in adds today's mood and workload to a private calendar without assigning a diagnosis.”

# Astronaut vector and signals contract

Status: implementation contract v1. Owner: Siang Woo. Product decisions are merged into this document. Numeric validation limits, time windows, baseline aggregation and personalisation weights below are explicit prototype assumptions, not clinical thresholds or trained parameters. This document defines interfaces; it does not claim that these interfaces already exist.

## Astronaut vector — what it is (owner Siang Woo)

The vector is a per-person, source-isolated store with three parts: declared traits, comparable personal baselines, and time-bounded exposures derived from tab signals. It is not an embedding, classifier, diagnosis, or combined health score. Tabs keep their own raw inputs and displays. Only Siang Woo writes vector internals.

All TypeScript blocks in this document form one contract. Put shared data types in `src/risks/types.ts`, and export vector functions from `src/vector/index.ts`. Reuse the existing `DataSource` and `EvidenceStatus` types through type-only imports. All numeric values must be finite. All timestamps use UTC `YYYY-MM-DDTHH:mm:ss.sssZ`; date-only input is not a timestamp.

```ts
import type { ComponentType } from 'react';
import type { DataSource, EvidenceStatus } from '../types';

export type RiskId =
  | 'cardio' | 'sleep' | 'immune' | 'bone' | 'balance'
  | 'microbiome' | 'sans' | 'food' | 'mood';
export type CrewId = string;
export type ISODateTime = string;
export type Rating03 = 0 | 1 | 2 | 3;
export type AllergenName = string;

export interface CrewTraits {
  allergies: string[] | null;
  motionSicknessHistory: Rating03 | null;
  chronotype: 'morning' | 'intermediate' | 'evening' | null;
  geneticFlags: string[] | null;
}

export interface BaselineUnits {
  hrAtWorkloadBpm: 'bpm';
  restingHrBpm: 'bpm';
  vo2PeakLPerMin: 'L/min';
  vo2PeakMlPerKgPerMin: 'mL/kg/min';
  sleepHours: 'h';
  bmdGPerCm2: 'g/cm²';
  swayAreaEyesOpenDeg2: 'deg²';
  swayAreaEyesClosedDeg2: 'deg²';
  nearVisionLines: 'lines';
  octThicknessUm: 'µm';
  bodyMassKg: 'kg';
  mood: 'score/10';
}
export type BaselineMetric = keyof BaselineUnits;
export type BoneSite = 'lumbar-spine' | 'total-hip' | 'femoral-neck';
export interface BaselineValue<M extends BaselineMetric> {
  metric: M;
  value: number | null;
  unit: BaselineUnits[M];
  sourceSessionIds: string[];
  count: number;
  source: DataSource;
  comparisonGroupId: string;
  methodId: string;
  contextKey: string;
  recordedAt: ISODateTime | null;
  evidence: EvidenceStatus;
}
export type BaselineEntry = {
  [M in BaselineMetric]: BaselineValue<M>
}[BaselineMetric];
export interface CrewBaselines {
  entries: BaselineEntry[];
}

export interface FoodExposure {
  mealId: string;
  foodName: string;
  eatenAt: ISODateTime;
}
export interface AllergenExposure {
  mealId: string;
  allergen: AllergenName;
  eatenAt: ISODateTime;
}
export interface SignalRef {
  risk: RiskId;
  signal: string;
  recordedAt: ISODateTime;
  source: DataSource;
  simulated: boolean;
}
export interface ExposureScalars {
  sleepDebtHours: number | null;
  exerciseLoadPct: number | null;
  resistanceLoadPct: number | null;
  daysInFlight: number | null;
  cabinCo2MmHg: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  fibreG: number | null;
  energyPctOfNeed: number | null;
  bodyMassKg: number | null;
}
export interface CrewExposures extends ExposureScalars {
  asOf: ISODateTime;
  sinceHours: number;
  recentFoods: FoodExposure[] | null;
  allergensEaten: AllergenExposure[] | null;
  refs: { [K in keyof ExposureScalars]: SignalRef | null };
  foodRecordRefs: SignalRef[];
}
export interface CrewVector {
  crewId: CrewId;
  source: DataSource;
  simulated: boolean;
  traits: CrewTraits;
  baselines: CrewBaselines;
  exposures: CrewExposures;
}
```

`allergies` contains normalised allergen names when known; `[]` means explicitly reviewed and none declared, while `null` means not collected. Apply the same distinction to `geneticFlags`. `motionSicknessHistory`: 0 = explicitly none, 1 = occasional without activity interruption, 2 = recurrent with interruption, 3 = recurrent with vomiting. These are demo questionnaire categories. They are not a clinical severity scale.

Normalisation is deterministic: trim, Unicode NFKC, lowercase, replace consecutive whitespace with one space, then apply aliases. `shrimp`, `prawn`, `prawns`, `crab`, `lobster`, `clam`, `mussel`, `oyster`, `scallop` map to `shellfish`; `peanut` maps to `peanuts`; `egg` to `eggs`; `soya` to `soy`; `dairy` to `milk`; `tree nut` to `tree-nuts`. Canonical names also include `fish`, `wheat`, `sesame`. Other nonempty names remain normalised strings and match only by equality. This broad shellfish grouping is a declared demo simplification. Never infer an allergy from a photo or an ingredient mention; traits are explicitly entered. Food ingredient review identifies exposures, not traits. `one-carbon-risk` is a declared demo genetic flag, never inferred from vision or food.

Baseline entries are keyed by `(metric, comparisonGroupId, methodId, contextKey)` within a registered person/source. A missing key means no baseline. A blocked entry has `value: null`; retain its IDs and evidence. `count` is the number of distinct independent sessions, equals `sourceSessionIds.length`, and is an integer ≥ 0. `recordedAt` is the latest included observation time, or null when unavailable. One session contributes one value for that exact key. An exact duplicate session is not counted twice; contradictory values for one ID produce `conflicting`, not an average.

Use an arithmetic mean only after validating every included value, source, identity, series, method and units. General new metrics need ≥ 1 explicitly designated pre-exposure baseline session; exercise HR retains its existing ≥ 2-session requirement and comparison gates. Do not discard invalid included values to obtain a mean. Baseline values are positive except `nearVisionLines` (0–20), `sleepHours` (0–24), and `mood` (0–10). Baseline count does not certify measurement quality. Do not average absolute and mass-normalised VO2peak together.

`contextKey` is `default` for non-site/non-stage metrics. For BMD it is the `BoneSite`; for OCT and vision it is `left-eye` or `right-eye`; for sway it is the test protocol ID, shared by current and baseline. For HR it is the canonical JSON array `[deviceId, protocolId, posture, stageIndex, workloadW, durationSec, precedingStages]` from `StageContext`, with each preceding stage encoded as `[workloadW, durationSec]`. The existing comparator still decides whether the comparison is usable; matching a key cannot bypass it. Baseline creation is vector-owner integration work, not a public mutation API for tabs.

Demo trait fixtures (all fictional, `source: "simulated-crew"`, `simulated: true`):

```json
[
  {"crewId":"SIM-CDR","traits":{"allergies":["shellfish"],"motionSicknessHistory":1,"chronotype":"morning","geneticFlags":[]}},
  {"crewId":"SIM-PLT","traits":{"allergies":[],"motionSicknessHistory":3,"chronotype":"evening","geneticFlags":["one-carbon-risk"]}},
  {"crewId":"SIM-MS1","traits":{"allergies":["peanuts"],"motionSicknessHistory":0,"chronotype":"intermediate","geneticFlags":[]}}
]
```

Example baseline entry, fictional and explicitly simulated by its enclosing vector:

```json
{"metric":"bodyMassKg","value":72,"unit":"kg","sourceSessionIds":["SIM-CDR-MASS-01","SIM-CDR-MASS-02"],"count":2,"source":"simulated-crew","comparisonGroupId":"SIM-CDR-MISSION-01","methodId":"same-scale-morning-v1","contextKey":"default","recordedAt":"2026-11-01T00:00:00.000Z","evidence":"supported"}
```

## Signals record

`RiskSignalRecord<R>` is the exact producer payload. `AnyRiskSignalRecord` preserves the relationship between `risk` and `signals` at API boundaries. Do not accept a loose `RiskSignalRecord<RiskId>` argument: that allows a sleep payload under a food discriminator. All fields for the selected risk are required; uncollected values are null. Unknown fields are rejected. No field represents a disease, diagnosis, treatment recommendation, or probability of illness.

```ts
export interface CardioSignals {
  workloadW: number | null;
  hrDeltaBpmAtWorkload: number | null;
  vo2PeakPctBaseline: number | null;
  exerciseLoadPct: number | null;
  restingHrBpm: number | null;
  borgRpe: number | null;
  missingReadingsCount: number | null;
}
export interface SleepSignals {
  sleepHours: number | null;
  sleepEfficiencyPct: number | null;
  sleepDebtHours: number | null;
  sleepinessKarolinska: number | null;
  fatigueSamnPerelli: number | null;
  bodyClockShiftHours: number | null;
}
export interface ImmuneSignals {
  hivesPatternPct: number | null;
  rashActive: boolean | null;
  whealCountBand: Rating03 | null;
  itch: Rating03 | null;
  raised: boolean | null;
  clearEdges: boolean | null;
  paleCentre: boolean | null;
  fadesWithin24h: boolean | null;
  bodyAreasCount: number | null;
}
export interface BoneSignals {
  site: BoneSite | null;
  bmdChangePctPerMonth: number | null;
  resistanceLoadPct: number | null;
  daysInFlight: number | null;
}
export interface BalanceSignals {
  swayAreaEyesOpenDeg2: number | null;
  swayAreaEyesClosedDeg2: number | null;
  swayRatioEyesClosed: number | null;
  dizziness: number | null;
  motionSickness: number | null;
  headMovementTolerance: Rating03 | null;
}
export interface MicrobiomeSignals {
  bristolType: number | null;
  bloating: Rating03 | null;
  abdominalPain: Rating03 | null;
  appetite: Rating03 | null;
  antibiotics14d: boolean | null;
  skinInfectionSigns: Rating03 | null;
  gutChangeDays: number | null;
}
export interface SansSignals {
  eye: 'left-eye' | 'right-eye' | null;
  amslerDistortion: Rating03 | null;
  nearVisionChangeLines: number | null;
  headache: number | null;
  octThicknessChangeUm: number | null;
  cabinCo2MmHg: number | null;
}
export interface FoodSignals {
  foodsEaten: FoodExposure[] | null;
  allergensEaten: AllergenExposure[] | null;
  energyPctOfNeed: number | null;
  proteinGPerKg: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  vitaminDIu: number | null;
  fibreG: number | null;
  bodyMassKg: number | null;
  bodyMassChangeKg: number | null;
}
export interface MoodSignals {
  mood: number | null;
  stress: number | null;
  workload: number | null;
  isolation: number | null;
  crewConflict: boolean | null;
}
export interface RiskSignalsMap {
  cardio: CardioSignals;
  sleep: SleepSignals;
  immune: ImmuneSignals;
  bone: BoneSignals;
  balance: BalanceSignals;
  microbiome: MicrobiomeSignals;
  sans: SansSignals;
  food: FoodSignals;
  mood: MoodSignals;
}
export interface RiskSignalRecord<R extends RiskId = RiskId> {
  risk: R;
  crewId: CrewId;
  recordedAt: ISODateTime;
  simulated: boolean;
  source: DataSource;
  signals: RiskSignalsMap[R];
}
export type AnyRiskSignalRecord = {
  [R in RiskId]: RiskSignalRecord<R>
}[RiskId];
```

Emission rules:

1. Emit validated observations and **base**, unpersonalised derived signals. Never emit `adjustedPct` as `hivesPatternPct`; that would create a feedback loop. Emit after saving inputs, never during React render or `evaluate`.
2. Zero is a valid observed value only where the catalogue permits it. `false` is an explicitly negative answer. `[]` means reviewed and no events in the stated window. Neither zero, false nor an empty array is a missing-value substitute. No NaN, Infinity, undefined, numeric strings, or silent clamping.
3. A registered `crewId` binds exactly one source, simulated flag and comparison series. `SIM-*` belongs to simulated fixtures. NASA replay uses `RESEARCH:MR080G:<participant>:<series>` and is labelled **Research participant**, never astronaut/crew. User-entered series use `USER:<participant>:<series>`; a fictional user-entered fixture remains `simulated: true`. Do not join these namespaces or attach SIM traits to research records. IDs are not names or evidence of consent.
4. `source: 'simulated-crew'` requires `simulated: true`; NASA replay requires `simulated: false`. User entry requires an explicit simulated flag. Registration rejects mismatched source/flag/series. Source labels remain visible separately from the Simulated badge.
5. Record identity is `(crewId, risk, recordedAt)`. Identical re-emission is a no-op. A different payload at that identity is a conflict and is rejected; preserve the first record. Corrections emit a complete snapshot with a later timestamp. Earlier, nonconflicting records can be imported but do not displace later snapshots.
6. `recordedAt` is observation/snapshot time, not upload time. Reject future timestamps relative to the vector clock. Historical date-only research retains its original date in its existing adapter; without a documented timestamp it is not emitted into timed exposures. Do not invent noon or midnight or transplant a record onto today.
7. Keep source documents, session IDs, meal ingredients, raw photos, sensor streams, sleep stages and target calculations in the producing tab. Do not put images or unverified diagnoses in this record. Photo-derived signals remain null until the tab has an explicit measured/demo method; there is no assumed working photo classifier.

## Signal catalogue

Every row is produced by the risk in column 1 and consumed by that tab's own display/evaluator plus the explicitly listed cross-tab readers, via the vector API. `self` means only the producer. Every type below is additionally nullable. Numeric ranges are inclusive unless written otherwise; `number` permits decimals and `integer` does not. These are input validation limits, not normal/abnormal boundaries.

| Risk / producer | Signal name | Type | Unit | Range | Meaning | Consumed by |
|---|---|---|---|---|---|---|
| cardio | workloadW | number | W | 0–2000 | Selected cycle stage workload; must accompany HR delta | self |
| cardio | hrDeltaBpmAtWorkload | number | bpm | −300–300 | Current HR minus matched personal mean at selected workload | self |
| cardio | vo2PeakPctBaseline | number | % baseline | ≥ 0 | Current measured VO2peak / matching baseline × 100; no 100% cap | self |
| cardio | exerciseLoadPct | number | % plan | 0–500 | Completed / planned exercise minutes × 100 in trailing 24 h; planned > 0 | bone, mood |
| cardio | restingHrBpm | number | bpm | > 0, ≤ 300 | Latest resting HR, not workout HR | self |
| cardio | borgRpe | integer | Borg 6–20 | 6–20 | Effort at selected workload | self |
| cardio | missingReadingsCount | integer | readings | ≥ 0 | Required HR/RPE fields missing in current session, counted once per field | self |
| sleep | sleepHours | number | h | 0–24 | Total sleep in trailing 24 h, nonoverlapping intervals | mood, cardio |
| sleep | sleepEfficiencyPct | number | % | 0–100 | Sleep / time in bed × 100 over same 24 h; denominator > 0 | self |
| sleep | sleepDebtHours | number | h | 0–24 | Sum of max(0, 8 − sleep hours) across three complete consecutive 24 h bins | immune, mood, cardio |
| sleep | sleepinessKarolinska | integer | KSS | 1–9 | Current self-reported sleepiness | self |
| sleep | fatigueSamnPerelli | integer | Samn–Perelli | 1–7 | Current self-reported fatigue | cardio, mood |
| sleep | bodyClockShiftHours | number | h | > −12, ≤ 12 | Scheduled sleep midpoint minus baseline midpoint; positive = later; wrap to (−12,12] | self |
| immune | hivesPatternPct | number | % match | 0–100 | Base reference-pattern similarity, not illness probability | self; vector personalisation |
| immune | rashActive | boolean | none | true/false | Rash reported present at check-in | self |
| immune | whealCountBand | Rating03 | category | 0–3 | 0 none; 1 fewer than 20; 2 20–50; 3 more than 50 | self |
| immune | itch | Rating03 | score | 0–3 | 0 none; 1 mild; 2 moderate; 3 intense, as reported | self |
| immune | raised | boolean | none | true/false | Raised lesions reported/confirmed | self |
| immune | clearEdges | boolean | none | true/false | Clear lesion boundaries reported/confirmed | self |
| immune | paleCentre | boolean | none | true/false | Pale centres reported/confirmed | self |
| immune | fadesWithin24h | boolean | none | true/false | Individual lesions reported to fade within 24 h | self |
| immune | bodyAreasCount | integer | areas | 0–6 | Distinct areas: head/neck, trunk, left/right arm, left/right leg | self |
| bone | site | BoneSite | none | three declared sites | Site for this BMD comparison | self |
| bone | bmdChangePctPerMonth | number | %/month | any finite | 100 × (current/baseline − 1) / (elapsedDays/30.4375); elapsedDays > 0 | self |
| bone | resistanceLoadPct | number | % plan | 0–500 | Completed / planned resistance volume (kg × repetitions), trailing 7 d; planned > 0 | cardio |
| bone | daysInFlight | integer | days | 0–10000 | Floor of elapsed mission time / 24 h, from entered mission start; never inferred from bed rest | sans, cardio |
| balance | swayAreaEyesOpenDeg2 | number | deg² | 0–32400 | 95% angular sway ellipse area during 30 s, eyes open | self |
| balance | swayAreaEyesClosedDeg2 | number | deg² | 0–32400 | Same device/orientation/protocol, eyes closed | self |
| balance | swayRatioEyesClosed | number | ratio | ≥ 0 | Current closed-eye area / comparable baseline; baseline > 0 | self |
| balance | dizziness | integer | score/10 | 0–10 | 0 none, 10 greatest reported dizziness | self |
| balance | motionSickness | integer | score/20 | 0–20 | 0 none, 20 greatest reported motion sickness | self |
| balance | headMovementTolerance | Rating03 | score | 0–3 | 0 unable; 1 small motion; 2 slow full motion; 3 unrestricted reported motion | self |
| microbiome | bristolType | integer | Bristol | 1–7 | Selected stool form, not a microbiome composition measurement | self |
| microbiome | bloating | Rating03 | score | 0–3 | 0 none; 1 mild; 2 moderate; 3 severe, self-report | self |
| microbiome | abdominalPain | Rating03 | score | 0–3 | Same self-report anchors as bloating | self |
| microbiome | appetite | Rating03 | score | 0–3 | 0 none; 1 reduced; 2 usual; 3 increased | food |
| microbiome | antibiotics14d | boolean | none | true/false | Explicit report of any antibiotic use in preceding 14 × 24 h | self |
| microbiome | skinInfectionSigns | Rating03 | count | 0–3 | Count of reported redness, warmth, discharge; not an infection diagnosis | immune |
| microbiome | gutChangeDays | integer | days | 0–365 | Consecutive daily check-ins explicitly reporting changed gut pattern; gaps make null | self |
| sans | eye | enum | none | left-eye/right-eye | Eye selected for vision/OCT change | self |
| sans | amslerDistortion | Rating03 | category | 0–3 | 0 none; 1 one quadrant; 2 two; 3 three/four quadrants reported distorted | self |
| sans | nearVisionChangeLines | number | lines | −20–20 | Current minus baseline resolved lines; negative means fewer resolved | self |
| sans | headache | integer | score/10 | 0–10 | 0 none, 10 greatest reported headache | self |
| sans | octThicknessChangeUm | number | µm | −1000–1000 | Current minus baseline thickness for same eye and OCT protocol; positive = thicker | self |
| sans | cabinCo2MmHg | number | mmHg | 0–20 | Entered/measured cabin CO₂ partial pressure at record time | self |
| food | foodsEaten | FoodExposure[] | events | 0+ entries | Complete reviewed food event snapshot for preceding 24 h | vector recentFoods; immune |
| food | allergensEaten | AllergenExposure[] | events | 0+ entries | Reviewed ingredient-derived allergens, each with mealId and eatenAt | immune |
| food | energyPctOfNeed | number | % need | 0–500 | Consumed kcal / explicitly entered need kcal × 100 over preceding 24 h; need > 0 | cardio |
| food | proteinGPerKg | number | g/kg | 0–20 | Protein grams in preceding 24 h / latest measured body mass; mass > 0 | bone |
| food | sodiumMg | number | mg | 0–30000 | Total sodium in preceding 24 h | bone, sans |
| food | calciumMg | number | mg | 0–10000 | Total calcium in preceding 24 h | bone |
| food | vitaminDIu | number | IU | 0–100000 | Total vitamin D in preceding 24 h; if explicitly supplied in µg, IU = µg × 40 | bone |
| food | fibreG | number | g | 0–200 | Total fibre in preceding 24 h | microbiome |
| food | bodyMassKg | number | kg | > 0, ≤ 500 | Measured body mass at record time | cardio |
| food | bodyMassChangeKg | number | kg | −500–500 | Current mass minus comparable personal baseline mass | self |
| mood | mood | integer | score/10 | 0–10 | 0 lowest reported mood, 10 highest | self |
| mood | stress | integer | score/10 | 0–10 | 0 none, 10 greatest reported stress | sleep |
| mood | workload | integer | score/10 | 0–10 | 0 none, 10 greatest reported workload | sleep |
| mood | isolation | integer | score/10 | 0–10 | 0 none, 10 greatest reported isolation | self |
| mood | crewConflict | boolean | none | true/false | Conflict explicitly reported in preceding 24 h | self |

Specific derived-signal gates:

- Sleep debt uses bins `(T−72h,T−48h]`, `(T−48h,T−24h]`, `(T−24h,T]`, where T is that sleep record's timestamp. If any bin lacks a complete record, emit null. Eight hours is the documented demo target. Chronotype may position the schedule overlay but does not change debt arithmetic.
- Food totals require a complete reviewed 24 h meal log and a known nutrient value for every included meal. A missing sodium value makes sodium null, without nulling independently complete calcium. Do not sum snapshots. Body mass need not be nulled because meals are incomplete. Nutrient and allergen content are not established by photo appearance; use reviewed menu/ingredient matches. `foodsEaten` and `allergensEaten` independently become null when their coverage is incomplete. Event times must satisfy `recordedAt−24h < eatenAt ≤ recordedAt`.
- Ratio/change signals require comparable baselines and a positive denominator. HR delta requires non-null `workloadW`; BMD rate requires `site`; vision/OCT change requires `eye`. A missing companion field rejects the record if the dependent value is non-null. Raw missing data never implies a zero delta.
- Tablet sway is angular, not centre-of-pressure area in mm². Use degree-valued pitch/roll, covariance eigenvalues λ1/λ2, area `π × 5.991 × sqrt(λ1 × λ2)`. Require a complete 30 s capture with ≥ 300 valid samples and no gap > 0.2 s; otherwise null. No sensor or denied permission means unavailable, never a generated trace labelled measured. Public balance data in different units cannot serve as a personal tablet baseline.
- The base immune score is owned by Shi Wei and must document its rule/model and reference limits in that tab. The 60% example below is a fixture, not a validated classifier result. Missing reference coverage or an unavailable method produces null, not a fabricated match. Cross-tab context does not upgrade evidence.

## Vector API

```ts
export type SignalPath = {
  [R in RiskId]: `${R}.${Extract<keyof RiskSignalsMap[R], string>}`
}[RiskId];
export type TraitPath = `traits.${keyof CrewTraits}`;
export interface Reason {
  direction: 'up' | 'down';
  text: string; // 1–8 whitespace-separated words after trim
  sourceRisk: RiskId;
  signal: SignalPath | TraitPath;
}
export interface PersonalisationResult {
  adjustedPct: number | null;
  reasons: Reason[];
}
export interface VectorApi {
  emitSignals(record: AnyRiskSignalRecord): void;
  getVector(crewId: CrewId): CrewVector | null;
  getExposures(crewId: CrewId, sinceHours: number): CrewExposures | null;
  getSignals<R extends RiskId>(
    risk: R, crewId: CrewId, sinceHours: number
  ): RiskSignalRecord<R> | null;
  personalise(
    risk: RiskId, crewId: CrewId, baseEvaluation: RiskEvaluation
  ): PersonalisationResult;
  subscribe(crewId: CrewId, listener: () => void): () => void;
}
// Public module functions have these same signatures.
export declare const emitSignals: VectorApi['emitSignals'];
export declare const getVector: VectorApi['getVector'];
export declare const getExposures: VectorApi['getExposures'];
export declare const getSignals: VectorApi['getSignals'];
export declare const personalise: VectorApi['personalise'];
export declare const subscribe: VectorApi['subscribe'];
```

`getSignals` is the additional typed reader for catalogue consumers whose inputs are not flattened into exposures (for example Mood reading fatigue). `subscribe` is notification only; it never returns mutable state. All reads return detached snapshots. Consumers must not mutate them or import vector storage. Vector initialization, trait/baseline registration and clock injection are internal to `src/vector/`. The production clock is UTC now; demos/tests inject a fixed clock. One evaluation captures one clock value for all reads. A demo scenario switch resets its vector scope rather than combining different fictional episodes.

API behaviour is mandatory:

1. `emitSignals` validates the entire record atomically before storing. Malformed fields, source mismatch, unknown crew, inconsistent identity or duplicate conflicts throw `Error` with a specific message; no partial writes or notifications. Valid novel records notify subscribers for that crew once. Identical duplicates do not notify.
2. `sinceHours` must be finite, > 0 and ≤ 336; otherwise throw `RangeError`. Eligibility is `(asOf−sinceHours, asOf]`. `getVector` uses a 24 h exposure view. Unknown crew returns null from all reads. Known crew without observations returns a vector with nullable exposures, not invented zeros.
3. `getSignals` selects the latest complete record snapshot for that risk within the window. A latest null field stays null; do not backfill an older non-null value. It returns null when no record is eligible. Views needing a timeline keep their own history; this API is not a timeline query.
4. `getExposures` selects latest eligible records independently by producer: sleep → sleepDebtHours; cardio → exerciseLoadPct; bone → resistanceLoadPct/daysInFlight; sans → cabinCo2MmHg; food → sodiumMg/calciumMg/vitaminDIu/fibreG/energyPctOfNeed/bodyMassKg. Scalars are copied, never added or extrapolated. Each non-null scalar gets its exact `SignalRef`; a null scalar has null ref.
5. Food events come from the latest eligible food snapshot only, then are filtered by eatenAt to the query window. `recentFoods` maps from `food.foodsEaten`. Deduplicate foods by `(mealId, foodName, eatenAt)` and allergens by `(mealId, allergen, eatenAt)`. Do not union older snapshots, which may have been corrected. `foodRecordRefs` has one ref for each non-null source array (including an empty reviewed array), otherwise none. A query wider than 24 h does not expand the source snapshot's 24 h coverage; these arrays describe available recent events, not confirmed absence throughout a wider window.
6. For personalisation use a 24 h context view and a **6 h** food trigger window `(asOf−6h, asOf]`. Missing/stale context does not imply absence and adds no weight. No values from other identities, sources or series enter the calculation. A future event or a food event later than its record is rejected on emission.
7. `personalise` checks `risk === baseEvaluation.risk`, `crewId === baseEvaluation.crewId`, and the evaluation's simulated flag against registration, otherwise throws. Unknown crew or an evaluation violating the output rules throws. A null base value, non-supported evidence, or `kind: 'change-vs-baseline'` returns `{ adjustedPct: null, reasons: [] }`. It does not turn a change, retained capacity, or score into a risk percentage.
8. Supported pattern matches start at their unchanged base percentage. V1 contains exactly the immune rule below; all other pattern matches return their unchanged percentage and empty reasons. Research replay receives no adjustment. No rules may be added silently by an individual tab. Traits, sodium, sleep debt, CO₂ and other cross-tab signals may appear as labelled context without invented causal weights. A consumer link in the catalogue is not evidence of a validated causal model.

**Transparent immune adjustment, version `demo-immune-v1`:** only when the evaluation is immune, supported, pattern-match, the latest immune record within 24 h has `rashActive: true`, and its **base** `hivesPatternPct` equals the evaluation value. Let M be the intersection of declared allergies and reviewed allergens eaten in the last 6 h. When M is nonempty, add **10 percentage points** for the matching declared allergy and **10 percentage points** for its recent food exposure. Both conditions are required for either increment. Otherwise add zero. Multiple allergens/meals do not stack. Select the lexicographically first matching normalised allergen for deterministic audit details. Clamp the resulting percentage to [0,100], without rounding the stored value. At saturation, reasons identify applied rule terms, not the actual net number of points. These weights are demonstration assumptions, not trained, calibrated, or clinical.

Return reasons in this order:

```json
[
  {"direction":"up","text":"Known matching food allergy","sourceRisk":"immune","signal":"traits.allergies"},
  {"direction":"up","text":"Matching allergen eaten within six hours","sourceRisk":"food","signal":"food.allergensEaten"}
]
```

`sourceRisk` names the producer for signal paths. A trait has no producing tab; use the consuming risk (`immune` here, `balance` for motion-sickness history, `sleep` for chronotype, `sans` for genetic flags). Direction describes the numerical adjustment only. Do not create up/down reasons for missingness or unweighted context.

**Immune worked example, complete payloads:** fixed vector time `2026-11-14T11:00:00.000Z` (7 pm Singapore). Register SIM-CDR with the traits above. Food at `08:00Z` is three hours earlier. Emit these two records in order:

```json
{
  "risk":"food","crewId":"SIM-CDR","recordedAt":"2026-11-14T08:00:00.000Z",
  "simulated":true,"source":"simulated-crew",
  "signals":{
    "foodsEaten":[{"mealId":"SIM-MEAL-01","foodName":"Shrimp rice","eatenAt":"2026-11-14T08:00:00.000Z"}],
    "allergensEaten":[{"mealId":"SIM-MEAL-01","allergen":"shellfish","eatenAt":"2026-11-14T08:00:00.000Z"}],
    "energyPctOfNeed":null,"proteinGPerKg":null,"sodiumMg":null,
    "calciumMg":null,"vitaminDIu":null,"fibreG":null,
    "bodyMassKg":null,"bodyMassChangeKg":null
  }
}
```

```json
{
  "risk":"immune","crewId":"SIM-CDR","recordedAt":"2026-11-14T11:00:00.000Z",
  "simulated":true,"source":"simulated-crew",
  "signals":{
    "hivesPatternPct":60,"rashActive":true,"whealCountBand":2,"itch":2,
    "raised":true,"clearEdges":true,"paleCentre":true,
    "fadesWithin24h":null,"bodyAreasCount":2
  }
}
```

The fixture states its food/allergen log is reviewed; unknown nutrient totals remain null. With base evaluation `{"risk":"immune","crewId":"SIM-CDR","kind":"pattern-match","value":60,"unit":"%","label":"Hives pattern","reasons":[],"evidence":"supported","simulated":true,"escalation":null}`, call `personalise('immune', 'SIM-CDR', baseEvaluation)`. Result: **60 + 10 + 10 = 80** with the two reasons above. The tab returns the final evaluation below and shows “Hives pattern 80%”, “Simulated”, and optional context “Shellfish · 3 h ago”. This is a pattern match, never a diagnosis. With allergy null, no matching allergen, event exactly six hours old, rash false/null, or stale food, the result stays 60 with no reasons. With unsupported base evidence it stays non-numeric; context cannot rescue it.

## Evaluation output

Every tab returns this shared envelope to its own display. The display may also render its private charts, site comparisons, photos and individual observations. The envelope is one selected headline metric, not a forced template or composite risk score.

```ts
export type EvaluationUnit = '%' | 'bpm' | 'h' | '%/month'
  | 'ratio' | 'lines' | 'µm' | 'kg' | 'score/10';
export interface RiskEvaluation {
  risk: RiskId;
  crewId: CrewId;
  kind: 'pattern-match' | 'change-vs-baseline';
  value: number | null;
  unit: EvaluationUnit;
  label: string;
  reasons: Reason[];
  evidence: EvidenceStatus;
  simulated: boolean;
  escalation: Escalation | null;
}
export interface Escalation {
  level: 'urgent' | 'next-pmc';
  trigger: 'red-flag' | 'no-pattern' | 'conflicting' | 'persistent-change' | 'something-else' | 'indicative-score';
  text: string; // observed fact, 1–12 words, no suspected condition
}
```

`escalation` follows "Ground medical escalation": a red flag sets `urgent` and the tab sets `value: null` for display while keeping raw observations; `personalise` never changes `escalation`. `pattern-match` requires unit `%` and value 0–100 or null. The number is similarity to an explicitly documented pattern, not disease likelihood. `change-vs-baseline` includes signed differences and explicitly labelled ratios/percent-retained measures; unit and label must distinguish them. Never clamp VO2peak retention to 100. Do not reverse a sign to make it look like risk. `value: null` requires evidence `insufficient` or `conflicting`; either of those evidence states requires null value. Conflicting takes precedence over insufficient. Supported means this calculation's evidence gates passed; it does not mean clinical validation. An uncalibrated rule must still be disclosed as a demo rule. The envelope's simulated flag must equal the registered vector's flag; source is read from that vector and remains visible in the tab. Evaluators reject an unregistered crew ID rather than silently selecting a default person.

For scalar observations without a documented pattern model, compare to a supported personal baseline; if none exists, return a null headline and display raw readings separately. Sleep may show raw three-day debt but must not label debt itself a personal-baseline difference. Mood can return current mood minus personal baseline with `unit: 'score/10'`. A Food energy ring may show raw `energyPctOfNeed` as a target comparison, but it is not a personal-baseline change; use body-mass change for the shared evaluation or return null. Microbiome stool categories are not percentages; use an explicitly documented pattern method or null.

`label` is 1–6 whitespace-separated words, literal and metric-specific. Reasons contain only contributions to personalisation; raw cross-tab context appears separately, without up/down arrows. A base evaluation has `reasons: []`. The final evaluation copies risk, crew, kind, unit, label, evidence and simulated unchanged; only a supported pattern match can replace value with `adjustedPct` and attach reasons. When `adjustedPct` is null, preserve a valid change-vs-baseline value rather than erasing it. Never call personalisation again with the final evaluation.

```json
{
  "risk":"immune","crewId":"SIM-CDR","kind":"pattern-match",
  "value":80,"unit":"%","label":"Hives pattern",
  "reasons":[
    {"direction":"up","text":"Known matching food allergy","sourceRisk":"immune","signal":"traits.allergies"},
    {"direction":"up","text":"Matching allergen eaten within six hours","sourceRisk":"food","signal":"food.allergensEaten"}
  ],
  "evidence":"supported","simulated":true,"escalation":null
}
```

```json
{"risk":"balance","crewId":"SIM-MS1","kind":"change-vs-baseline","value":null,"unit":"ratio","label":"Eyes-closed sway ratio","reasons":[],"evidence":"insufficient","simulated":true,"escalation":null}
```

## File ownership and integration

| Path | Owner | Responsibility |
|---|---|---|
| `src/vector/` | Siang Woo | Registry, traits, baseline adapters, signal validation/storage, clock, exposures, personalisation and subscriptions |
| `src/risks/types.ts` | Siang Woo, changes by agreement only | Shared types in this contract; both owners import, neither forks definitions |
| `src/risks/cardio/`, `src/risks/sleep/`, `src/risks/immune/`, `src/risks/bone/` | Shi Wei | Tab inputs, evaluator, display, adapters, tests |
| `src/risks/balance/`, `src/risks/microbiome/`, `src/risks/sans/`, `src/risks/food/`, `src/risks/mood/` | Siang Woo | Tab inputs, evaluator, display, adapters, tests |
| Existing `src/exercise/*`, `src/logic/assess.ts`, `src/components/exercise/*` | Shi Wei for cardio integration | Preserve current behaviour; wrap first, move only by agreement |
| App navigation/body-map registration and shared presentation | Siang Woo | Wire descriptors and source labels; coordinate any shared-component changes |

Every implemented tab exports `riskTab` from `src/risks/<risk>/index.ts`. Mood uses the same contract if enabled; no stub is advertised as live. Each descriptor has these five required fields and an optional scenario loader:

```ts
export interface RiskRegionMap {
  cardio: 'heart-lungs';
  sleep: 'head';
  immune: 'skin';
  bone: 'bones';
  balance: 'head';
  microbiome: 'gut';
  sans: 'eyes';
  food: 'gut';
  mood: 'head';
}
export interface RiskTabProps {
  crewId: CrewId;
  vector: VectorApi;
}
export interface RiskEvaluationContext {
  crewId: CrewId;
  vector: VectorApi;
}
export interface RiskTab<R extends RiskId = RiskId> {
  id: R;
  region: RiskRegionMap[R];
  title: string;
  Component: ComponentType<RiskTabProps>;
  evaluate(context: RiskEvaluationContext): RiskEvaluation;
  loadScenario?(context: RiskEvaluationContext): void;
}
```

`loadScenario?(context: RiskEvaluationContext): void` saves the Mission day 100 simulated inputs for `context.crewId` through the tab's normal save path, emitting the same signals as a user save. It must be idempotent, preserve existing user observations, and never seed real/research identities. The shell calls available loaders once on startup, Food first, isolating failures per tab and crew; `?scenario=off` skips seeding in a fresh session. See `src/scenario/mission.ts` for the shared story and each tab's `scenario.ts` for the implemented loaders.

Use `satisfies RiskTab<'sleep'>` (and the corresponding literal for every tab) to enforce the region pairing. Titles are `Cardiovascular`, `Sleep`, `Immune`, `Bone`, `Balance`, `Microbiome`, `SANS`, `Food`, `Mood`. Region IDs are registration keys; the body-map integration adapter maps existing region identifiers without silently changing this contract. `evaluate` is synchronous and read-only: read that tab's selected private input state and vector snapshots, calculate base output, personalise once, and return its own risk and the requested crew. It never emits, changes selection, schedules work, fetches data, or renders UI. Components subscribe and re-evaluate after input saves/vector notifications. Detached exposures are not a permission to read another tab's store.

**Existing cardio mapping:**

- `src/exercise/types.ts` remains the source of exercise sessions, stage context and comparison types. `src/exercise/store.ts` retains episode archival, revision/stale-plan protection, local persistence, import validation and review export. Its `evaluateWorkspace` supplies comparison/plan; the cardio wrapper does not replace it with a new percentage model.
- Map the selected `StageComparison.deltaBpm` to `cardio.hrDeltaBpmAtWorkload` only when non-null and its state is `comparable` or `outside-baseline-range`; copy the target stage's `context.workloadW`. Preserve issues, limits, gaps and existing planner displays. Multiple stages remain private to the cardio chart; emit one selected stage, not an average across workloads. Copy Borg RPE only for the declared `borg-6-20` scale. Count missing HR/RPE fields directly from required current-session fields, not generic planner gaps.
- `src/logic/assess.ts::assess` remains the VO2 evaluator. Its supported `calculation.retainedPct` maps to `vo2PeakPctBaseline` only when the underlying metric is `VO2peak`. Do not rename or substitute `VO2max`. Preserve baseline record IDs, method/unit gates, evidence and research reference `not-applicable`. For vector baseline provenance, assessment IDs serve as source session IDs because each assessment is one capacity session.
- Exercise view returns `kind: 'change-vs-baseline'`, unit `bpm`, label `HR change at workload`. VO2 view returns the same kind, unit `%`, label `VO2peak baseline retained`. Selection in cardio determines the headline; the screen may show both charts. A missing comparison is null, never “0 change”. Preserve the existing evidence result; for exercise with no numeric comparison, conflicting metadata/identity is conflicting and absent required readings/baseline is insufficient.
- Reuse `src/components/exercise/*`, the existing assessment/trend components, and `src/ui/dataSource.ts` through adapters. Do not rewrite the existing source-aware replay presentation or local-storage payload. Register existing identities/series explicitly with the vector owner; never map every exercise subject to SIM-CDR. A source with only date precision can keep rendering in the legacy cardio path without entering timed signals. HR, VO2 and unrelated context do not become contemporaneous merely because displayed together: a signal snapshot includes only observations with the same documented timestamp; other fields stay null.

Agents never edit the other owner's folders. Coordinate shared-type changes with both owners before implementation; leave a concrete request rather than making a private variant. Read the vector only through `src/vector/index.ts` or injected `VectorApi`. Keep new storage separate from the existing exercise key; corrupt persisted vector data must not silently reset real user input or overwrite the exercise workspace.

## Agent instructions

> To build a risk tab: 1. Read this document's product decisions and contract; implement only your owned folder and import shared types. 2. Build the tab's input and documented base evaluator; preserve nulls, units, source and identity, then emit the complete typed signal snapshot after each saved observation. 3. Read cross-tab context through the vector API, personalise once, export `riskTab`, and render the tab's own display. 4. Add tests for emitted signals and the selected headline; hand the descriptor to Siang Woo for registration. Do not change another owner's code to make integration pass.

Definition of done:

- Shared types and descriptor compile with the repository TypeScript configuration; `npm.cmd run build` passes after integration. Run the tab's tests and the existing regression suite with `npm.cmd test`; report failures in other owners' files without editing them.
- Test the actual save-to-emit path: correct discriminator and exact signal keys, permitted zero/false/empty versus null, boundaries and invalid values, units/signs, baseline denominator gates, correct simulated/source labels and crew isolation. Test the consumer through `VectorApi`, not another tab's internal module.
- Vector-owner tests cover duplicate idempotence/conflicts, stale/latest-null behaviour, time boundaries, source/series isolation, notification count and no feedback loop. Include the complete 60 → 80 fixture, unknown allergy, unmatched food, an event exactly 6 h old, missing/unsupported base, no stacking, upper clamp, and unchanged change-vs-baseline values. Baseline tests retain independent IDs/count and conflicting evidence.
- Verify the real registered tab flow: select person → enter/save input → observe signals → see updated evaluation/context. A build or mocked test alone is not UI verification; report which check ran and what remains unverified.
- Meet the settled polish bar: headlines ≤ 6 words; labels/buttons ≤ 3; main-screen paragraphs at most one sentence; monospace only for values/units/IDs/times; orange only for primary action/current selection; status text/icon accompanies colour; usable at 320 px; every simulated view tagged `Simulated`; footer `Prototype · not for clinical use`.
- Implement the tab's red-flag questions and `escalation` rules from "Ground medical escalation"; test that any red flag yields `urgent` and hides the score.
- Display pattern match or personal-baseline change with honest evidence and source labels. No diagnosis, treatment, prescription, “healthy”, “safe”, or “cleared” wording. A missing classifier, sensor permission, baseline or research dataset remains visibly unavailable, not a simulated result presented as measured.

# Delivery

## Mandatory vs Stretch

Build priority follows demo value per minute; protected core dependencies come before breadth.

| Priority | Tier | Deliverable | Minimum useful result |
|---|---|---|---|
| 1 | Mandatory: protected core | Existing Cardiovascular | Preserve working exercise / VO2peak views and MR080G replay. |
| 2 | Mandatory: protected core | Body map home | Clear routes into the core story; unfinished tabs explicitly “Planned”. |
| 3 | Mandatory: protected core | Food + astronaut vector | Menu-based food exposure signal plus a simulated crew allergy trait and clear personalisation reason. |
| 4 | Mandatory: protected core | Immune photo match | Photo beside reference patterns and match bars; Food + vector context explains the personalised match. If staged, tag it “Simulated”; do not imply validated image inference. |
| 5 | Mandatory: delivery | Testing, seven slides, 30-s clip | Understandable three-minute demo, offline backup and submission assets. |
| 6 | Mandatory: breadth | Sleep | Overnight line graph and schedule overlay using its own input. |
| 7 | Mandatory: breadth | Microbiome | Gut check-in and Bristol timeline. |
| 8 | Mandatory: breadth | Bone | Entered DXA changes on a skeleton view. |
| 9 | Mandatory: breadth | SANS | In-app grid result and vision trend; unavailable OCT stays null. |
| 10 | Mandatory: breadth | Balance | Device-motion stand test and sway trace; device availability must be tested. |
| 11 | Stretch | Explainer site | Separate explanations only after app and submission assets are ready. |
| 12 | Stretch | Crew profiles | Additional profile UI; the core still needs one simulated crew vector. |
| 13 | Stretch | Mood | Daily sliders and calendar view. |

Every tab ships with its red-flag questions and the escalation banner (see "Ground medical escalation"); this is part of the minimum useful result, not a stretch item. SCIN hives coverage is unverified. Check reference suitability and licence before using photos; a labelled simulated walkthrough must not be presented as validated matching. Remaining tabs are build targets, subject to the noon gate below.

## Team tracks

| Track | Owner | Scope | Files |
|---|---|---|---|
| Risks 1–4 | Shi Wei | Cardiovascular preservation; Immune core; Sleep and Bone breadth | `src/risks/cardio/`, `src/risks/sleep/`, `src/risks/immune/`, `src/risks/bone/` |
| Risks 5–8 + Mood | Siang Woo | Food core; Balance, Microbiome, SANS; optional Mood | `src/risks/balance/`, `src/risks/microbiome/`, `src/risks/sans/`, `src/risks/food/`, `src/risks/mood/` |
| Astronaut vector | Siang Woo | Collect signals; provide traits, baselines, exposures and reasons | `src/vector/` |
| Shared shell + body map | Siang Woo | Home, region routes, Planned states, responsive polish | Existing app-shell and body-map files; confirm exact paths before edits |
| Delivery | Both; Siang Woo leads | Testing, slides, clip, rehearsal; Shi Wei approves the single PR | Presentation / recording paths agreed during delivery |

Folder assignments define ownership, not a claim that every folder already exists. Use the signals contract section; agree changes before crossing ownership boundaries.

## Build timeline

| KL time | Shi Wei | Siang Woo | Exit condition |
|---|---|---|---|
| Sat 19:00–20:00 | Check existing Cardio route; identify usable Immune references | Confirm signals handoff; map core routes and vector inputs | Core input/output contract agreed |
| Sat 20:00–21:00 | Build Immune photo + symptom input and reference display | Build Food menu exposure and vector allergy context | Both sides produce/consume agreed signals |
| Sat 21:00–22:00 | Integrate personalised Immune display and reason | Wire Food → vector → Immune; connect body map | Protected core works through the app |
| Sat 22:00–23:00 | Build Sleep input and night graph | Build Microbiome check-in and timeline | First breadth tabs usable |
| Sat 23:00–00:00 | Build Bone input and skeleton view | Build SANS grid and trend | Save working state; no overnight dependency |
| Sun 00:00–08:00 | Rest | Rest | Resume with a saved local build |
| Sun 08:00–09:00 | Finish Sleep / Bone gaps | Build Balance sensor input and sway display | Candidate breadth tabs available |
| Sun 09:00–10:00 | Check core results, labels and references | Check routes, 320 px layout and offline core | Stable test build; prepare three user tasks |
| Sun 10:00–11:00 | Observe users; capture confusion and broken steps | Facilitate body map → Cardio → Food / Immune tasks | First user sessions recorded as notes |
| Sun 11:00–12:00 | Complete sessions; rank blockers | Complete sessions; triage demo-ready tabs | Three to five people tested; noon gate |
| Sun 12:00–13:00 | Fix core result / input blockers | Fix core routes and vector handoff; mark unfinished tabs Planned | Core story passes again |
| Sun 13:00–14:00 | Fix remaining demo blockers; check copy | Verify offline build and responsive states; freeze demo scope | Stable recording build |
| Sun 14:00–15:00 | Draft evidence and risk slides | Record 30-s core clip; assemble deck | Clip + seven-slide draft |
| Sun 15:00–16:00 | Refine evidence and spoken claims | Finish deck and verify clip playback | Final assets ready |
| Sun 16:00–17:00 | Rehearse Cardio / Immune handoffs | Rehearse opening / Food / vector / close | Timed three-minute run and backup drill |
| Sun 17:00–18:00 | Review final changes and evidence | Prepare one PR and submission materials | Reviewable release candidate |
| Sun 18:00–19:00 | Approve PR after checks; final demo spot-check | Resolve review issues; verify main build after merge | Submission build ready on main |
| Sun 19:00–20:00 | Cross-check assets and form details | Submit by 20:00; verify confirmation | Submission confirmed; deadline buffer retained |

**Sun 12:00 go/no-go:** Both owners name the demo-ready tabs. A tab qualifies only if it opens from the body map, accepts its intended input, shows an understandable result with honest source / simulation labels, handles missing values and works in the demo setup. Anything else appears as **“Planned”** on the body map. A protected-core failure takes the entire 12:00–14:00 fix window before breadth work.

**Cut order:** Mood → crew-profile UI → explainer site → unfinished Balance → unfinished SANS → unfinished Bone → unfinished Microbiome → unfinished Sleep → extra visual polish. Never cut the body map, existing Cardiovascular, or the Immune + Food + astronaut-vector story. Preserve testing, the seven slides and the backup clip.

## Rehearsals and backup

| Demo clock | Presenter | Action / message |
|---|---|---|
| 0:00–0:20 | Siang Woo | Hook, astronaut audience, body map as home; identify simulated crew data. |
| 0:20–1:00 | Shi Wei | Open Cardiovascular; show personal-baseline change and VO2peak trend. Identify MR080G as a bed-rest research replay, not an astronaut record. |
| 1:00–1:30 | Siang Woo | Show shellfish meal exposure and the vector's known allergy trait for the simulated crew member. |
| 1:30–2:20 | Shi Wei | Open Immune photo match; show reference bars and how Food + vector context personalises the reason. State pattern match, not diagnosis. |
| 2:20–2:45 | Siang Woo | Return home; briefly show demo-ready coverage and explicit Planned states. |
| 2:45–3:00 | Both | Shi Wei names evidence limits; Siang Woo closes on personal changes and the next useful observation. |

- **Rehearse Sunday 16:00–17:00:** one timed full run, one run with a deliberate tab failure; trim narration to three minutes. Keep slide explanations aligned with the app's numbers.
- **Offline backup:** retain the verified local production build, local demo/reference assets, seven slides and a downloaded 30-s clip on the presentation machine. Test the full core route and clip playback without network access before rehearsal ends.
- **If a tab breaks live:** stop retrying, return to the body map, say the tab is unavailable, and play the core clip. Continue from the matching slide; never describe prerecorded or simulated output as a live result. If the whole app fails, move directly to clip + slides.

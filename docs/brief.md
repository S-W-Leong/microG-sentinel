**MicroG Sentinel — Revised project brief and 48-hour build plan**

MicroG Sentinel helps an astronaut review an existing aerobic fitness assessment, understand changes from their personal baseline, and identify what evidence or specialist review is needed next.

It answers four questions:

- What changed?
- Can these measurements be meaningfully compared?
- What does the relevant reference mean in this context?
- What should I review or follow up on?

The hackathon deliverable is a browser application with structured assessment entry, a personal timeline, transparent calculations and an exportable review card.

**The main user story**

An astronaut opens their latest fitness assessment. They see a change from baseline, inspect the measurements and comparison method, understand why the change matters, and prepare any necessary follow-up through existing medical procedures.

NASA describes periodic fitness self-evaluations as part of monitoring crew fitness and optimizing training. MicroG Sentinel explores how to make the interpretation understandable to the crewmember. [NASA’s reduced-fitness risk overview](https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/).

The prototype demonstrates this astronaut workflow using explicitly simulated crew assessments. A separate, clearly labelled NASA research replay uses verified bed-rest records. Research participants must never be presented as astronauts.

**Three screens**

| Screen | Main question | Essential content |
|---|---|---|
| My Fitness | What changed? | Latest assessment, baseline comparison, evidence status, timeline |
| Understand My Assessment | Can I interpret this comparison? | Measurements, calculation, method, baseline choice, limitations |
| Evidence and Follow-up | What supports this result, and what next? | Source records, NASA references, unresolved questions, review export |

Keep explanations close to the assessment. Avoid making the user navigate a research dashboard to understand their result.

**User flow**

1. **Open the latest assessment.** Show its date, measurement type and context.
2. **Review the comparison.** Display current and baseline values with identical units.
3. **Inspect the evidence status.** Explain whether the comparison is supported, incomplete or conflicting.
4. **Understand the finding.** Show the numerical change and what it can—and cannot—establish.
5. **Read the spaceflight context.** Explain why aerobic fitness matters for mission activities.
6. **Prepare follow-up.** Export the measurements, assumptions and unresolved issues for specialist review.

A user can also enter values from an existing assessment. The app does not instruct them to perform a maximal exercise test.

The NASA research replay is accessible from the evidence view and demonstration menu. Metadata problems appear as supporting examples of why the assessment checks matter.

**Assessment card**

Each card has five parts:

| Part | Content |
|---|---|
| Finding | A plain-language description of the measured change |
| Calculation | Current value, selected baseline and percentage retained |
| Evidence status | Supported comparison, insufficient evidence or conflicting records |
| Interpretation limits | Method limitations and reference applicability |
| Follow-up | The specific evidence or review needed next |

Evidence status and physiological change must remain separate. A large numerical decline can have uncertain evidence; an incomplete record cannot be classified as healthy.

**Assessment inputs and rules**

Preserve participant identity, date, study or mission phase, metric, units, measurement method, test modality, protocol information, baseline records and source notes.

NASA’s Standard Measures investigation reinforces the value of consistent measurements collected across mission phases. It does not approve our particular baseline-selection rule. [Standard Measures](https://www.nasa.gov/reference/standard-measures/).

| Check | Required behaviour |
|---|---|
| Identity | Block comparisons between different people or conflicting identities |
| Timing | Flag contradictory dates; withhold affected timeline interpretations |
| Completeness | Identify missing values, units, methods or baselines; never replace missing data with zero |
| Duplicates | Link alternative representations of an assessment without counting extra sessions |
| Metric | Preserve VO₂peak and VO₂max labels; do not silently substitute one for the other |
| Method | Require a documented comparison basis; ordinary workout heart rate is not a capacity assessment |
| Units | Convert only when justified and all required inputs are available |
| Baseline | Show the selection rule and included records; never silently choose a favourable denominator |
| Reference | Explain applicability separately from the numerical comparison |

Calculate:

- **Capacity retained (%) = current ÷ baseline × 100**
- **Change (%) = (current − baseline) ÷ baseline × 100**

Require a positive, finite baseline. Calculate absolute and mass-normalized capacity separately. Conversion between them requires the relevant body mass.

For the curated research replay, “supported comparison” means the documented comparison basis and cross-checks are available. It does not mean the assessments have undergone complete clinical adjudication.

**NASA reference handling**

NASA-STD-3001 V1 4003 specifies maintaining in-mission aerobic capacity at or above 80% of pre-mission capacity. Keep that requirement’s context visible. [NASA standard](https://standards.nasa.gov/node/238).

Research replay may show the reference for context, but must not issue a mission compliance determination. Simulated crew examples can illustrate reference comparison without issuing clinical clearance.

Do not invent warning bands, confidence percentages or measurement-expiry periods. Meeting a relative reference must not imply that task-specific EVA requirements are satisfied.

Use wording such as “measured decrease,” “comparison needs review,” or “below the displayed reference.” Avoid “healthy,” “safe,” or “cleared for EVA.”

**Follow-up guidance**

| Finding or evidence issue | Appropriate next step |
|---|---|
| Missing baseline | Obtain or select an appropriate baseline assessment |
| Conflicting identity or date | Review the original records |
| Incompatible methods | Request a comparable assessment through existing procedures |
| Supported numerical decline | Prepare the assessment and supporting evidence for specialist review |

The prototype does not change exercise prescriptions or recommend new exercise intensity, frequency or duration.

**NASA data and demonstration**

Freeze a small, traceable subset of MR080G records. Preserve original files, curated mappings and unresolved issues separately.

Use three research examples:

- **C3D-3985:** two pre-bed-rest assessments, immediate post-bed-rest decline and recovery.
- **0224:** conflicting campaign and participant fields.
- **5580:** conflicting dates associated with different peak values.

For C3D-3985, the arithmetic mean of two pre-tests gives baselines of **2.725 L/min** and **29.9 mL/kg/min**. Immediate post-bed-rest relative retention is **73.9%**; recovery reaches **98.0%**.

The averaging rule is our explicit demonstration assumption. Preserve the source metric as VO₂peak and label the experience as an analog research replay.

The presentation sequence should be:

1. Show the astronaut reviewing a simulated assessment.
2. Explain the result and follow-up.
3. Open the real NASA decline-and-recovery replay.
4. Show one conflicting-record example to demonstrate why evidence checks matter.

**How the released resources change the product**

| Resource | Application |
|---|---|
| [Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | Explain altered gravity and distance from Earth as relevant context |
| [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | Anchor the project to reduced cardiorespiratory and musculoskeletal fitness |
| [Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Connect users to relevant research and acknowledge existing capabilities |
| [CSA radiation monitoring](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Retain as background; exclude radiation assessment from this MVP |
| [CSA science-in-space overview](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Support the motivation and potential relevance to health research on Earth |

Two linked investigations sharpen the scope. [Zero T2](https://www.nasa.gov/reference/zero-t2/) illustrates why future exercise equipment constraints matter; it does not justify generating replacement prescriptions. [Tempus Pro](https://www.nasa.gov/reference/tempus-pro/) adds prior art for collecting and integrating health data.

The released resources provide no direct dataset download or assessment algorithm. Retain MR080G and the existing calculation approach.

**48-hour build plan**

Assign **Developer A** to assessment logic and data, and **Developer B** to the astronaut interface and explanation. Use the stack both developers already know.

| Hours | Developer A | Developer B | Required outcome |
|---|---|---|---|
| **0–3** | Freeze records, rules and expected calculations | Sketch the astronaut workflow and card wording | Shared input/output contract and fixed scope |
| **3–10** | Prepare curated records and provenance | Build My Fitness, timeline and assessment layout | Both sides use the same record structure |
| **10–16** | Implement checks, baseline selection and calculations | Connect assessment selection and result rendering | Main astronaut assessment workflow works |
| **16–18** | Integrate NASA replay and conflict cases | Explain blocked and incomplete assessments | End-to-end demonstration |
| **18–25** | Sleep and recovery | Sleep and recovery | — |
| **25–29** | Add manual-entry validation and review export | Finish entry form and evidence navigation | Gather → understand → follow up |
| **29–31** | Check claims and attach specific references | Add concise spaceflight explanations | Released resources integrated within a two-hour limit |
| **31–35** | Verify calculations and rule boundaries | Run brief usability sessions; revise confusing wording | Users distinguish change from insufficient evidence |
| **35–39** | Fix important defects; freeze rules and data | Improve readability and accessibility | Stable release candidate |
| **39–43** | Document processing and limitations | Prepare presentation, submission and backup recording | Complete submission draft |
| **43–48** | Joint contingency and final checks | Joint rehearsal and submission | Working submission before the actual deadline |

Bundle the demonstration data so the core workflow works without a network connection. Defer authentication, live NASA integration, wearables, ML and multi-domain health scores.

**Acceptance checks**

- The first screen answers the astronaut’s fitness question without requiring research navigation.
- C3D-3985 displays **73.9%** immediate post-bed-rest relative retention and **98.0%** recovery using the stated baseline.
- Absolute and relative calculations stay separate.
- Missing values never become zero.
- Identity, date and method conflicts produce specific explanations.
- Duplicate files do not create extra assessments.
- Research records never receive operational compliance or clinical clearance.
- Every result exposes its measurements, baseline assumption and source.
- Follow-up addresses evidence and specialist review without changing treatment.
- The bundled demonstration works offline.

Ask three to five people to explain what changed, whether the comparison is supported and what they would do next. Use their misunderstandings to improve the interface; do not describe this as clinical validation.

**Scope protection**

If time slips, cut custom baseline editing, broad file imports and elaborate animations. Protect the astronaut assessment card, verified NASA replay, evidence checks and review export.

The contribution is an understandable, reproducible fitness assessment experience. Its operational usefulness and clinical validity remain questions for expert evaluation.
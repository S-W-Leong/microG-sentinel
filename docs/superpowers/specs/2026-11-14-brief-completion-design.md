# Brief completion design

Status: proposal for review; product implementation has not started.

Primary specification: [project brief](../../brief.md). Companion: [implementation plan](../plans/2026-11-14-brief-completion.md).

## Intent and decisions

Complete the missing astronaut assessment workflow and the brief's release evidence, building on the existing React, TypeScript and Vite application. Keep the four screens, body-map entry point, frozen MR080G replay and current calculation formulas.

The user selected **real user-entered assessments** for manual entry. This extends the brief's simulated demonstration with a third source; it does not turn the prototype into a clinical or operational assessment service. The default presentation and judge demonstration remain explicitly simulated crew data.

Planning assumption: entered records live in React memory for the current tab and disappear on refresh or close. This is a proposed default, not a user decision about persistence. Explain this beside entry and offer the existing JSON review export. Browser persistence can be added later if requested.

## Approaches

The choices presented were session-only simulated entry, browser-persisted simulated entry, and real user-entered records. The user chose the third. Within that choice, retain the existing client-only architecture and use an in-memory store. Persistent storage and a backend would add requirements that the brief does not need; neither is part of this proposal.

Use a separate `user-entered` source, rather than labelling real records as simulated or as NASA data. Keep one comparison engine, with explicit source and context handling. No user data is added to the bundled fixtures, repository, URLs, telemetry or NASA services. Tests and the demonstration recording use synthetic examples.

## Entry and review experience

Add an expandable **Enter an existing assessment** section within My Fitness, preserving the four-screen structure. It supports adding baseline records and current/follow-up records, reviewing incomplete records, correcting the user's own entries and linking an alternative representation to an existing assessment. There is no test-performance instruction.

Capture participant identifier, assessment series, date, phase, VO2peak or VO2max, value, units, optional body mass, documented method, modality, protocol, baseline role and source notes. Preserve unknown fields as unknown. Offer an explicit **Not part of a mission or study** phase for real terrestrial assessments; never assign a mission phase merely because the UI was designed for astronauts.

An assessment series is a named comparison group within one participant/source, such as a particular mission or a personal assessment set. This proposed implementation detail prevents pre-tests from different missions or contexts becoming one denominator. Add optional `comparisonGroupId` to the contract; require it for user-entered records. Existing frozen records retain their current shapes and implicit groups.

Require a participant identifier and assessment series to organise an entry. Malformed dates, unsupported enum values, negative values and non-finite numbers receive field errors. Blank capacity, date, metric, units, phase or method may be saved as an incomplete record so the review can explain what is missing. Blank numbers become `null`; explicitly entered current zero remains zero. Baseline zero remains recorded but blocks comparison. Optional body mass must be positive and finite when supplied.

After saving, select the matching user source, participant, series, metric and units, show the result and update the timeline. A baseline-only series shows its records and an invitation to add a follow-up. Undated records remain reachable. Returning to the body map shows the active series and its latest evidence status; a fresh visit starts with the simulated crew demonstration. Source changes are always visible.

## Sources, calculation and reference rules

All selectors and baseline selection scope by source, participant and comparison group. Trend series also scope by metric and units. A user identifier matching a NASA or simulated identifier must never connect their records.

Keep the arithmetic mean of every eligible baseline in the explicit group, with all included IDs shown. Missing or invalid matching baselines block the comparison; the implementation must not discard one to improve the result. Known incompatible baselines are listed with their exclusion reasons. Keep modality/protocol compatibility checks and the documented-method requirement. Do not add a medical method whitelist or infer equivalence from a method name.

Determine the expected baseline phase from the assessment context, not a two-way source check. Mission phases require pre-mission baselines; bed-rest phases require pre-bed-rest baselines; user entries explicitly outside a mission/study use baseline-role records in that same context. Unknown context is insufficient evidence. This prevents the third source from accidentally taking the existing research-only branch.

Linked contradictory assertions about identity, date, phase or measured capacity block comparison and give a specific issue. A partially missing duplicate does not overwrite a documented original. Absolute and mass-normalized representations remain distinct; no conversion is introduced.

Only supported **simulated crew in-mission** records receive `below` or `at-or-above` reference state and may use amber below 80%. Real entries and research records receive `not-applicable`, neutral/grey presentation and explicit context-only reference wording, even if a numerical ratio is below 80%. Both can show a numerical change and evidence-directed follow-up, without operational or clinical determination. `Supported` describes the recorded comparison basis, not independent verification of a transcription.

## Transparency, timeline and export

Format measurements separately from percentages. Display source measurements at their stored precision, show baseline means to enough precision to reproduce the arithmetic (including **2.725 L/min**), and format retained/change percentages with exactly one decimal place, including **98.0%**. Avoid rounding inputs before calculation.

Expose separate absolute and mass-normalized replay links/tabs when both recorded series exist. This changes the selected recorded representation; it does not convert values. Preserve record correspondence explicitly in the data bridge rather than deriving it from display labels. Unit-specific records do not become extra test occasions.

Supported trend points join only adjacent supported points. Incomplete/conflicting points are hollow, including baseline markers. Never position an unknown baseline at 100%. Records without a trustworthy date appear in a separate unplaced list; records with a trustworthy date but no ratio appear in the existing unquantified row. If an unplaced record makes chronology uncertain, withhold the connecting line for that selected series and explain why; removing unplaced points must not inadvertently reconnect the remaining points. Preserve the asserted dates in evidence and withhold disputed temporal placement.

The evidence view and JSON review export contain the target, candidate baselines and linked representations even when calculation is withheld. Include the selection rule, exclusion reasons, original values, source notes, issues, limits and source-specific notice. Retain JSON as the required export; PDF and export/import round trips are outside this plan.

## NASA and CSA context

Keep explanations close to the assessment and timebox this work to the brief's two-hour allowance. Verify the linked primary sources before adding copy. Add concise Five Hazards context about altered gravity and distance, relevant ongoing HRP research and Tempus Pro prior art. Use the CSA science page for motivation and possible relevance on Earth; retain the radiation resource as background only. The live health-improvement statements continue to link to NASA, without changing exercise prescriptions.

Create a short source-to-claim inventory with URLs, supporting passages/sections and review dates. If an edition or source differs from the brief, record the discrepancy rather than silently changing the reference or algorithm. Preserve the frozen MR080G records, curation assumptions and unresolved conflicts.

## Verification and people-dependent work

Extend the existing unit suite for new source boundaries, parser behaviour, evidence export and numerical formatting. Add a small browser acceptance suite covering the full workflow using synthetic entries. Run against the production build with non-loopback requests blocked from the first load. This verifies external-network independence while a local server supplies the bundled app; it does not claim installed-PWA support.

Check the body map, labels/icons, research colour rules, unsupported trend gaps, keyboard entry, error focus, narrow screens and JSON downloads. Re-run the existing 3985 and conflict fixtures unchanged.

Prepare a protocol and results template for three to five people to explain what changed, whether the comparison is supported and what they would do next. People must actually participate before that requirement can be marked complete. The project team arranges participants; the implementation does not contact anyone automatically. Record misunderstandings, resulting changes and limitations; do not call this clinical validation.

Prepare the presentation script and submission draft around simulated crew review, finding/follow-up, NASA decline/recovery, then one conflict. Capture a backup walkthrough with bundled/synthetic records after the release candidate passes. Submission, availability of participants and the actual event deadline remain team responsibilities; no deadline is inferred from the original 48-hour schedule.

## Scope and completion

Protect the astronaut card, curated replay, evidence checks, manual entry and review export. Defer authentication, live integrations, wearables, ML, multi-domain scores, broad file imports, custom baseline formulas, persistent storage, PDF export and elaborate animation. Keep the body map even if time is constrained.

Software completion requires the new workflow plus all fifteen brief acceptance checks to have recorded evidence. Project completion additionally requires the real usability sessions, reviewed submission draft, backup recording and rehearsal. A successful build alone is insufficient.

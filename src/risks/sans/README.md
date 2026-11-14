# SANS tab

Open Eyes → SANS for SIM-CDR, then **Load sample**. It saves an explicitly simulated pre-exposure baseline and a later same-chart reading: **Near vision −0.5 lines vs baseline**. OCT remains null. The fixture is one minute before the shell clock so **New check-in** can save a changed observation. The shell clock is fixed; subsequent distinct observations need distinct ISO timestamps no later than that clock.

Select left/right eye to retain separate draft grid marks. Tab to the grid, use arrows to move and Space/Enter to toggle a mark. The quadrant count excludes axis marks; confirm their affected sides in the explicit 0–3 rating. The screen is not an acuity chart. Enter near-vision results from an identified chart, not from the uncalibrated Amsler display.

For medical RNFL comparisons, enter thickness, scan time, device/protocol, series, and mark the earlier record as **Pre-exposure OCT**. Frisén grades are display-only. Near-vision baselines likewise require an explicit pre-exposure designation. Different baseline values are conflicting, never silently averaged. Local records are scoped to crew and vector instance, session-only, and survive tab navigation but not page reload. No shared baseline mutation API is used.

Vector baseline integration uses `contextKey` equal to the eye, matching source and comparison series, and a strictly prior supported baseline. `visionMethod(input)` encodes `["near-vision-v1", chart, device, distanceCm, correction, calibration, halfLines]`; `octMethod(input)` encodes `["peripapillary-rnfl-v1", device, protocol]`. These exported helpers define the matching IDs for future vector-owner registration. Existing baselines with other methods remain unavailable.

Sodium and cabin CO₂ come from `getExposures(crewId, 24)` with individual timestamps. Cabin input uses the check-in timestamp. Neither context, genetic flags nor Frisén grades changes the evaluation. Unsupported or changed observations request next-PMC review without invented clinical thresholds. Any positive red-flag answer immediately hides comparisons; saving it produces urgent escalation. **Request PMC** in the urgent banner prepares an unscheduled PMC locally and never transmits it; nonurgent views retain the shared routine-packet action.

Checks: `npx vitest run src/risks/sans`; `node src/risks/sans/ui-check.mjs` starts and closes its own headless Vite/Chrome check against the actual registered app. No dependencies or browser installs are performed.

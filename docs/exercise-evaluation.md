# Exercise evaluation

Software-case evaluator: `src/exercise/evaluation.ts`. Reproduce with `npx vitest run src/exercise/evaluation.test.ts src/exercise/planner.test.ts`.

The demonstration missing-HR case requires one missing comparable observation. The planner selects the eligible one-action opportunity. A deliberately redundant fixed checklist selecting both eligible opportunities costs three modelled actions with the same coverage. This is an illustrative software case, not measured crew time or a validated operational baseline. The non-greedy regression covers three gaps: exact coverage selects W/Z at two actions rather than X/Y at four. Input order cannot change that result. Unavailable/expired opportunities and historical metadata gaps remain unresolved. Both strategies share eligibility and bypass rules.

No clinical sensitivity/specificity, earlier-warning benefit or real time savings have been established.

Actual usability: pending. Use synthetic records with balanced task order. Compare the adaptive flow with a fixed checklist and a display containing the same measurements. Record participant familiarity, actions, active seconds, complete evidence, mistaken comparisons, next-step comprehension and all failures. Report sample size and observed results; do not replace observations with modelled counts. Exercise-physiologist/clinician/expert feedback remains pending and must be arranged by the team.

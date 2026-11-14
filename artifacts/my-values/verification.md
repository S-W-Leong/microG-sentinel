# Guided My values verification

The personal-data entry route now opens one of three screens: baseline, later report, comparison. The older formal-assessment dashboard and advanced entry form remain separate. Personal drafts and saved reports remain in tab memory only.

Verified interactively in the in-app browser with synthetic reports:

1. Baseline: entered 2026-01-01, VO2peak, 3 L/min and a documented graded capacity test. Saving marked it as baseline and opened the later-report step automatically.
2. Later report: the metric, units and method were copied, and the baseline recap remained visible. Entered 2026-02-01 and 2.1 L/min. Submission without checking the copied details showed an error; checking them allowed comparison.
3. Explanation: displayed 30% lower and 70% of baseline, explaining that this is not a score out of 100. Both reports had correction links and a calculation disclosure.
4. Correction: changed the baseline to 4 L/min. The later value remained 2.1. Re-saving produced 47.5% lower and 52.5% of baseline.
5. Incompatible units: changed the later report to mL/kg/min. The numerical result was withheld and the screen explained that matching units were needed. Restoring L/min restored the calculation.
6. Export: the downloaded full review JSON contained exactly two records, baseline 4 and retained capacity 52.5%. Stable report IDs prevented duplicate baselines during corrections.
7. Mobile: checked the later-report screen at 390 × 844; the saved baseline, report fields, step navigation and Back/Continue controls remained usable.
8. Refresh: reloading the comparison cleared personal reports and showed the entry guard. The browser was left on a clean baseline form, and its viewport override was reset.

The date-input browser check initially exposed an input-event issue; the controlled date field now handles input events as well as change events, and the complete baseline/later sequence passed afterward. Unit tests cover increases, unchanged/zero later readings, missing capacity, nonpositive baseline, invalid/reversed dates, required report checking, missing methods, incompatible units, stable IDs and separate comparison pairs.

All 96 unit tests, production build and ESLint pass. Vite retains the existing large-chunk warning. Browser acceptance tests were added for the guided flow and its direct-link guards; the full Playwright CLI suite was not run. Visual and interaction checks do not establish full accessibility conformance or clinical validity.

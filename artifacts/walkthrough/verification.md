# Guided values verification — 2026-11-14

The initial screen presented a missing reading and observation planner without explaining the units or how to enter personal reports. The revised flow provides three numbered anchors, visible measurements with explanations, and a main-navigation entry point for personal values.

Verified interactively in the in-app browser:

1. Read the numbers: baseline ranges and means, latest readings and differences are visible; a missing value has an explicit explanation instead of a numeric change.
2. Choose the next step: accepting a plan enables synthetic collection. Collection updates the values and brings the comparison into view. Reported symptoms remove the collection action and prioritize review.
3. Save the review: preparing the review reveals text and JSON download controls and labels local preparation. Full review text remains available in a disclosure.
4. My values: the navigation opens the form. Synthetic baseline 3 L/min and later result 2.1 L/min produce 70% retained and a 30% decrease. Saving a later result or correction collapses the form and focuses the explained result.
5. Narrow-screen layout: checked at 390 × 844. Measurements stack vertically, labels remain visible, and the numbered navigation works. Browser viewport restored afterward.

Screenshots are saved alongside this file: initial exercise view, revised overview, mobile values and synthetic personal result. Unit tests: 86 passing. Production build and ESLint pass; Vite retains its existing large-chunk warning. Existing Playwright acceptance selectors were updated for optional chart and schedule disclosures; the CLI suite was not run. Browser checks used the in-app surface. These checks do not establish full accessibility conformance or clinical validity.

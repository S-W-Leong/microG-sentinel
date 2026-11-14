# Guided values walkthrough

The prototype should explain its example before asking users to operate the observation planner. Keep the existing visual language and one-page workflow; add three linked, numbered steps: read the measurements, fill the missing reading, save the review. Put a visible path to entering personal VO₂ assessments in the main navigation and introduction.

1. Add a presentation helper for each cycling reading. Explain units and differences from the recorded baseline mean. Missing and incompatible readings must never imply zero or a fitness diagnosis. Verify missing, incompatible, positive, negative and zero changes with unit tests.
2. Replace the unexplained opening with an introduction, three anchor links, and a visible measurement table with explanations. Keep the plot and technical comparison basis available as optional details. Place the readings before the planner in DOM and mobile layout.
3. Number and simplify the planner and review headings. Explain what the two demo actions do and show the selected workout before optional schedule controls. Preserve the underlying store, persistence, symptom bypass and stale-review handling.
4. Make personal assessment entry discoverable. Add instructions for baseline then follow-up, explain fields in grouped sections, and explain capacity retained using the actual calculated values. Preserve exact metrics, units, provenance and validation.
5. Run unit tests, build and lint. Verify the walkthrough, synthetic collection, review, own-data entry and mobile layout in the in-app browser. Update existing browser acceptance selectors only where the intentionally changed interface requires it.

Review focus: missing data, incompatible protocols, symptoms that bypass collection, prepared reviews made stale by later changes, and personal records with only a baseline. No new dependencies, clinical claims or changes to the comparison engine.

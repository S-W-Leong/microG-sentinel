# Mood check-in

The shared record contains only the five fields in MoodSignals; timestamps, source and simulation identity come from the real vector. The PHQ-9 answers, red flag and history stay private to this tab. Records are session-local, not persisted clinical records.

## Comparison

Choose explicit baseline start/end dates under Time & baseline. The baseline is the mean of at least three recorded UTC days in that window, ending before the current check-in day. Only the latest observation per day contributes; unset mood and red-flag observations do not contribute. This minimum is a prototype evidence gate, not clinical validation. No window means no comparison. The fixture has a November 1–7 baseline of 7/10 and five declining days ending at 2/10 alongside workload 9/10.

Sleep debt and Samn–Perelli fatigue are read through getExposures/getSignals over 24 hours, never Sleep's private store. Food is navigation only. The calendar shows four weeks ending in the current UTC week; all session history remains in the collapsed History section.

## Screener and contact

PHQ-9 refers to the preceding two weeks, with each response 0–3. An incomplete questionnaire has no total. Bands and the >=10 escalation follow docs/battleplan.md. Item nine above zero or a direct self-harm response of Yes immediately replaces all check-in/result content with the contact action, even before Save. No personalisation runs for urgent evaluations. Request PMC uses the existing local queue and downloadable request packet; it does not contact or transmit to a flight surgeon. POMS is context only, not calculated.

## Demo

Open /#/risk/mood?crewId=SIM-CDR, choose Load sample, then Save. Load sample is available only for this simulated crew and an empty Mood history, so it cannot replace existing entries. Edit Recorded UTC for another observation; the vector rejects future dates and conflicting snapshots at the same time. Refresh to restart this session-local demo. Set Thoughts of self-harm? to Yes, or open Screener and choose a nonzero Self-harm thoughts response, to exercise the contact-only path. Urgent contact receives keyboard focus. No data is sent.

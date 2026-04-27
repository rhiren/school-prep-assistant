# Future Feature Backlog

Last updated: 2026-04-24

## Purpose

This document captures future product ideas before they are scheduled or
implemented.

Use it to:

- preserve ideas as they come up
- clarify the product intent behind a feature
- separate "interesting idea" from "committed roadmap item"

This is a backlog, not a promise.

Any future implementation should still follow [AGENTS.md](/Users/hiren/projects/school-prep-assistant/AGENTS.md),
especially:

- local-first architecture
- Firebase as sync layer, not cloud-only source of truth
- progressive disclosure for learners
- minimal-change rule

## Idea Template

For each new idea, capture:

- `Title`
- `Problem`
- `Desired outcome`
- `Possible signals or data`
- `Student UX guardrails`
- `Parent/admin UX notes`
- `Risks or open questions`
- `Status`

## Backlog Items

### 0. Course 2 Concept Readiness Rollout

- `Title`
  Course 2 concept rollout for current `Coming soon` concepts
- `Problem`
  Course 2 currently contains many manifest concepts that are not yet learner
  ready because they are missing tutorials, test sets, or both.
- `Desired outcome`
  Convert `Coming soon` concepts into stable `Practice ready` concepts in a
  deliberate order without disrupting the current math flow.
- `Possible signals or data`
  - manifest coverage by concept
  - tutorial presence
  - core/review test-set presence
  - content validation pass/fail
  - known-correct scoring spot checks
- `Student UX guardrails`
  - do not expose half-ready practice
  - preserve the current concept flow and labels
  - unlock concepts only when tutorial + tests are truly ready
- `Parent/admin UX notes`
  - prioritize concepts that make current Course 2 progression more coherent
  - keep rollout order visible in a dedicated planning doc
- `Risks or open questions`
  - mass content expansion can create answer-key regressions if not phased
  - tutorial quality and test quality should advance together
  - later units should not crowd out the immediate need to finish the active
    ratios/proportions journey
- `Status`
  Active planning. See [course2_concept_rollout_plan.md](/Users/hiren/projects/school-prep-assistant/docs/course2_concept_rollout_plan.md).

### 1. Weekly Parent Progress Report

- `Title`
  Weekly parent progress report by subject
- `Problem`
  As a parent, I want a clear summary of how my daughter is doing each week
  without needing to inspect every individual session manually.
- `Desired outcome`
  Generate a weekly report per subject that helps a parent quickly understand:
  - what was practiced
  - what concepts are going well
  - what concepts appear difficult
  - where follow-up or encouragement may be useful
- `Possible signals or data`
  Candidate inputs for the report:
  - concepts attempted during the week
  - number of attempts per concept
  - latest score and best score
  - accuracy trend
  - retry frequency
  - whether Smart Retry was triggered
  - completion time for a concept test
  - unanswered or abandoned sessions
- `Student UX guardrails`
  - reporting should not add pressure or visible monitoring to the learner flow
  - if test duration is tracked, the timer should remain hidden from the student
  - the learner experience should stay simple and focused on practice
- `Parent/admin UX notes`
  Useful weekly report sections may include:
  - subject summary
  - concepts practiced
  - strongest concepts
  - concepts that appear difficult
  - suggested parent follow-up prompts
  - time spent, if that signal proves useful and reliable
- `Risks or open questions`
  - time-to-complete can be noisy if the student pauses, switches tabs, or leaves
    a session open
  - "easy" vs "hard" should not rely on time alone
  - difficulty classification should likely combine multiple signals such as score,
    retries, completion time, and repeated misses
  - need to decide whether reports remain local-first, exportable, synced, or some
    combination of those
- `Status`
  Phase 2A implemented. Hidden admin now includes a weekly parent report for the
  active student, grouped by subject and using local-first progress plus the
  hidden duration signal. A daily parent summary for today's work is also now
  available in hidden admin. See [reporting_feature_plan.md](/Users/hiren/projects/school-prep-assistant/docs/reporting_feature_plan.md)
  for remaining polish work.

### 2. Hidden Test Duration Signal

- `Title`
  Hidden completion-time tracking for concept tests
- `Problem`
  Completion time may help distinguish between a concept that feels easy and one
  that requires more effort, but a visible timer could create stress.
- `Desired outcome`
  Track concept-test duration in the background as an optional diagnostic signal
  for future reporting and insight features.
- `Possible signals or data`
  - session start time
  - submit time
  - active-answer timestamps
  - idle gaps or long pauses
- `Student UX guardrails`
  - no visible countdown or stopwatch by default
  - do not make the student feel timed unless explicitly designed later
- `Parent/admin UX notes`
  - useful as one signal inside reports, not as a standalone judgment
  - could eventually support "worked carefully" vs "struggled significantly"
- `Risks or open questions`
  - raw elapsed time may overstate difficulty
  - pauses, interruptions, and device switching can distort the number
  - may need an "active work time" heuristic rather than simple wall-clock duration
- `Status`
  Phase 1A implemented. Submit-time hidden duration capture is now in place on
  `TestAttempt`. See [reporting_feature_plan.md](/Users/hiren/projects/school-prep-assistant/docs/reporting_feature_plan.md).
  Remaining work: use this signal inside the weekly parent report.

## Notes

- Add new items here as ideas arise.
- Keep entries short and product-focused.
- When an idea becomes active work, link the design doc or implementation PR from
  this file.

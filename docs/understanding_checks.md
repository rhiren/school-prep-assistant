# Understanding Check Pilot

Released November 7, 2026. Additive to the existing concept hierarchy; no new
login, placement fields, database version, or student identity scheme.

## Learner Flow

Three Course 3 concepts have an optional `understanding-check` test set:

- Operations with Scientific Notation
- Repeating Decimals as Fractions
- Approximate Irrational Numbers

Each has eight fresh questions: two foundations, three transfer applications,
two misconception checks, and one challenge. Four require numeric or fraction
entry and four are multiple choice. Difficulty progresses from scaffold to
standard to challenge. Questions are excluded from mixed practice and Smart
Retry to preserve freshness.

The concept page offers a check seven days after the latest submitted ordinary
practice on that concept. This is elapsed time since submitted practice, not
proof of no intervening tutorial use, outside help, or unsubmitted work.
Continue Learning remains unchanged. Existing in-progress checks can resume.
Completed check forms cannot be restarted; a future second check requires new
authored questions and a new test ID. Do not relabel repeated exposure as fresh.

There is no countdown and no answer feedback or supplied hints before submission.
Help is optional self-report: independent, helped, or unavailable. After submission,
two question-specific discussion prompts invite a parent conversation. Explanations
are available, but spoken reasoning is not automatically scored.

## Evidence and Persistence

The hidden admin report follows its selected student, not a hardcoded identity.
It lists submitted accuracy, first recorded answer accuracy and observation
coverage, days since prior practice, help self-report, and foundation versus
transfer/reasoning results. Absent history is unavailable, never assumed correct.

For multiple choice, a choice event is a recorded answer. For numeric entry,
typing is autosaved as a draft; leaving the field or submitting commits an answer.
Keystrokes are not attempts. Changing an answer is not evidence of guessing.
Partial old histories are not treated as complete first-answer observations.

Session mutations are serialized so rapid input/navigation/submission does not
overwrite earlier answers. Submitted attempts preserve testSetId, check context,
answer history, and optional help report. Existing IndexedDB, export/import,
scoring repair, and Firebase snapshot paths preserve these additive fields.
No historical first answers can be reconstructed when they were never captured.

Checks remain visible in attempt history but do not change mastery badges or
trigger Smart Retry. Eight questions provide evidence, not a mastery verdict.

## Release Gates

- Existing full scoring, content, tutorial, answer-position, and difficulty gates.
- Eight unique prompts, no normalized prompt duplicates from core/review.
- Required 2/3/2/1 coverage and four numeric/four choice balance.
- Independent answer calculations and exact authored choice identity.
- A single challenge is intentional in this short format; the three-template
  challenge requirement remains unchanged for core/review banks.
- Delayed eligibility, no-practice blocking, one-time use, and resume tests.
- Concurrent-save, missing-history, first-versus-final, and student-isolation tests.
- Export/import and cloud serialization regressions; test-profile UI flow.

Future work: independently authored follow-up forms for retention across multiple
occasions. Do not promise a recurring fresh-check schedule until those exist.

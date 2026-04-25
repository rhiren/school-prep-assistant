# Reporting Feature Plan

Last updated: 2026-04-24

## Goal

Build a parent-facing weekly reporting feature without increasing student-facing
complexity.

This plan preserves the project constitution in [AGENTS.md](/Users/hiren/projects/school-prep-assistant/AGENTS.md):

- local-first architecture
- Firebase as sync layer, not cloud-only source of truth
- progressive disclosure for learners
- minimal-change rule
- Continue Learning remains the primary learner entry concept

## Decided Features

The current decided reporting roadmap is:

1. Hidden test duration signal
2. Weekly parent progress report by subject

Build order matters:

- Hidden duration signal is a supporting data signal
- Weekly report is the first parent-facing feature

## Why This Order

The app already has strong core signals:

- submitted attempts
- latest score
- best score
- attempts per concept
- Smart Retry activity
- in-progress / abandoned work
- answer timestamps

But it does not yet have a reliable explicit duration signal.

So the safest path is:

1. add duration capture quietly
2. validate that the signal is stable enough
3. use it as one input inside the report, not the only input

## Current Signals Already Available

Already in the model today:

- `TestSession.createdAt`
- `TestSession.updatedAt`
- `AnswerRecord.answeredAt`
- `TestAttempt.submittedAt`
- `ProgressRecord.attemptCount`
- `ProgressRecord.latestScore`
- `ProgressRecord.bestScore`
- `ProgressRecord.lastAttemptedAt`
- Smart Retry attempts / cycles

These are enough to build a useful first weekly report even before advanced
difficulty modeling.

## Phase Plan

### Phase 1 — Hidden Duration Signal

Goal:

- capture concept-test duration without showing a timer to the learner

Scope:

- add derived duration metadata at session submit time
- keep the student UI unchanged
- preserve local-first behavior

Recommended signal model:

- `startedAt`
- `submittedAt`
- `rawElapsedMs`
- `activeAnswerCount`
- optional derived `durationQuality`

Preferred implementation shape:

- minimal additive metadata on `TestAttempt`
- compute duration from existing session timestamps at submit time
- optionally use answer timestamps to detect obviously noisy elapsed time

Do not add:

- visible timer
- countdown UI
- learner-facing pacing pressure

Phase 1 acceptance criteria:

- submitting a test stores duration-related metadata
- existing scoring flow is unchanged
- no new student-facing complexity
- `npm test` passes
- `npm run build` passes

Status:

- `Phase 1A` implemented: `TestAttempt.durationSignal` is now captured at
  submit time using existing session timestamps
- remaining Phase 1 work is to validate whether additional quality heuristics
  are needed before reports rely on this signal too heavily

### Phase 2 — Weekly Parent Progress Report

Goal:

- produce a weekly per-subject parent report using existing progress plus the
  new duration signal

Scope:

- one weekly report view or export-friendly summary
- parent/admin-oriented only
- no learner-facing reporting pressure

Recommended first report sections:

- subject summary
- concepts practiced this week
- strongest concepts
- concepts needing support
- retries / repeated misses
- optional “worked quickly / worked carefully / struggled” signal

First-pass “easy vs hard” heuristic:

Use combined signals, not time alone:

- score
- repeated misses
- attempt count
- Smart Retry triggered or not
- duration as a secondary signal

Do not build yet:

- recommendation engine
- ML difficulty model
- teacher dashboards
- cross-student analytics

Phase 2 acceptance criteria:

- report works for one student
- report is grouped by subject
- report uses local data first
- report remains understandable and explainable
- student UI remains simple

Status:

- `Phase 2A` implemented: hidden admin now shows a weekly parent report for the
  active student, grouped by subject and based on local-first progress plus the
  hidden duration signal
- Daily parent summary also implemented in hidden admin for the active student,
  focused on today's completed time, attempts, concepts worked, and in-progress
  work
- remaining Phase 2 work is mostly presentation polish, export options, and any
  future refinement to the "easy vs hard" heuristics

### Phase 3 — Presentation / Export Polish

Goal:

- make the report easier to review and share

Possible additions:

- hidden admin / parent report entry point
- print-friendly layout
- export to markdown or PDF later

This phase is optional after the first usable report exists.

## Proposed First Build Slice

Recommended next implementation slice:

`Phase 1A — Test duration capture on submit`

Why:

- smallest safe change
- no UI redesign
- adds durable signal for the report
- easy to validate

Concrete tasks:

1. Add additive duration metadata to attempts
2. Derive it at submit time from session timestamps
3. Add tests for:
   - normal elapsed time
   - zero/near-zero duration
   - existing attempt/scoring flow unchanged
4. Keep UI unchanged for students

Implementation status:

- Completed on 2026-04-24

## Risks To Watch

- raw elapsed time can be noisy if a student leaves the session open
- cross-device resume can distort naive wall-clock duration
- any report language about “easy” or “hard” must remain supportive, not
  judgmental

## Recommendation

Current completed slices:

- `Phase 1A — Hidden test duration capture`
- `Phase 2A — Weekly report generator using existing progress + duration`

Recommended next slice:

- `Phase 3A — Reporting presentation / export polish`

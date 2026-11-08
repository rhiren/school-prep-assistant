# Math-Prep-Assistant Chat Context

Last updated: 2026-07-31

## Purpose

This file captures the main Codex chat context for the project originally developed as `Math-Prep-Assistant` and later renamed to `school-prep-assistant`.

Current constitutional guidance for future changes is preserved separately in [AGENTS.md](/Users/hiren/Documents/github/school-prep-assistant/AGENTS.md). This document should be treated as historical and operational context, while `AGENTS.md` is the authoritative guardrail for future changes.

For significant future work, read `AGENTS.md` first and then use this document for historical rationale, prior decisions, migration context, and current-state handoff notes.

Primary session source:
- `~/.codex/sessions/2026/04/12/rollout-2026-04-12T11-03-38-019d82dd-0eff-7ac1-a26d-ca94ebc3e7a3.jsonl`

Related capture session:
- `~/.codex/sessions/2026/04/18/rollout-2026-04-18T10-06-40-019da18f-107c-70b2-b839-dfc9cafa94e4.jsonl`

## Project Identity

- Original repo/folder name: `Math-Prep-Assistant`
- Current repo/folder name: `school-prep-assistant`
- Current local path: `/Users/hiren/Documents/github/school-prep-assistant`
- Current remote: `https://github.com/rhiren/school-prep-assistant`

## Core Product Intent

The app was built as a local-first concept-based learning system, initially for Course 2 math, with these repeated goals across the chat:

- Keep the app deterministic, content-driven, and easy to extend.
- Avoid SaaS-style architecture for v1.
- Preserve business logic when making changes.
- Keep UI student-friendly and low-friction.
- Support future expansion beyond math without breaking the current math flow.
- Favor minimal, safe, incremental changes over broad rewrites.

## Persistent Constraints Repeated By The User

- Do not add authentication.
- Do not rewrite the app architecture.
- Do not break existing math functionality while expanding scope.
- Keep IndexedDB/local-first behavior intact even when cloud sync is added.
- Preserve existing progress where possible during migrations and renames.
- Keep test generation deterministic, but leave extension hooks for future difficulty logic.
- Make the experience good for a real student, not a developer demo.

## What Was Built Over Time

### 1. Initial Scaffold

The first major task was to create the app scaffold in React + Vite + TypeScript with routing, domain models, content loading, storage abstractions, and a minimal working UI shell.

Important early design decisions:
- `QuestionSelectionStrategy` was added as a future hook for difficulty-aware selection.
- Answer normalization was designed as a separate utility, not embedded in scoring.
- Question IDs were required to be globally unique.
- `TestSession` explicitly stores answers, current question index, and session status.
- Attempt history is append-only, with progress derived from attempts instead of overwriting prior work.

### 2. Student Test-Taking UX

The test flow was gradually improved to feel usable by a student:

- question progress header
- jump-to-question nav grid
- answered/unanswered visibility
- sticky next/previous/submit controls
- confirmation before submitting with unanswered questions
- flagged vs unanswered visual distinction
- better spacing/readability
- mobile-friendlier layout
- last-question behavior swaps `Next` for `Submit test`

### 3. Results And Dashboard UX

The results page and home/dashboard were reshaped from scaffold/developer language into student-facing UX:

- score summary with correct/incorrect/unanswered
- incorrect-answer review with selected answer, correct answer, and explanation
- expandable explanations
- retry concept test action
- student-focused home page with `Math Practice Dashboard`
- continue practice, next-step recommendation, and progress summary
- logic to recommend the first concept, next concept, or resume in-progress work
- encouraging language and simplified guidance

### 4. Storage Evolution

Storage started as `localStorage` and was upgraded to IndexedDB using `idb`.

Important storage expectations captured in the chat:
- keep higher-level storage/service contracts stable
- migrate old localStorage data into IndexedDB
- maintain separate storage for sessions, attempts, and progress
- keep multiple attempts per concept
- do not change business logic while changing persistence technology

### 5. Answer Normalization

Normalization expanded beyond trivial text cleanup:

- trim whitespace
- lowercase text
- numeric equivalence such as `2` and `2.0`
- ratio normalization
- fraction normalization
- decimal normalization
- cross-type equivalence where appropriate
- simplified-form equivalence for fractions and ratios
- optional feedback tips when the answer is correct but not in the expected form

### 6. Content And Curriculum Work

The Course 2 content was expanded and improved:

- content manifests and tutorials were added
- concept test banks were reviewed and strengthened
- question rigor was recalibrated against weekly benchmark practice/test files
- answer keys and explanations were rechecked
- the biggest quality upgrades were made in unit rates, equivalent ratios, percent relationships, and proportions

### 7. Packaging, Distribution, And Deployment

The project evolved from a web scaffold into multiple delivery modes:

- local launcher script
- Electron desktop support
- packaged local launcher flow and user guide
- support for local file packaging
- GitHub Pages deployment using `gh-pages`

Content was moved under `public/content` and the loader was adapted so the app could serve static content correctly in built deployments.

### 8. Firebase Sync

Firestore was added as a best-effort sync and backup layer on top of local storage.

Intent:
- local-first remains primary
- Firebase is optional and non-blocking
- newest `lastModified` wins during conflict resolution
- the app must keep working if Firebase is unavailable

Placeholder Firebase config was intentionally left in place pending real project credentials.

### 9. Multi-Subject Refactor

The repo was lightly generalized from math-only into subject-ready structure without adding science features:

- project identity changed to `school-prep-assistant`
- content moved to `public/content/math/course2/...`
- manifest fields expanded with `subjectId`, `subjectTitle`, `courseId`, and `courseTitle`
- content loading became subject/course aware
- the current math-first UX was preserved

### 10. Multi-Student Support

The app was later expanded to support multiple student profiles:

- local student profile model
- active student selection
- student-scoped sessions, attempts, and progress
- student-scoped Firebase sync path: `students/{studentId}/progress/current`
- migration path to preserve prior single-user data under `student-1`
- export/import updated to operate per active student

## Git History Milestones

Recent meaningful commits in current `master` history:

- `d1684fa` Build release-ready math practice scaffold
- `a8aa4fa` Add Course 2 content packs and tutorials
- `e4cefe3` Support local file packaging
- `88d28f8` Add distribution bundle and user guide
- `ed5f5ff` Expand and refine Course 2 manifest
- `9f3c728` Refresh packaged local distribution bundle
- `fc7fa17` Add repo launcher script
- `8e097e0` Add Electron desktop app support
- `381491f` Add fullscreen launch and focus mode
- `38f8acb` Configure GitHub Pages deployment
- `019dd2a` Strengthen Course 2 concept test banks
- `7fb6af1` Add Firebase progress sync layer
- `3ae269f` Refactor for multi-subject readiness
- `9142441` Configure Firebase project defaults
- `dcc006f` Add multi-student profile support

## Current Independent-Session Handoff — 2026-07-24

This section is the current operational handoff. It supersedes any older
`Current Codebase State`, uncommitted-change, placeholder-config, or next-step
notes later in the historical record.

### Repository state

- Branch: `master`
- Remote: `https://github.com/rhiren/school-prep-assistant`
- Course 3 Unit 1 completion should be committed, pushed, and deployed after
  validation.
- The Vite base path is already `/school-prep-assistant/`; the older rename
  follow-up is complete.
- The GitHub Pages publication status of the two commits above was not verified
  in the final Course 3 session. Pushing `master` is not the same as running
  `npm run deploy`, which publishes `dist` through `gh-pages`.

### Active product and content

The app now actively supports:

- Mathematics Course 2
- Mathematics Course 3
- Grade 6 Science

The platform remains:

- React + Vite + TypeScript
- manifest-driven with content under `public/content`
- local-first with IndexedDB as the resilience layer
- optionally synchronized through Firebase/Firestore
- multi-student and student-scoped
- subject-aware and GitHub Pages compatible through `HashRouter`

Firebase now has a real default project configuration for
`school-prep-assistant` with optional Vite environment overrides. It remains a
best-effort sync layer; local storage is still foundational and the app must
continue working when remote sync is unavailable.

### Course 3 current state

Course 3 is for an accelerated Grade 7 learner working at Grade 8
instructional level. Do not collapse `homeGrade` and `instructionalGrade`.

The twelve learner-ready Unit 1 concepts are:

1. Rational and Irrational Numbers
2. Repeating Decimals as Fractions
3. Square Roots and Perfect Squares
4. Cube Roots and Perfect Cubes
5. Approximate Irrational Numbers
6. Compare and Order Real Numbers
7. Integer Exponents
8. Zero and Negative Exponents
9. Powers of Ten
10. Scientific Notation
11. Operations with Scientific Notation
12. Unit 1 Mixed Review

The learner-ready Unit 2 concepts are:

1. Review Equivalent Expressions
2. Solve Multi-Step Equations
3. Equations with the Distributive Property
4. Equations with Variables on Both Sides
5. Equations with Rational Coefficients
6. One Solution, No Solution, or Infinitely Many Solutions
7. Build Equations from Context
8. Linear Equation Word Problems
9. Check and Explain Equation Solutions
10. Unit 2 Mixed Review

The learner-ready Unit 3 concepts are:

1. Proportional Relationships as Lines
2. Understand Slope as Rate of Change
3. Find Slope from Graphs
4. Find Slope from Tables and Points
5. Compare Rates of Change
6. Similar Triangles and Constant Slope
7. Equations in the Form `y = mx`
8. Understand the `y`-Intercept
9. Equations in the Form `y = mx + b`
10. Graph Linear Equations
11. Write Linear Equations from Representations
12. Unit 3 Mixed Review

The learner-ready Unit 4 concepts are:

1. Understand Solutions to Systems
2. Solve Systems by Graphing
3. Solve Systems by Substitution
4. Solve Systems by Elimination
5. Systems with No Solution

The learner-ready book-aligned Unit 1 concepts are:

1. Translations on the Coordinate Plane
2. Reflections on the Coordinate Plane
3. Rotations on the Coordinate Plane
4. Sequences of Rigid Transformations
5. Congruent Figures on a Grid
6. Congruence from Transformation Sequences
7. Parallel Lines and Transversals
8. Triangle Angle Relationships
9. Exterior Angles of Triangles
10. Unit 1 Mixed Review

The learner-ready book-aligned Unit 2 concepts are:

1. Dilations on the Coordinate Plane
2. Scale Factor and Dilations
3. Similar Figures
4. Missing Side Lengths in Similar Triangles

Course 3 currently contains:

- 53 active concepts
- 106 assessment files
- 3710 assessment questions
- 50 core questions per concept
- 20 review questions per concept

Core difficulty distribution is:

- 10 scaffold
- 25 standard
- 15 challenge

Review difficulty distribution is:

- 8 scaffold
- 12 standard

The current active manifest is:

`public/content/math/course3/manifest/course3_manifest.json`

The complete course sequence and release order are in:

`docs/course3_concept_rollout_plan.md`

As of 2026-08-22, Course 3 rollout planning has been realigned to the
Amplify Desmos Math California Grade 8 book sequence used by the student's
school. The active manifest now begins with the first book-aligned unit and
keeps the previously built learner-ready concepts listed above so existing
progress remains stable.
Future build work should follow the book-aligned sequence in
`docs/course3_concept_rollout_plan.md` and preserve existing concept/test IDs
when reusable packs are moved into their book-aligned units.

### Recent learner-facing UI work

Course navigation groups courses beneath their subject and presents Course 3
concepts without making each course appear as a separate subject.

The tutorial renderer in `src/routes/ConceptTutorialPage.tsx` now safely
supports the Markdown structures used by the new lessons:

- headings
- paragraphs
- bold text
- inline code / math notation
- blockquotes
- bulleted and numbered lists with wrapped lines
- tables

It renders React elements rather than injecting raw HTML.

No broader UI redesign is currently required for the next Course 3 unit.

Hidden admin now includes parent-only understanding signals inside the daily and
weekly reports. New test sessions record `answerHistory` for each saved answer;
the report summarizes multiple-choice answer changes, multi-try questions, and
cases where a correct final answer followed multiple distinct choice selections.
Typed-answer keystrokes are marked separately so typing a number or short answer
does not look like guessing. This signal is additive and starts with newly saved
sessions; older attempts remain valid but do not contain historical choice
changes that were not previously stored.

### Current validation baseline

For the current Course 3 working tree, the following passed:

- 18 Vitest files
- 106 automated tests
- `npm run build`
- Course 3 JSON parsing
- globally unique Course 3 question IDs
- exact authored multiple-choice answer identity
- balanced Course 3 multiple-choice correct-answer positions
- unpredictable Course 3 multiple-choice correct-answer position sequencing,
  including a block on three-letter A/B/C-style mini-cycles
- Course 3 template-variety quality gate for new banks
- Course 3 difficulty-progression quality gate so questions do not drop back
  to easier difficulty after harder questions begin
- Course 3 tutorial uniqueness and minimum-length quality gate
- unique option checks
- known-correct mathematical spot checks
- browser verification of the Course 3 grid, concept page, tutorial, and
  assessment counts

The most recent Course 3 audit found 3710 questions and 3710 unique IDs.
An answer-position audit found that the old Course 3 banks had 1119 of 1120
correct answers in option A. Course 3 answer choices were rebalanced so core
banks use a 13/13/12/12 A/B/C/D split and review banks use a 5/5/5/5 split.
A later learner-feedback audit found that balanced banks still followed an
A/B/C/D/A/B/C/D answer-position sequence. Course 3 answer choices were
reshuffled again while preserving authored correct-answer values, explanations,
question IDs, and global answer-position balance. The content repository test
suite now includes Course 3 answer-position balance, answer-sequence, and
template-variety regression guards. A follow-up learner audit found shorter
A/B/C-style mini-cycles, so Course 3 banks were reshuffled under a stricter
gate that blocks any three-step forward answer-position cycle.

A tutorial duplication audit found several Course 3 Unit 2 tutorials had been
authored with the same body and different headings. Those tutorials were
rewritten to be concept-specific, and the content repository test suite now
checks active Course 3 tutorial length and pairwise tutorial similarity.

Several already-published Course 3 banks remain explicit template-variety debt
because they rely too heavily on one normalized question form. That debt is
tracked in `COURSE3_TEMPLATE_VARIETY_DEBT_TEST_SET_IDS` inside
`src/test/contentRepository.test.ts`. Future Course 3 banks should pass the
template-variety gate instead of expanding that debt list.

The twelve Unit 3 assessment packs were regenerated or authored after the
quality gate was added. They now pass the answer-sequence and template-variety
gates without exceptions, with strong normalized question-template variety per
bank.

Existing non-blocking warnings include:

- Vite externalizing `node:fs/promises` for browser compatibility in the
  content repository's environment-specific loader path
- a production bundle-size warning above 500 kB
- expected development logs for Course 2 manifest concepts whose learner-ready
  assets have not yet been built

Do not treat those warnings as authorization for a broad rewrite.

### Exact next task

The next Course 3 rollout task is book Unit 2:

`Angle-Angle Similarity`

Build it as one complete concept pack before adding it to the active Course 3
manifest. Preserve the same Course 3 release discipline: tutorial first,
50-question core bank, 20-question review bank, validation, then manifest
unlock. Keep the answer-position balance guard green for every new Course 3
test set, and keep the answer-sequence and template-variety guards green
without adding new quality-debt exceptions. Do not rename existing Course 3
concept IDs just to match the book order; move reusable concepts carefully
after book Unit 1 has enough learner-ready content.

### Independent-session startup checklist

1. Read `AGENTS.md` completely.
2. Read this current handoff section.
3. Read `docs/course3_concept_rollout_plan.md`.
4. Run `git status --short` and confirm what, if anything, changed after this
   documentation refresh.
5. Preserve progress, routing, content loading, sync behavior, and the
   manifest-driven structure.
6. Build only the next complete pack; do not mass-enable later roadmap
   concepts.

## Known Deliberate Non-Changes

### November 7, 2026: Understanding Check Pilot

Added delayed eight-question checks for three existing Course 3 concepts:
scientific-notation operations, repeating decimals as fractions, and approximating
irrational numbers. See `docs/understanding_checks.md` for current behavior,
limitations, and tests. Checks preserve existing progress identities and do not
change mastery or Smart Retry. Numeric drafts now commit on field exit/submission;
session writes are serialized, and submitted attempts retain their test-set ID.
Parent reporting distinguishes observed first answers from final accuracy and
unavailable history. Historical cloud records without history cannot be backfilled.

These were explicitly left alone on purpose:

- `src/storage/indexedDbStorageService.ts` still uses the old DB name for migration compatibility
- Legacy packaged `Math-App/` bundle was later removed from the repo as redundant
- Current local launcher is `Open Math Practice.command`

## Known Caveats Mentioned In Chat

### November 8, 2026: Substitution Question Repair

Repaired 28 incomplete or mismatched prompts across the substitution core/review
banks, and added question-specific worked solutions to all 70 questions. The
generator used ten prompt templates but selected answer formats using a five-way
cycle; two templates omitted the system and two did not name the expected answer
format correctly. IDs, option order, correct answers, and saved responses remain
unchanged. Historical answers to defective prompts are not reliable evidence of
understanding; this repair does not rewrite or reinterpret those attempts.

`substitutionContent.test.ts` now independently solves every substitution system
from its visible prompt, checks requested formats and unique point solutions,
and rejects fixtures reproducing the original defects and a swapped key. Future
substitution banks are discovered automatically. The standard deployment command
now runs the full test suite and build before publishing.

- Electron verification in this environment had some headless/macOS limitations, so web validation was stronger than GUI-window validation.
- Some older content-loader warnings about missing tutorials were noted in the chat at various points; they did not block the main web build validations mentioned in those turns.

## Useful Future Follow-Ups

Current useful follow-ups:

- build `Systems with Infinitely Many Solutions` as the next complete Course 3
  concept pack
- verify or run the GitHub Pages deployment after new `master` content commits
- keep parent-only understanding signals hidden from the student flow and
  local-first/sync-compatible
- keep local launcher and distribution guidance aligned with `dist/` and
  `public/content`
- continue Course 2 readiness work only through its dedicated rollout plan
- continue expanding subjects without disturbing current math, progress, or
  sync behavior

## Short Context Summary For A New Chat

If you need a compact prompt for future work, this is the essence:

`school-prep-assistant` is a local-first React/Vite/TypeScript learning platform
with IndexedDB persistence, deterministic concept tests, exact
multiple-choice scoring, student-friendly tutorials and practice, optional
Firebase sync, multi-student profiles, subject-aware course navigation, and
GitHub Pages support. Active content includes Math Course 2, Math Course 3, and
Grade 6 Science. Course 3 is an accelerated Grade 7 placement into Grade 8
instructional content and has twelve learner-ready Unit 1 concepts, ten
learner-ready Unit 2 concepts, twelve learner-ready Unit 3 concepts, and five
learner-ready Unit 4 concepts, with 2730 validated questions. Units 1, 2, and
3 are complete. The next pack is `Systems with Infinitely Many Solutions`.
Preserve saved-progress compatibility, local-first
behavior, the frozen domain model, and the phased manifest release discipline.

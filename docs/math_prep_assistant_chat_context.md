# Math-Prep-Assistant Chat Context

Last updated: 2026-04-18

## Purpose

This file captures the main Codex chat context for the project originally developed as `Math-Prep-Assistant` and later renamed to `school-prep-assistant`.

Current constitutional guidance for future changes is preserved separately in [AGENTS.md](/Users/hiren/projects/school-prep-assistant/AGENTS.md). This document should be treated as historical and operational context, while `AGENTS.md` is the authoritative guardrail for future changes.

For significant future work, read `AGENTS.md` first and then use this document for historical rationale, prior decisions, migration context, and current-state handoff notes.

Primary session source:
- `~/.codex/sessions/2026/04/12/rollout-2026-04-12T11-03-38-019d82dd-0eff-7ac1-a26d-ca94ebc3e7a3.jsonl`

Related capture session:
- `~/.codex/sessions/2026/04/18/rollout-2026-04-18T10-06-40-019da18f-107c-70b2-b839-dfc9cafa94e4.jsonl`

## Project Identity

- Original repo/folder name: `Math-Prep-Assistant`
- Current repo/folder name: `school-prep-assistant`
- Current local path: `/Users/hiren/projects/school-prep-assistant`
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
- packaged `Math-App` bundle and user guide
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
- `9f3c728` Refresh packaged Math-App bundle
- `fc7fa17` Add repo launcher script
- `8e097e0` Add Electron desktop app support
- `381491f` Add fullscreen launch and focus mode
- `38f8acb` Configure GitHub Pages deployment
- `019dd2a` Strengthen Course 2 concept test banks
- `7fb6af1` Add Firebase progress sync layer
- `3ae269f` Refactor for multi-subject readiness
- `9142441` Configure Firebase project defaults
- `dcc006f` Add multi-student profile support

## Current Codebase State

As of this capture:

- `README.md` already reflects `School Prep Assistant`.
- The repo folder and GitHub remote have already been renamed to `school-prep-assistant`.
- The app keeps the old IndexedDB database name intentionally so existing saved progress is preserved.
- Distribution artifacts still use older naming such as `Math-App/` and `Start Math Practice.command`.

## Current Uncommitted Change

There is one live uncommitted change in the working tree:

- [vite.config.ts](/Users/hiren/projects/school-prep-assistant/vite.config.ts)

Diff summary:
- Vite base path changed from `/math-prep-assistant/` to `/school-prep-assistant/`

Reason:
- this was the final rename sweep so GitHub Pages aligns with the renamed repository

This change was validated in the prior chat with `npm run build`, but it is not committed in the current git status yet.

## Known Deliberate Non-Changes

These were explicitly left alone on purpose:

- `src/storage/indexedDbStorageService.ts` still uses the old DB name for migration compatibility
- `Math-App/` bundle name remains unchanged
- `Start Math Practice.command` remains unchanged

## Known Caveats Mentioned In Chat

- Firebase config is still placeholder-based until real values are inserted.
- Electron verification in this environment had some headless/macOS limitations, so web validation was stronger than GUI-window validation.
- Some older content-loader warnings about missing tutorials were noted in the chat at various points; they did not block the main web build validations mentioned in those turns.

## Useful Future Follow-Ups

Likely next steps implied by the prior chat:

- commit the final `vite.config.ts` rename change
- optionally rename `Math-App/` to a `School Prep Assistant` branded distribution folder
- optionally rename `Start Math Practice.command`
- verify GitHub Pages after the new base path is committed and deployed
- add real Firebase project credentials if cloud sync should become active
- continue expanding subjects later without disturbing current math/course flow

## Short Context Summary For A New Chat

If you need a compact prompt for future work, this is the essence:

`school-prep-assistant` started as `Math-Prep-Assistant`, a local-first Course 2 math mastery app built in React/Vite/TypeScript. It now supports IndexedDB persistence, deterministic concept testing, richer answer normalization, student-friendly test/results/dashboard UX, GitHub Pages deployment, optional Firebase sync, multi-subject-ready content structure, and multi-student profiles. The current repo path and remote are already renamed to `school-prep-assistant`. One uncommitted rename-related fix remains in `vite.config.ts`, changing the Vite base path to `/school-prep-assistant/`. Preserve saved-progress compatibility and avoid broad rewrites.

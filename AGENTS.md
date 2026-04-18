# AGENTS.md — school-prep-assistant Project Context (Preserve This Context In All Future Changes)

## Project Purpose

This is a personalized learning platform currently focused on:

- Math (active)
- Science (planned)

Current subject structure:

Subject
→ Course
→ Unit
→ Concept
→ Tutorial
→ Test Sets

Current active content:

- Math
- Course 2

Project name:

`school-prep-assistant`

---

## HOW TO USE THIS CONTEXT

This file is the authoritative project constitution.

For significant changes, also read:

- [docs/math_prep_assistant_chat_context.md](/Users/hiren/projects/school-prep-assistant/docs/math_prep_assistant_chat_context.md)

Use the files this way:

- `AGENTS.md`: non-negotiable rules, architectural guardrails, and preservation requirements
- `docs/math_prep_assistant_chat_context.md`: historical context, major decisions, milestones, and rationale

Before making significant changes:

1. Read this file first.
2. Read the history doc if the work touches architecture, storage, sync, content structure, routing, deployment, or migrations.
3. If a request conflicts with this constitution, call that out before changing code.

Do not duplicate evolving project rules across multiple files unless there is a strong reason.

---

## NON-NEGOTIABLE ARCHITECTURAL PRINCIPLES

Preserve these principles in all future changes.

### 1. Local-first architecture

IndexedDB remains foundational.

Local storage is the resilience layer.

Cloud sync must never replace local storage.

Architecture:

IndexedDB

- Firebase sync layer
- export/import backup

Never change this without explicit instruction.

---

### 2. Multi-student support must be preserved

Direction is:

- student profiles
- active student
- student-scoped progress
- student-scoped Firebase sync

Do not reintroduce hardcoded single-user identity.

Do not hardcode:

`daughter-1`

Identity must be parameterized through active student selection.

---

### 3. Multi-subject direction must be preserved

Current structure:

`public/content/math/course2/...`

Future subjects example:

`public/content/science/course1/...`

Do not re-flatten content structure.

Do not regress to math-only assumptions.

---

### 4. Content is manifest-driven

Content is externalized.

Source of truth is content under `public/content`.

Do not move content back into `src`.

Manifest-driven loading must remain.

Recursive manifest discovery must remain.

---

### 5. Preserve subject-aware manifest model

Manifest supports:

- `subjectId`
- `subjectTitle`
- `courseId`
- `courseTitle`

Do not remove.

---

### 6. Preserve existing progress

Do not break:

- existing IndexedDB data
- existing database name
- safe migrations
- existing saved progress

Preserve backward compatibility.

---

### 7. Preserve Firebase architecture

Firebase is a sync layer.

Not a cloud-only source of truth.

Preserve:

- local-first fallback
- `lastModified` conflict resolution
- background sync
- safe behavior if Firebase unavailable

---

### 8. Preserve GitHub Pages deployment assumptions

App is designed for static hosting.

Assumptions:

- `HashRouter`
- GitHub Pages deployment
- Vite base path compatible with repo name
- content loading works in GitHub Pages

Do not regress these assumptions.

---

### 9. Preserve learning model

Core model is:

Concept
→ Tutorial
→ Core Test
→ Review Test
→ Progress
→ Retry / mastery (planned)

Preserve this model.

---

### 10. Preserve question quality standard

Generated questions should be:

- production-quality
- challenging but fair
- conceptually stronger than generic worksheets

Always preserve:

- answer-key verification
- difficulty calibration
- concept-specific rigor expectations

---

### 11. Minimal-change rule

Prefer:

- small diffs
- minimal churn
- safe migrations
- preserve behavior

Do NOT perform broad rewrites unless explicitly requested.

---

## KNOWN IMPORTANT DECISIONS ALREADY MADE

These were deliberate decisions. Do not undo casually.

- Kept IndexedDB database name unchanged to preserve progress
- Renamed project to `school-prep-assistant`
- Generalized to multi-subject-ready structure
- Chose GitHub Pages over Electron due to older macOS constraints
- Added Firebase sync as layered enhancement, not replacement
- Chose profile-based multi-student direction, not auth-based login

---

## DO NOT INTRODUCE WITHOUT EXPLICIT REQUEST

Do not introduce:

- Firebase Auth
- password login
- cloud-only storage
- broad architecture rewrites
- moving away from GitHub Pages
- moving content back into `src`
- unnecessary mass renaming

---

## WHEN MAKING CHANGES

Before implementing significant changes:

1. Identify what existing behavior must remain unchanged.
2. Prefer preserving:

- progress
- routing
- content loading
- sync behavior

3. Call out if a requested change conflicts with this context before changing code.

---

## DEFAULT VALIDATION EXPECTATION

Unless explicitly told otherwise, preserve expectation that:

- `npm test` passes
- `npm run build` passes
- existing math flow still works
- progress still works
- content still loads
- sync still works

---

Treat this file as project constitution.

Preserve it.
Use it.
Do not casually violate it.

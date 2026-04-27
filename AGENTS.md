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
- [docs/future_feature_backlog.md](/Users/hiren/projects/school-prep-assistant/docs/future_feature_backlog.md) for captured future ideas that are not yet active implementation work
- [docs/course2_concept_rollout_plan.md](/Users/hiren/projects/school-prep-assistant/docs/course2_concept_rollout_plan.md) when work touches `Coming soon` Course 2 concepts or concept-pack rollout sequencing

Use the files this way:

- `AGENTS.md`: non-negotiable rules, architectural guardrails, and preservation requirements
- `docs/math_prep_assistant_chat_context.md`: historical context, major decisions, milestones, and rationale

Before making significant changes:

1. Read this file first.
2. Read the history doc if the work touches architecture, storage, sync, content structure, routing, deployment, or migrations.
3. Read the concept rollout plan if the work unlocks or expands Course 2 concepts.
4. If a request conflicts with this constitution, call that out before changing code.

Do not duplicate evolving project rules across multiple files unless there is a strong reason.

---

## FROZEN DOMAIN MODEL V1

Preserve the current platform domain model as frozen unless it is explicitly
revisited.

### Student model

Preserve the current student model structure:

Student

- `homeGrade`
- `placementProfile`
- `profileType`
- `featureFlags`

Placement Profile

- `instructionalGrade`
- `programPathway`

Grade is NOT equivalent to content level.

`homeGrade` and `instructionalGrade` are intentionally distinct and must remain
distinct unless explicitly revisited.

Do not collapse them into a single grade field.

This distinction is required to preserve acceleration, summer advancement,
MAP-style advancement, and pathway-aware progression.

---

### Learning hierarchy

Preserve the current hierarchy:

Subject
→ Course
→ Unit
→ Concept

Do not flatten or blur these layers.

Courses remain subordinate to subjects.

---

### Content metadata

Preserve the supported / reserved additive metadata model for content:

- `instructionalGrades`
- `programPathways`
- `standardsFrameworks`

These fields reserve room for richer placement and standards alignment without
requiring immediate learner-facing complexity.

---

### Learning model direction

Preserve the current and reserved learning model direction:

- Progress
- Mastery (reserved direction)
- Continue Learning
- Recommended Next (reserved direction)

`Continue Learning` should remain the primary learner entry concept.

Reserve room for `Recommended Next` without requiring a recommendation engine
or large UX redesign.

---

### Simplicity guardrails

Domain complexity may increase.
Student-facing complexity must not.

Preserve progressive disclosure.

Do not require first-day learners to make or understand decisions about:

- `homeGrade`
- `instructionalGrade`
- `programPathway`
- `standardsFrameworks`

Placement, pathway, and standards remain system-level structures unless
explicitly changed later.

Do not make these required learner-facing setup choices by default.

---

### Safe release model

New experimental features may be tested under test profiles before being
enabled for production students.

Preserve a lightweight release model based on:

- `profileType`: `production` or `test`
- optional per-student `featureFlags`

Existing students should default safely to `production`.

Do not turn this into enterprise feature-flag infrastructure unless explicitly
requested.

Keep production student experience stable by default.

Rule-based targeted retry support may evolve, but it should begin simple,
deterministic, and explainable.

Remediation should remain lightweight and should not become a full alternate
learning path.

Adaptive behavior should begin with transparent rule-based interventions before
introducing more complex intelligence.

---

### Hidden operational controls

Hidden operational or admin controls may exist for platform maintenance, but
they must remain minimal and admin-oriented.

Do not turn hidden operational controls into a general user-facing settings
system.

Preserve protection for normal student flow so hidden admin tools do not create
day-to-day learner complexity.

Parent/admin reporting may exist inside hidden admin, but it should remain:

- supportive
- local-first friendly
- non-intrusive to the learner flow
- simple enough for one parent/operator to use without introducing a broad
  settings or analytics platform

Progress/time reporting should remain parent-facing and should not create
student-facing pressure by default.

Operational diagnostics may also exist in hidden admin, including local sync
diagnostics and optional remote diagnostics upload for debugging, but they must
remain:

- minimal
- explicit / admin-controlled
- narrow in scope
- non-essential to normal learner flow

---

### Scoring integrity guardrails

Scoring correctness is a top-level product requirement.

Preserve the expectation that:

- correct student answers must never be marked incorrect because of formatting
  or authoring ambiguity
- multiple-choice questions score by exact authored option identity
- numeric / normalized equivalence remains available for true numeric entry
  questions, not for multiple-choice distractors
- stale saved attempts may be repaired against current scoring rules when
  loaded so old incorrect scoring does not keep propagating
- import/export/sync boundaries must not preserve stale incorrect scoring when
  it can be safely repaired

When adding or editing content, preserve:

- multiple-choice correct answer must exactly match an authored option value
- invalid or ambiguous multiple-choice scoring should be rejected before
  content reaches students
- repository-wide scoring validation and known-correct regression tests for new
  concept packs

Do not weaken these safeguards casually.

---

### Course 2 rollout discipline

Current Course 2 concept rollout should remain phased and deliberate.

Do not mass-enable `Coming soon` concepts without the minimum learner-ready
assets in place.

Concept readiness should continue to follow this order:

1. tutorial exists
2. core test exists
3. review test exists
4. scoring / answer-key validation passes
5. concept becomes `Practice ready`

Preserve the current Phase 1 unlock sequence that has already been completed:

- `Solving Proportions`
- `Compare Integers`
- `Integer Operations`

For future concept unlocks, prefer:

- smallest safe concept-pack diffs
- concept-specific scoring regressions
- known-correct answer spot checks
- preserving the current learner flow and labels

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
- cross-device student profile recovery
- cross-device resume of in-progress student work

Do not reintroduce hardcoded single-user identity.

Do not hardcode:

`daughter-1`

Identity must be parameterized through active student selection.

Student identity must remain stable across local IndexedDB and Firebase via
`studentId`.

Do not regress to device-local-only student discovery.

Preserve the ability for a student profile created on one device to be recovered
on another device through the Firebase sync layer.

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
- student profile sync as a recovery layer for cross-device use
- shared student roster / profile discovery support for cross-device recovery
- recovery of in-progress sessions across devices when cloud state is newer

When changing student switching or startup hydration behavior, preserve the
expectation that cloud progress hydration should complete before the learner
experience implies that no resumable work exists for the active student.

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

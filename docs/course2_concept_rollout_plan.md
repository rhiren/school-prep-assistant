# Course 2 Concept Rollout Plan

Last updated: 2026-04-26

## Purpose

This plan turns the current `Coming soon` Course 2 concepts into an ordered,
safe rollout path.

It is intentionally additive and respects the current project guardrails:

- local-first architecture stays unchanged
- content remains manifest-driven under `public/content`
- current math flow stays stable
- small, phased unlocks are preferred over broad churn

## Current Inventory

Course 2 currently contains `53` concepts in the manifest.

Current readiness snapshot:

- `5` concepts fully ready now
- `3` concepts have tutorials but no tests yet
- `45` concepts are still missing tutorials

Fully ready concepts:

- `Ratios`
- `Equivalent Ratios`
- `Unit Rates`
- `Proportions`
- `Percent Relationships`

Tutorial-present / test-missing concepts:

- `Solving Proportions`
- `Compare Integers`
- `Integer Operations`

## Rollout Principle

Treat concept readiness as a staged content pipeline:

1. tutorial exists
2. core test exists
3. review test exists
4. scoring / answer-key validation passes
5. concept is unlocked as practice-ready

Do not mass-enable concepts before those minimum assets are in place.

## Recommended Rollout Order

### Phase 1 — Fastest Safe Unlocks

Highest-value next unlocks because tutorials already exist:

1. `Solving Proportions`
2. `Compare Integers`
3. `Integer Operations`

Why first:

- smallest scope
- lowest architecture risk
- fastest path from `Coming soon` to `Practice ready`
- validates the repeatable concept-pack workflow before broader expansion

Required work per concept:

- add `core` test set
- add `review` test set
- run content validation
- verify scoring with a few known-correct answer paths

### Phase 2 — Finish Ratios / Proportional Relationships Unit

Next highest-value unit continuity:

- `Scale Drawings`
- `Proportional Relationships`
- `Constant of Proportionality`
- `Proportional Tables`
- `Proportional Graphs`
- `Proportional Equations`
- `Percent Basics`
- `Percent Increase and Decrease`
- `Multi-Step Percent`

Why next:

- closest to current active student journey
- keeps the course progression coherent
- extends the strongest existing content area first

Required work:

- author missing tutorials
- add core/review test sets
- validate answer keys and multiple-choice option correctness

### Phase 3 — Rational Numbers Unit

- `Integers`
- `Absolute Value`
- `Add and Subtract Integers`
- `Multiply and Divide Integers`
- `Rational Numbers`
- `Add and Subtract Rational Numbers`
- `Multiply and Divide Rational Numbers`
- `Rational Number Applications`

Note:

`Compare Integers` and `Integer Operations` should already be complete from
Phase 1.

### Phase 4 — Expressions and Equations Unit

- `Expressions`
- `Properties of Operations`
- `Equivalent Expressions`
- `Distributive Property`
- `Evaluate Expressions`
- `One-Step Equations`
- `Two-Step Equations`
- `Multi-Step Equations`
- `Inequalities`
- `Graph Inequalities`
- `Equation Word Problems`

### Phase 5 — Geometry Unit

- `Scale Geometry`
- `Circles`
- `Angle Relationships`
- `Triangles`
- `Area`
- `Composite Area`
- `Surface Area`
- `Volume`

### Phase 6 — Statistics and Probability Unit

- `Statistical Questions`
- `Sampling`
- `Compare Data`
- `Measures of Center`
- `Distributions`
- `Probability`
- `Probability Models`
- `Experimental Probability`
- `Compound Probability`

## Definition Of Ready For A Concept

Before a concept moves from `Coming soon` to `Practice ready`, it should meet
all of the following:

- tutorial exists
- core test set exists
- review test set exists
- all question ids are unique
- multiple-choice options are valid
- multiple-choice correct answer exactly matches an authored option value
- multiple-choice scoring audit passes
- at least a few known-correct sample paths are manually verified

## Content Quality Guardrails

For each new concept test set:

- preserve production-quality question wording
- keep difficulty challenging but fair
- verify explanations and answer keys
- avoid ambiguous answer formats unless normalization explicitly supports them
- prefer deterministic, reviewable authored content over clever shortcuts

## Recommended Immediate Next Build Slice

Implement `Phase 1` first:

- `concept-solving-proportions`
- `concept-compare-integers`
- `concept-integer-operations`

This is the best next step because it converts three visible `Coming soon`
concepts into real learner-ready practice with minimal platform risk.

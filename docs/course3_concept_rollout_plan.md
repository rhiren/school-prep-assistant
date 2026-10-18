# Math Course 3 Concept Rollout Plan

Last updated: 2026-10-17

## Purpose

This plan defines the Course 3 mathematics pathway and the order in which
learner-ready concept packs should be built.

Course 3 is intended for a Grade 7 student working on an accelerated Grade 8
instructional pathway. This preserves the platform distinction between a
student's `homeGrade` and `instructionalGrade`.

The learner-facing Course 3 roadmap is now aligned to the Amplify Desmos Math
California Grade 8 sequence used by the student's school. Existing standards-
aligned Course 3 concepts remain valuable and should be reused, but future
build work should follow the book-aligned sequence below.

The release model remains unchanged:

1. tutorial exists
2. core test exists
3. review test exists
4. scoring and answer-key validation pass
5. concept becomes learner-ready

Only learner-ready concepts belong in the active Course 3 manifest. The full
future sequence remains in this plan until each concept pack is complete.

## Curriculum Basis

The primary Course 3 spine is Amplify Desmos Math California Grade 8, matching
the Grade 8 Student Edition used for the accelerated Grade 7 pathway.

Primary sources:

- [Amplify Desmos Math California 6-12 Caregiver Hub](https://amplify.com/caregiver-hub/adm-ca-6-12/)
- [Common Core State Standards for Mathematics](https://corestandards.org/wp-content/uploads/2023/09/Math_Standards1.pdf)
- [California Mathematics Framework](https://www.cde.ca.gov/ci/ma/cf/)
- [California Grade Eight Mathematics Framework chapter](https://www.cde.ca.gov/ci/ma/cf/documents/mathfwgrade8jl.pdf)

Amplify Grade 8 organizes the course around:

- transformations, congruence, dilations, similarity, and slope
- proportional and linear relationships
- linear equations and systems
- functions, volume, bivariate data, exponents, scientific notation,
  Pythagorean applications, and irrational numbers

## Course Metadata

- Subject: Mathematics
- Course: Course 3
- Learner placement: accelerated Grade 7
- Instructional level: Grade 8
- Standards framework: CA-CCSSM / Common Core Grade 8
- Delivery model: local-first, concept-based, deterministic practice

## Book-Aligned Course Sequence

### Unit 1 — Rigid Transformations and Congruence

Amplify focus: rotations, rigid transformations, congruence, and unknown
interior/exterior angles.

Standards: `8.G.1-5`

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

Current learner-ready packs:

- Translations on the Coordinate Plane
- Reflections on the Coordinate Plane
- Rotations on the Coordinate Plane
- Sequences of Rigid Transformations
- Congruent Figures on a Grid
- Congruence from Transformation Sequences
- Parallel Lines and Transversals
- Triangle Angle Relationships
- Exterior Angles of Triangles
- Unit 1 Mixed Review

### Unit 2 — Dilations, Similarity, and Slope

Amplify focus: dilations on a grid, similar triangles, missing side lengths,
and slope from similar triangles.

Standards: `8.G.3-5`, `8.EE.5-6`

1. Dilations on the Coordinate Plane
2. Scale Factor and Dilations
3. Similar Figures
4. Missing Side Lengths in Similar Triangles
5. Angle-Angle Similarity
6. Similar Triangles and Constant Slope
7. Understand Slope as Rate of Change
8. Find Slope from Graphs
9. Unit 2 Mixed Review

Current learner-ready packs:

- Dilations on the Coordinate Plane
- Scale Factor and Dilations
- Similar Figures
- Missing Side Lengths in Similar Triangles
- Angle-Angle Similarity
- Similar Triangles and Constant Slope
- Understand Slope as Rate of Change
- Find Slope from Graphs
- Unit 2 Mixed Review

### Unit 3 — Proportional and Linear Relationships

Amplify focus: equations for proportional relationships, slope and intercepts,
and slope from two points.

Standards: `8.EE.5-6`

1. Proportional Relationships as Lines
2. Equations in the Form `y = mx`
3. Understand the `y`-Intercept
4. Equations in the Form `y = mx + b`
5. Find Slope from Tables and Points
6. Compare Rates of Change
7. Graph Linear Equations
8. Write Linear Equations from Representations
9. Unit 3 Mixed Review

Current learner-ready packs:

- Proportional Relationships as Lines
- Equations in the Form `y = mx`
- Understand the `y`-Intercept
- Equations in the Form `y = mx + b`
- Find Slope from Tables and Points
- Compare Rates of Change
- Graph Linear Equations
- Write Linear Equations from Representations
- Unit 3 Mixed Review

### Unit 3 Execution Plan

Status: completed in the active manifest.

Goal: make book Unit 3 learner-ready in the active Course 3 sequence while
preserving existing progress by reusing the already-built concept IDs, test
IDs, and tutorial paths.

Current asset audit:

| Book order | Concept | Existing concept ID | Asset state |
| --- | --- | --- | --- |
| 1 | Proportional Relationships as Lines | `concept-proportional-relationships-as-lines` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 2 | Equations in the Form `y = mx` | `concept-equations-y-equals-mx` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 3 | Understand the `y`-Intercept | `concept-understand-y-intercept` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 4 | Equations in the Form `y = mx + b` | `concept-equations-y-equals-mx-plus-b` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 5 | Find Slope from Tables and Points | `concept-find-slope-tables-points` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 6 | Compare Rates of Change | `concept-compare-rates-of-change` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 7 | Graph Linear Equations | `concept-graph-linear-equations` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 8 | Write Linear Equations from Representations | `concept-write-linear-equations-representations` | Reusable pack exists: tutorial, 50-question core, 20-question review |
| 9 | Unit 3 Mixed Review | `concept-unit-3-mixed-review` | Reusable pack exists: tutorial, 50-question core, 20-question review |

Execution sequence:

1. Tutorial freshness pass
   - Read all 9 tutorials in book Unit 3 order.
   - Remove stale references to the older standards-ordered unit sequence if
     present.
   - Strengthen the through-line from Unit 2 slope to Unit 3 linear
     relationships: proportional relationships, `y = mx`, intercepts, tables,
     graphs, and representations.
   - Keep each tutorial concept-specific; do not clone shared language across
     concepts.

2. Manifest realignment
   - Move the 9 existing Unit 3 concepts from the older
     `course3-unit-lines-slope-linear-equations` position into the book-aligned
     Unit 3 slot immediately after `Dilations, Similarity, and Slope`.
   - Preserve every existing concept ID, tutorial path, core test ID, and
     review test ID.
   - Rename the learner-facing unit title to
     `Proportional and Linear Relationships`.
   - Renumber later active units only as needed to keep the course sequence
     coherent.

3. Test and context updates
   - Update `src/test/contentRepository.test.ts` expectations for the new
     book-aligned unit order and counts.
   - Update `AGENTS.md` and this rollout plan with the new active manifest
     state.
   - Keep the existing Course 3 quality gates active for answer balance,
     answer unpredictability, visible answer-label cycles, template variety,
     difficulty progression, tutorial uniqueness, and scoring correctness.

4. Validation gates before release
   - Run `npm test -- src/test/contentRepository.test.ts`.
   - Run `npm test`.
   - Run `npm run build`.
   - Spot-check that Unit 3 appears directly after Unit 2 and contains exactly
     the 9 book Unit 3 concepts in order.

5. Release
   - Commit the realignment and any tutorial freshness fixes.
   - Push to `origin master`.
   - Publish with `npm run deploy`.
   - Verify the GitHub Pages URL returns HTTP 200.

Expected implementation size: mostly manifest, documentation, and test
expectation changes. New question-bank generation is not expected unless the
tutorial freshness or quality-gate pass uncovers content debt in one of the
existing reusable packs.

### Unit 4 — Linear Equations and Linear Systems

Status: complete. All 18 planned concepts are active, plus a retained
Linear Equations Checkpoint immediately before systems (19 entries total).
The checkpoint preserves the old `concept-unit-2-mixed-review` identity and
its saved attempts; it is not the new comprehensive Unit 4 review.

Amplify focus: single-variable equations with parentheses and systems solved
by graphing. The app may include substitution and elimination as extension
practice after graphing, because those packs are already built and useful for
accelerated readiness.

Standards: `8.EE.7-8`

1. Review Equivalent Expressions
2. Solve Multi-Step Equations
3. Equations with the Distributive Property
4. Equations with Variables on Both Sides
5. Equations with Rational Coefficients
6. One Solution, No Solution, or Infinitely Many Solutions
7. Build Equations from Context
8. Linear Equation Word Problems
9. Check and Explain Equation Solutions
10. Understand Solutions to Systems
11. Solve Systems by Graphing
12. Solve Systems by Substitution
13. Solve Systems by Elimination
14. Systems with No Solution
15. Systems with Infinitely Many Solutions
16. Choose an Efficient System-Solving Method
17. Systems of Equations Word Problems
18. Unit 4 Mixed Review

Current learner-ready packs:

- Review Equivalent Expressions
- Solve Multi-Step Equations
- Equations with the Distributive Property
- Equations with Variables on Both Sides
- Equations with Rational Coefficients
- One Solution, No Solution, or Infinitely Many Solutions
- Build Equations from Context
- Linear Equation Word Problems
- Check and Explain Equation Solutions
- Linear Equations Checkpoint
- Understand Solutions to Systems
- Solve Systems by Graphing
- Solve Systems by Substitution
- Solve Systems by Elimination
- Systems with No Solution
- Systems with Infinitely Many Solutions
- Choose an Efficient System-Solving Method
- Systems of Equations Word Problems
- Unit 4 Mixed Review

The four new packs contain 280 questions, with 50 core and 20 review per pack.
Core stages are 10 scaffold, 25 standard, and 15 challenge; review stages are
8 scaffold and 12 standard. Challenge forms include parameter constraints,
error analysis, model validity, method justification, and multi-step transfer.
Review banks use fresh numerical instances rather than copying core questions.

Release verification includes existing repository gates plus
`src/test/unit4ContentQuality.test.ts`: arbitrary repeated answer blocks of
length 2-4, duplicate prompts/options, independently calculated answer checks,
and substitution into ticket, wheel, mixture, and fundraiser constraints.
No new template-variety exceptions were added. Existing legacy exceptions
remain explicit debt; this release does not claim to remove them.

### Unit 5 — Functions and Volume

Amplify focus: graphs as functions, comparing linear functions, and volume of
cylinders.

Standards: `8.F.1-5`, `8.G.9`

1. Understand Functions
2. Functions in Tables and Mapping Diagrams
3. Functions on Graphs
4. Compare Functions in Different Representations
5. Linear and Nonlinear Functions
6. Construct Linear Functions
7. Rate of Change and Initial Value
8. Interpret Linear Functions in Context
9. Volume of Cylinders
10. Unit 5 Mixed Review

Current status: not yet built in active Course 3.

### Unit 6 — Associations in Data

Amplify focus: scatter plots, lines of fit, predictions, and two-way tables.

Standards: `8.SP.1-4`

1. Read and Construct Scatter Plots
2. Patterns of Association
3. Clusters and Outliers
4. Informal Lines of Best Fit
5. Evaluate the Fit of a Linear Model
6. Use Linear Models to Make Predictions
7. Interpret Slope and Intercept in Data
8. Two-Way Tables
9. Relative Frequencies in Two-Way Tables
10. Categorical Association
11. Unit 6 Mixed Review

Current status: not yet built in active Course 3.

### Unit 7 — Exponents and Scientific Notation

Amplify focus: multiplying powers and writing numbers in scientific notation.
The app includes a broader exponent/scientific-notation foundation because it
has already been built and is appropriate for accelerated Grade 8 readiness.

Standards: `8.EE.1`, `8.EE.3-4`

1. Integer Exponents
2. Zero and Negative Exponents
3. Powers of Ten
4. Scientific Notation
5. Operations with Scientific Notation
6. Unit 7 Mixed Review

Current reusable packs:

- Integer Exponents
- Zero and Negative Exponents
- Powers of Ten
- Scientific Notation
- Operations with Scientific Notation

### Unit 8 — The Pythagorean Theorem and Irrational Numbers

Amplify focus: approximating square roots, finding unknown side lengths, and
identifying rational and irrational numbers.

Standards: `8.NS.1-2`, `8.EE.2`, `8.G.6-8`

1. Rational and Irrational Numbers
2. Repeating Decimals as Fractions
3. Square Roots and Perfect Squares
4. Cube Roots and Perfect Cubes
5. Approximate Irrational Numbers
6. Compare and Order Real Numbers
7. Explore the Pythagorean Theorem
8. Explain the Pythagorean Theorem
9. Find Missing Legs and Hypotenuses
10. Converse of the Pythagorean Theorem
11. Pythagorean Theorem Word Problems
12. Distance on the Coordinate Plane
13. Unit 8 Mixed Review
14. Course 3 Final Review

Current reusable packs:

- Rational and Irrational Numbers
- Repeating Decimals as Fractions
- Square Roots and Perfect Squares
- Cube Roots and Perfect Cubes
- Approximate Irrational Numbers
- Compare and Order Real Numbers
- Unit 1 Mixed Review

## Realignment Strategy

Realignment must preserve student progress. Existing active concept IDs,
test IDs, and tutorial paths should not be renamed casually. When a concept is
reused in a new book-aligned unit, prefer moving the existing manifest entry
over creating a duplicate concept with a new ID.

Use this sequence:

1. Build missing book Unit 1 concepts as complete learner-ready packs.
2. Add those Unit 1 concepts to the active manifest.
3. Move already-built reusable concepts into their book-aligned units only
   after the early book units have enough learner-ready content that the
   student flow will not look like it starts in the middle of the book.
4. Preserve old concept IDs during manifest moves so local progress, Firebase
   sync, export/import, and parent reporting continue to attach to the same
   skills.
5. Keep unit mixed reviews concept-specific to their new book-aligned units.
   Do not reuse an old mixed review if its title or question coverage no
   longer matches the unit.
6. Publish only after `npm test` and `npm run build` pass.

## Current Active Manifest State

As of this update, the active Course 3 manifest presents the complete
ten-concept book-aligned Unit 1, the complete nine-concept book Unit 2,
the complete nine-concept book Unit 3, the complete book Unit 4 including its
retained checkpoint, and the remaining reusable number/exponent assets:

- Rigid Transformations and Congruence: 10 learner-ready concepts
- Dilations, Similarity, and Slope: 9 learner-ready concepts
- Proportional and Linear Relationships: 9 learner-ready concepts
- Linear Equations and Linear Systems: 19 learner-ready concepts
- Real Numbers and Exponents: 12 learner-ready concepts

Total active Course 3 concepts: 59.

These should be treated as reusable content assets during the transition, not
as discarded work.

## Next Build Target

The next Course 3 build target is book Unit 5:

- Understand Functions

## Definition of Ready

Before a Course 3 concept enters the manifest:

- tutorial is complete and readable by a Grade 7 learner
- core test contains challenging, balanced practice
- review test reinforces the essential ideas with lower cognitive load
- all question IDs are globally unique
- every multiple-choice correct answer exactly matches one authored option
- distractors represent realistic misconceptions
- explanations state why the correct answer works
- difficulty distribution is intentional and generally increases within a set
- answer-position sequence checks pass, not just total answer-position balance
- question-template variety checks pass unless reducing documented legacy debt
- tutorial similarity checks pass so the tutorial is concept-specific
- known-correct answer paths are spot-checked
- repository-wide content validation passes

## Content Quality Expectations

Each concept pack should:

- teach meaning before procedure
- connect representations rather than isolate them
- include real-world reasoning without artificial story problems
- include misconception analysis and error correction
- avoid relying on one repeated question template
- use Grade 7-friendly language while preserving Grade 8 rigor
- remain deterministic and reviewable

## UI and Navigation Direction

Course navigation should group courses under their subject so Mathematics can
contain Course 2 and Course 3 without appearing as two separate subjects.

The learner should be able to:

1. choose Mathematics
2. choose Course 2 or Course 3
3. see units and learner-ready concepts
4. open a tutorial or test without encountering incomplete content

Progress should remain student-scoped and course-aware.

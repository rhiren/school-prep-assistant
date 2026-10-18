import { describe, expect, it } from "vitest";
import type { CourseManifestDocument, Question, QuestionBankDocument } from "../domain/models";
import {
  buildContentIndex,
  hasConsistentMultipleChoiceScoring,
  createDefaultContentRepository,
  hasMatchingMultipleChoiceCorrectAnswer,
  hasValidMultipleChoiceChoices,
  validateManifest,
} from "../services/contentRepository";

const COURSE3_TEMPLATE_VARIETY_DEBT_TEST_SET_IDS = new Set([
  "course3-compare-order-real-numbers-core",
  "course3-compare-order-real-numbers-review",
  "course3-equations-distributive-property-review",
  "course3-equations-rational-coefficients-core",
  "course3-equations-rational-coefficients-review",
  "course3-equations-solution-types-core",
  "course3-equations-solution-types-review",
  "course3-unit-2-mixed-review-review",
]);

function getCorrectAnswerIndex(question: Question) {
  return question.choices?.findIndex((choice) => choice.value === question.correctAnswer) ?? -1;
}

function getLongestSequentialAnswerCycle(answerIndexes: number[]) {
  let longest = 0;

  for (let start = 0; start < answerIndexes.length; start += 1) {
    let length = 1;

    for (let index = start + 1; index < answerIndexes.length; index += 1) {
      if (answerIndexes[index] !== ((answerIndexes[index - 1] ?? -1) + 1) % 4) {
        break;
      }

      length += 1;
    }

    longest = Math.max(longest, length);
  }

  return longest;
}

function getLongestSameAnswerRun(answerIndexes: number[]) {
  let longest = 0;
  let current = 0;
  let previous = -1;

  for (const answerIndex of answerIndexes) {
    current = answerIndex === previous ? current + 1 : 1;
    previous = answerIndex;
    longest = Math.max(longest, current);
  }

  return longest;
}

function getLongestRepeatedCycle<T>(values: T[]) {
  let longest = 0;

  for (let cycleLength = 2; cycleLength <= 4; cycleLength += 1) {
    for (let start = 0; start + cycleLength * 2 <= values.length; start += 1) {
      const firstCycle = values.slice(start, start + cycleLength);
      const secondCycle = values.slice(start + cycleLength, start + cycleLength * 2);

      if (firstCycle.every((value, index) => value === secondCycle[index])) {
        longest = Math.max(longest, cycleLength);
      }
    }
  }

  return longest;
}

function getVisibleCorrectAnswerLabel(question: Question) {
  const match = question.correctAnswer.match(
    /^(Triangle|Figure|Shape|Point|Line|Polygon|Rectangle) ([A-Z]) with\b/,
  );

  return match ? `${match[1]} ${match[2]}` : null;
}

function normalizeQuestionTemplate(prompt: string) {
  return prompt
    .replace(/-?\d+(?:\/\d+)?(?:\.\d+)?/g, "#")
    .replace(/\([^)]*\)/g, "(#)")
    .replace(/\b[A-Z]\b/g, "X")
    .replace(/\s+/g, " ")
    .trim();
}

function getTemplateStats(questions: Question[]) {
  const templates = new Map<string, number>();

  for (const question of questions) {
    const template = normalizeQuestionTemplate(question.prompt);
    templates.set(template, (templates.get(template) ?? 0) + 1);
  }

  return {
    uniqueTemplateCount: templates.size,
    largestTemplateCount: Math.max(...templates.values()),
  };
}

function getDifficultyRank(question: Question) {
  if (question.difficulty === "scaffold") {
    return 0;
  }

  if (question.difficulty === "standard") {
    return 1;
  }

  return 2;
}

function normalizeTutorialForSimilarity(tutorial: string) {
  return tutorial
    .replace(/^# .+$/m, "")
    .toLowerCase()
    .replace(/`[^`]+`/g, "`math`")
    .replace(/-?\d+(?:\/\d+)?(?:\.\d+)?/g, "#")
    .replace(/[^a-z#`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTutorialShingles(tutorial: string) {
  const words = normalizeTutorialForSimilarity(tutorial).split(" ").filter(Boolean);
  const shingles = new Set<string>();

  for (let index = 0; index <= words.length - 8; index += 1) {
    shingles.add(words.slice(index, index + 8).join(" "));
  }

  return shingles;
}

function getJaccardSimilarity(first: Set<string>, second: Set<string>) {
  const intersectionCount = [...first].filter((value) => second.has(value)).length;
  const unionCount = new Set([...first, ...second]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

describe("content repository", () => {
  it("builds O(1) question lookup access for loaded content", async () => {
    const repository = await createDefaultContentRepository();
    const question = await repository.getQuestionById("concept-unit-rates-core-001");
    const testConcept = await repository.getConcept("concept-unit-rates");
    const scaleDrawingsConcept = await repository.getConcept("concept-scale-drawings");
    const proportionalRelationshipsConcept = await repository.getConcept(
      "concept-proportional-relationships",
    );
    const constantOfProportionalityConcept = await repository.getConcept(
      "concept-constant-of-proportionality",
    );
    const proportionalTablesConcept = await repository.getConcept("concept-proportional-tables");
    const proportionalGraphsConcept = await repository.getConcept("concept-proportional-graphs");
    const proportionalEquationsConcept = await repository.getConcept(
      "concept-proportional-equations",
    );
    const compareIntegersConcept = await repository.getConcept("concept-compare-integers");
    const integerOperationsConcept = await repository.getConcept("concept-integer-operations");
    const solvingProportionsConcept = await repository.getConcept("concept-solving-proportions");
    const tutorialContent = await repository.getTutorialContent("concept-compare-integers");
    const testSets = await repository.getTestSetsForConcept("concept-unit-rates");
    const scaleDrawingsTestSets = await repository.getTestSetsForConcept("concept-scale-drawings");
    const proportionalRelationshipsTestSets = await repository.getTestSetsForConcept(
      "concept-proportional-relationships",
    );
    const constantOfProportionalityTestSets = await repository.getTestSetsForConcept(
      "concept-constant-of-proportionality",
    );
    const proportionalTablesTestSets = await repository.getTestSetsForConcept(
      "concept-proportional-tables",
    );
    const proportionalGraphsTestSets = await repository.getTestSetsForConcept(
      "concept-proportional-graphs",
    );
    const proportionalEquationsTestSets = await repository.getTestSetsForConcept(
      "concept-proportional-equations",
    );
    const compareIntegersTestSets = await repository.getTestSetsForConcept("concept-compare-integers");
    const integerOperationsTestSets = await repository.getTestSetsForConcept("concept-integer-operations");
    const solvingProportionsTestSets = await repository.getTestSetsForConcept("concept-solving-proportions");
    const reviewQuestions = await repository.getQuestionsForTestSet("concept-unit-rates-review");

    expect(question?.prompt).toContain("24 miles in 3 hours");
    expect(repository.getQuestionByIdSync("concept-unit-rates-core-001")?.conceptId).toBe(
      "concept-unit-rates",
    );
    expect(testConcept?.hasTest).toBe(true);
    expect(scaleDrawingsConcept?.hasTest).toBe(true);
    expect(proportionalRelationshipsConcept?.hasTest).toBe(true);
    expect(constantOfProportionalityConcept?.hasTest).toBe(true);
    expect(proportionalTablesConcept?.hasTest).toBe(true);
    expect(proportionalGraphsConcept?.hasTest).toBe(true);
    expect(proportionalEquationsConcept?.hasTest).toBe(true);
    expect(compareIntegersConcept?.hasTest).toBe(true);
    expect(integerOperationsConcept?.hasTest).toBe(true);
    expect(solvingProportionsConcept?.hasTest).toBe(true);
    expect(testSets.map((testSet) => testSet.id)).toEqual([
      "concept-unit-rates-core",
      "concept-unit-rates-review",
    ]);
    expect(scaleDrawingsTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-scale-drawings-core",
      "concept-scale-drawings-review",
    ]);
    expect(proportionalRelationshipsTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-proportional-relationships-core",
      "concept-proportional-relationships-review",
    ]);
    expect(constantOfProportionalityTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-constant-of-proportionality-core",
      "concept-constant-of-proportionality-review",
    ]);
    expect(proportionalTablesTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-proportional-tables-core",
      "concept-proportional-tables-review",
    ]);
    expect(proportionalGraphsTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-proportional-graphs-core",
      "concept-proportional-graphs-review",
    ]);
    expect(proportionalEquationsTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-proportional-equations-core",
      "concept-proportional-equations-review",
    ]);
    expect(compareIntegersTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-compare-integers-core",
      "concept-compare-integers-review",
    ]);
    expect(integerOperationsTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-integer-operations-core",
      "concept-integer-operations-review",
    ]);
    expect(solvingProportionsTestSets.map((testSet) => testSet.id)).toEqual([
      "concept-solving-proportions-core",
      "concept-solving-proportions-review",
    ]);
    expect(testConcept?.skillTags).toContain("word-problem");
    expect(testConcept?.meta).toEqual({
      type: "core",
      assessable: true,
    });
    expect(testSets[0]?.difficultyProfile).toEqual({
      scaffold: true,
      standard: true,
      challenge: true,
    });
    expect(reviewQuestions).toHaveLength(20);
    expect(tutorialContent).toContain("#");
  });

  it("keeps unlocked concept core packs at 50 questions", async () => {
    const repository = await createDefaultContentRepository();
    const scaleDrawingsCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-scale-drawings-core",
    );
    const proportionalRelationshipsCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-proportional-relationships-core",
    );
    const constantOfProportionalityCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-constant-of-proportionality-core",
    );
    const proportionalTablesCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-proportional-tables-core",
    );
    const proportionalGraphsCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-proportional-graphs-core",
    );
    const proportionalEquationsCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-proportional-equations-core",
    );
    const compareIntegersCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-compare-integers-core",
    );
    const integerOperationsCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-integer-operations-core",
    );
    const solvingProportionsCoreQuestions = await repository.getQuestionsForTestSet(
      "concept-solving-proportions-core",
    );

    expect(scaleDrawingsCoreQuestions).toHaveLength(50);
    expect(proportionalRelationshipsCoreQuestions).toHaveLength(50);
    expect(constantOfProportionalityCoreQuestions).toHaveLength(50);
    expect(proportionalTablesCoreQuestions).toHaveLength(50);
    expect(proportionalGraphsCoreQuestions).toHaveLength(50);
    expect(proportionalEquationsCoreQuestions).toHaveLength(50);
    expect(compareIntegersCoreQuestions).toHaveLength(50);
    expect(integerOperationsCoreQuestions).toHaveLength(50);
    expect(solvingProportionsCoreQuestions).toHaveLength(50);
  });

  it("loads the new Grade 6 Science course with its standard and advanced practice sets", async () => {
    const repository = await createDefaultContentRepository();
    const scienceCourse = await repository.getCourse("course-6-science");
    const scienceConcept = await repository.getConcept("concept-genetics-reproduction-behavior");
    const scienceTutorial = await repository.getTutorialContent(
      "concept-genetics-reproduction-behavior",
    );
    const scienceTestSets = await repository.getTestSetsForConcept(
      "concept-genetics-reproduction-behavior",
    );
    const testOneQuestions = await repository.getQuestionsForTestSet(
      "science-genetics-behavior-test-1",
    );
    const testTwoQuestions = await repository.getQuestionsForTestSet(
      "science-genetics-behavior-test-2",
    );
    const testThreeQuestions = await repository.getQuestionsForTestSet(
      "science-genetics-behavior-test-3",
    );
    const advancedTestOneQuestions = await repository.getQuestionsForTestSet(
      "science-genetics-behavior-advanced-test-1",
    );
    const advancedTestTwoQuestions = await repository.getQuestionsForTestSet(
      "science-genetics-behavior-advanced-test-2",
    );

    expect(scienceCourse?.subjectTitle).toBe("Science");
    expect(scienceCourse?.courseTitle).toBe("Grade 6 Science");
    expect(scienceCourse?.units[0]?.id).toBe("unit-genetics-behavior");
    expect(scienceConcept?.hasTest).toBe(true);
    expect(scienceConcept?.skillTags).toEqual([
      "conceptual",
      "vocabulary",
      "application",
      "reasoning",
    ]);
    expect(scienceTutorial).toContain("# Genetics, Reproduction, and Behavior");
    expect(scienceTestSets.map((testSet) => testSet.id).sort()).toEqual([
      "science-genetics-behavior-advanced-test-1",
      "science-genetics-behavior-advanced-test-2",
      "science-genetics-behavior-test-1",
      "science-genetics-behavior-test-2",
      "science-genetics-behavior-test-3",
    ]);

    for (const questions of [testOneQuestions, testTwoQuestions, testThreeQuestions]) {
      expect(questions).toHaveLength(25);
      expect(questions.filter((question) => question.difficulty === "scaffold")).toHaveLength(8);
      expect(questions.filter((question) => question.difficulty === "standard")).toHaveLength(12);
      expect(questions.filter((question) => question.difficulty === "challenge")).toHaveLength(5);
      expect(questions.every((question) => question.questionType === "multiple_choice")).toBe(true);
      expect(questions.every((question) => (question.choices?.length ?? 0) === 4)).toBe(true);
    }

    for (const questions of [advancedTestOneQuestions, advancedTestTwoQuestions]) {
      expect(questions).toHaveLength(25);
      expect(questions.filter((question) => question.difficulty === "scaffold")).toHaveLength(5);
      expect(questions.filter((question) => question.difficulty === "standard")).toHaveLength(10);
      expect(questions.filter((question) => question.difficulty === "challenge")).toHaveLength(10);
      expect(questions.every((question) => question.questionType === "multiple_choice")).toBe(true);
      expect(questions.every((question) => (question.choices?.length ?? 0) === 4)).toBe(true);
    }
  });

  it("loads the Grade 7 Life Science scaffold with the cells concept pack", async () => {
    const repository = await createDefaultContentRepository();
    const scienceCourse = await repository.getCourse("course-7-life-science");
    const cellsConcept = await repository.getConcept("concept-cells-living-things");
    const bodySystemsConcept = await repository.getConcept(
      "concept-body-systems-information-processing",
    );
    const tutorial = await repository.getTutorialContent("concept-cells-living-things");
    const testSets = await repository.getTestSetsForConcept("concept-cells-living-things");
    const coreQuestions = await repository.getQuestionsForTestSet(
      "science7-cells-living-things-core",
    );
    const reviewQuestions = await repository.getQuestionsForTestSet(
      "science7-cells-living-things-review",
    );

    expect(scienceCourse?.subjectTitle).toBe("Science");
    expect(scienceCourse?.courseTitle).toBe("Grade 7 Life Science");
    expect(scienceCourse?.instructionalGrades).toEqual(["7"]);
    expect(scienceCourse?.programPathways).toEqual(["SRVUSD"]);
    expect(scienceCourse?.standardsFrameworks).toEqual(["CA NGSS"]);
    expect(scienceCourse?.units.map((unit) => unit.id)).toEqual([
      "unit-cells-living-systems",
      "unit-body-systems-information",
      "unit-growth-energy-flow",
      "unit-ecosystems",
      "unit-genetics-inheritance",
      "unit-evolution-life-history",
      "unit-biodiversity-human-impact",
    ]);
    expect(cellsConcept?.hasTest).toBe(true);
    expect(cellsConcept?.tags).toEqual(
      expect.arrayContaining(["MS-LS1-1", "MS-LS1-2"]),
    );
    expect(bodySystemsConcept?.hasTest).toBe(true);
    expect(bodySystemsConcept?.meta?.assessable).toBe(true);
    expect(tutorial).toContain("# Cells and Living Things");
    expect(testSets.map((testSet) => testSet.id)).toEqual([
      "science7-cells-living-things-core",
      "science7-cells-living-things-review",
    ]);
    expect(cellsConcept?.testQuestionCount).toBe(30);
    expect(coreQuestions).toHaveLength(30);
    expect(reviewQuestions).toHaveLength(15);
    expect(coreQuestions.every((question) => question.questionType === "multiple_choice")).toBe(true);
    expect(reviewQuestions.every((question) => (question.choices?.length ?? 0) === 4)).toBe(true);
    expect(coreQuestions.flatMap((question) => question.reasoningTags ?? [])).toEqual(
      expect.arrayContaining(["scenario-transfer", "claim-evidence", "model-interpretation"]),
    );
  });

  it("loads the Grade 7 Body Systems and Information Processing concept pack", async () => {
    const repository = await createDefaultContentRepository();
    const concept = await repository.getConcept("concept-body-systems-information-processing");
    const tutorial = await repository.getTutorialContent(
      "concept-body-systems-information-processing",
    );
    const testSets = await repository.getTestSetsForConcept(
      "concept-body-systems-information-processing",
    );
    const coreQuestions = await repository.getQuestionsForTestSet(
      "science7-body-systems-information-processing-core",
    );
    const reviewQuestions = await repository.getQuestionsForTestSet(
      "science7-body-systems-information-processing-review",
    );

    expect(concept?.hasTest).toBe(true);
    expect(concept?.tags).toEqual(expect.arrayContaining(["MS-LS1-3", "MS-LS1-8"]));
    expect(tutorial).toContain("# Body Systems and Information Processing");
    expect(testSets.map((testSet) => testSet.id)).toEqual([
      "science7-body-systems-information-processing-core",
      "science7-body-systems-information-processing-review",
    ]);
    expect(concept?.testQuestionCount).toBe(30);
    expect(coreQuestions).toHaveLength(30);
    expect(reviewQuestions).toHaveLength(15);
    expect(coreQuestions.filter((question) => question.difficulty === "scaffold")).toHaveLength(6);
    expect(coreQuestions.filter((question) => question.difficulty === "standard")).toHaveLength(9);
    expect(coreQuestions.filter((question) => question.difficulty === "challenge")).toHaveLength(15);
    expect(reviewQuestions.filter((question) => question.difficulty === "scaffold")).toHaveLength(4);
    expect(reviewQuestions.filter((question) => question.difficulty === "standard")).toHaveLength(6);
    expect(reviewQuestions.filter((question) => question.difficulty === "challenge")).toHaveLength(5);
    expect(coreQuestions.every((question) => question.questionType === "multiple_choice")).toBe(true);
    expect(reviewQuestions.every((question) => (question.choices?.length ?? 0) === 4)).toBe(true);
    expect([...coreQuestions, ...reviewQuestions].flatMap((question) => question.reasoningTags ?? [])).toEqual(
      expect.arrayContaining([
        "scenario-transfer",
        "claim-evidence",
        "model-interpretation",
        "cause-effect",
        "data-pattern",
        "misconception-check",
      ]),
    );
  });

  it("keeps Grade 7 Science practice-ready packs focused on transfer reasoning", async () => {
    const repository = await createDefaultContentRepository();
    const scienceCourse = await repository.getCourse("course-7-life-science");
    const readyConcepts =
      scienceCourse?.units
        .flatMap((unit) => unit.concepts)
        .filter((concept) => concept.hasTest) ?? [];

    expect(readyConcepts.map((concept) => concept.id)).toEqual([
      "concept-cells-living-things",
      "concept-cell-specialization-microscopy-evidence",
      "concept-cell-membrane-materials-movement",
      "concept-body-systems-information-processing",
      "concept-homeostasis-feedback-body-systems",
      "concept-digestion-molecules-cell-fuel",
      "concept-growth-photosynthesis-cellular-respiration",
      "concept-matter-energy-transfer-organisms",
      "concept-ecosystem-interactions-dynamics",
      "concept-population-data-ecosystem-stability",
      "concept-energy-pyramids-food-web-efficiency",
      "concept-limiting-factors-carrying-capacity",
      "concept-decomposers-matter-cycling",
      "concept-ecosystem-disturbance-recovery",
      "concept-genetics-inheritance-variation",
      "concept-dna-genes-chromosomes-traits",
      "concept-evolution-life-history",
      "concept-fossil-record-rock-layer-evidence",
      "concept-natural-selection-adaptation",
      "concept-comparative-anatomy-evolution-relationships",
      "concept-biodiversity-human-impact",
      "concept-biodiversity-solutions-tradeoffs",
    ]);

    for (const concept of readyConcepts) {
      const testSets = await repository.getTestSetsForConcept(concept.id);
      const allQuestions = (
        await Promise.all(testSets.map((testSet) => repository.getQuestionsForTestSet(testSet.id)))
      ).flat();
      const skillTags = new Set(allQuestions.flatMap((question) => question.skillTags ?? []));
      const reasoningTags = allQuestions.flatMap((question) => question.reasoningTags ?? []);
      const nonRecallQuestions = allQuestions.filter((question) =>
        (question.reasoningTags ?? []).some((tag) => tag !== "recall"),
      );

      expect(testSets.some((testSet) => testSet.type === "concept")).toBe(true);
      expect(testSets.some((testSet) => testSet.type === "review")).toBe(true);
      expect(concept.testQuestionCount).toBe(30);
      expect(await repository.getQuestionsForTestSet(testSets.find((testSet) => testSet.type === "concept")?.id ?? "")).toHaveLength(30);
      expect(allQuestions.length).toBeGreaterThanOrEqual(45);
      expect(skillTags.size).toBeGreaterThanOrEqual(3);
      expect(skillTags).not.toEqual(new Set(["vocabulary"]));
      expect(reasoningTags).toEqual(
        expect.arrayContaining([
          "scenario-transfer",
          "claim-evidence",
          "model-interpretation",
        ]),
      );
      expect(new Set(reasoningTags).size).toBeGreaterThanOrEqual(4);
      expect(nonRecallQuestions.length / allQuestions.length).toBeGreaterThanOrEqual(0.6);
      expect(allQuestions.every((question) => (question.reasoningTags?.length ?? 0) > 0)).toBe(
        true,
      );
    }
  });

  it("keeps Grade 7 Science tutorials structured for retention", async () => {
    const repository = await createDefaultContentRepository();
    const scienceCourse = await repository.getCourse("course-7-life-science");
    const concepts = scienceCourse?.units.flatMap((unit) => unit.concepts) ?? [];
    const requiredSections = [
      "## Hook",
      "## Big Idea",
      "## Learn It",
      "## Build The Model",
      "## Memory Anchors",
      "## Common Traps",
      "## Pause And Think",
      "## Apply It",
      "## 3-2-1 Memory Check",
    ];

    expect(concepts.length).toBeGreaterThan(0);

    for (const concept of concepts) {
      const tutorial = await repository.getTutorialContent(concept.id);
      expect(tutorial).not.toBeNull();
      expect(tutorial?.length ?? 0).toBeGreaterThan(1200);

      for (const section of requiredSections) {
        expect(tutorial).toContain(section);
      }
    }
  });

  it("loads Course 3 with complete Unit 1 and Unit 2 concept packs", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const conceptPacks = [
      {
        conceptId: "concept-translations-coordinate-plane",
        standards: ["8.G.1", "8.G.3"],
        tutorialHeading: "# Translations on the Coordinate Plane",
        coreTestId: "course3-translations-coordinate-plane-core",
        reviewTestId: "course3-translations-coordinate-plane-review",
      },
      {
        conceptId: "concept-reflections-coordinate-plane",
        standards: ["8.G.1", "8.G.3"],
        tutorialHeading: "# Reflections on the Coordinate Plane",
        coreTestId: "course3-reflections-coordinate-plane-core",
        reviewTestId: "course3-reflections-coordinate-plane-review",
      },
      {
        conceptId: "concept-rotations-coordinate-plane",
        standards: ["8.G.1", "8.G.3"],
        tutorialHeading: "# Rotations on the Coordinate Plane",
        coreTestId: "course3-rotations-coordinate-plane-core",
        reviewTestId: "course3-rotations-coordinate-plane-review",
      },
      {
        conceptId: "concept-sequences-rigid-transformations",
        standards: ["8.G.1", "8.G.2", "8.G.3"],
        tutorialHeading: "# Sequences of Rigid Transformations",
        coreTestId: "course3-sequences-rigid-transformations-core",
        reviewTestId: "course3-sequences-rigid-transformations-review",
      },
      {
        conceptId: "concept-congruent-figures-grid",
        standards: ["8.G.1", "8.G.2"],
        tutorialHeading: "# Congruent Figures on a Grid",
        coreTestId: "course3-congruent-figures-grid-core",
        reviewTestId: "course3-congruent-figures-grid-review",
      },
      {
        conceptId: "concept-congruence-transformation-sequences",
        standards: ["8.G.1", "8.G.2"],
        tutorialHeading: "# Congruence from Transformation Sequences",
        coreTestId: "course3-congruence-transformation-sequences-core",
        reviewTestId: "course3-congruence-transformation-sequences-review",
      },
      {
        conceptId: "concept-parallel-lines-transversals",
        standards: ["8.G.5"],
        tutorialHeading: "# Parallel Lines and Transversals",
        coreTestId: "course3-parallel-lines-transversals-core",
        reviewTestId: "course3-parallel-lines-transversals-review",
      },
      {
        conceptId: "concept-triangle-angle-relationships",
        standards: ["8.G.5"],
        tutorialHeading: "# Triangle Angle Relationships",
        coreTestId: "course3-triangle-angle-relationships-core",
        reviewTestId: "course3-triangle-angle-relationships-review",
      },
      {
        conceptId: "concept-exterior-angles-triangles",
        standards: ["8.G.5"],
        tutorialHeading: "# Exterior Angles of Triangles",
        coreTestId: "course3-exterior-angles-triangles-core",
        reviewTestId: "course3-exterior-angles-triangles-review",
      },
      {
        conceptId: "concept-course3-unit1-geometry-mixed-review",
        standards: ["8.G.1", "8.G.2", "8.G.3", "8.G.5"],
        tutorialHeading: "# Unit 1 Mixed Review",
        coreTestId: "course3-unit1-geometry-mixed-review-core",
        reviewTestId: "course3-unit1-geometry-mixed-review-review",
      },
      {
        conceptId: "concept-dilations-coordinate-plane",
        standards: ["8.G.3", "8.G.4"],
        tutorialHeading: "# Dilations on the Coordinate Plane",
        coreTestId: "course3-dilations-coordinate-plane-core",
        reviewTestId: "course3-dilations-coordinate-plane-review",
      },
      {
        conceptId: "concept-scale-factor-dilations",
        standards: ["8.G.3", "8.G.4"],
        tutorialHeading: "# Scale Factor and Dilations",
        coreTestId: "course3-scale-factor-dilations-core",
        reviewTestId: "course3-scale-factor-dilations-review",
      },
      {
        conceptId: "concept-similar-figures",
        standards: ["8.G.4"],
        tutorialHeading: "# Similar Figures",
        coreTestId: "course3-similar-figures-core",
        reviewTestId: "course3-similar-figures-review",
      },
      {
        conceptId: "concept-missing-side-lengths-similar-triangles",
        standards: ["8.G.4"],
        tutorialHeading: "# Missing Side Lengths in Similar Triangles",
        coreTestId: "course3-missing-side-lengths-similar-triangles-core",
        reviewTestId: "course3-missing-side-lengths-similar-triangles-review",
      },
      {
        conceptId: "concept-angle-angle-similarity",
        standards: ["8.G.4", "8.G.5"],
        tutorialHeading: "# Angle-Angle Similarity",
        coreTestId: "course3-angle-angle-similarity-core",
        reviewTestId: "course3-angle-angle-similarity-review",
      },
      {
        conceptId: "concept-similar-triangles-constant-slope",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Similar Triangles and Constant Slope",
        coreTestId: "course3-similar-triangles-constant-slope-core",
        reviewTestId: "course3-similar-triangles-constant-slope-review",
      },
      {
        conceptId: "concept-understand-slope-rate-change",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Understand Slope as Rate of Change",
        coreTestId: "course3-understand-slope-rate-change-core",
        reviewTestId: "course3-understand-slope-rate-change-review",
      },
      {
        conceptId: "concept-find-slope-from-graphs",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Find Slope from Graphs",
        coreTestId: "course3-find-slope-from-graphs-core",
        reviewTestId: "course3-find-slope-from-graphs-review",
      },
      {
        conceptId: "concept-course3-unit2-dilations-similarity-slope-mixed-review",
        standards: ["8.G.3", "8.G.4", "8.G.5", "8.EE.5", "8.EE.6"],
        tutorialHeading: "# Unit 2 Mixed Review",
        coreTestId: "course3-unit2-dilations-similarity-slope-mixed-review-core",
        reviewTestId: "course3-unit2-dilations-similarity-slope-mixed-review-review",
      },
      {
        conceptId: "concept-rational-irrational-numbers",
        standards: ["8.NS.1"],
        tutorialHeading: "# Rational and Irrational Numbers",
        coreTestId: "course3-rational-irrational-numbers-core",
        reviewTestId: "course3-rational-irrational-numbers-review",
      },
      {
        conceptId: "concept-repeating-decimals-fractions",
        standards: ["8.NS.1"],
        tutorialHeading: "# Repeating Decimals as Fractions",
        coreTestId: "course3-repeating-decimals-fractions-core",
        reviewTestId: "course3-repeating-decimals-fractions-review",
      },
      {
        conceptId: "concept-square-roots-perfect-squares",
        standards: ["8.EE.2"],
        tutorialHeading: "# Square Roots and Perfect Squares",
        coreTestId: "course3-square-roots-perfect-squares-core",
        reviewTestId: "course3-square-roots-perfect-squares-review",
      },
      {
        conceptId: "concept-cube-roots-perfect-cubes",
        standards: ["8.EE.2"],
        tutorialHeading: "# Cube Roots and Perfect Cubes",
        coreTestId: "course3-cube-roots-perfect-cubes-core",
        reviewTestId: "course3-cube-roots-perfect-cubes-review",
      },
      {
        conceptId: "concept-approximate-irrational-numbers",
        standards: ["8.NS.2"],
        tutorialHeading: "# Approximate Irrational Numbers",
        coreTestId: "course3-approximate-irrational-numbers-core",
        reviewTestId: "course3-approximate-irrational-numbers-review",
      },
      {
        conceptId: "concept-compare-order-real-numbers",
        standards: ["8.NS.2"],
        tutorialHeading: "# Compare and Order Real Numbers",
        coreTestId: "course3-compare-order-real-numbers-core",
        reviewTestId: "course3-compare-order-real-numbers-review",
      },
      {
        conceptId: "concept-integer-exponents",
        standards: ["8.EE.1"],
        tutorialHeading: "# Integer Exponents",
        coreTestId: "course3-integer-exponents-core",
        reviewTestId: "course3-integer-exponents-review",
      },
      {
        conceptId: "concept-zero-negative-exponents",
        standards: ["8.EE.1"],
        tutorialHeading: "# Zero and Negative Exponents",
        coreTestId: "course3-zero-negative-exponents-core",
        reviewTestId: "course3-zero-negative-exponents-review",
      },
      {
        conceptId: "concept-powers-of-ten",
        standards: ["8.EE.3"],
        tutorialHeading: "# Powers of Ten",
        coreTestId: "course3-powers-of-ten-core",
        reviewTestId: "course3-powers-of-ten-review",
      },
      {
        conceptId: "concept-scientific-notation",
        standards: ["8.EE.3"],
        tutorialHeading: "# Scientific Notation",
        coreTestId: "course3-scientific-notation-core",
        reviewTestId: "course3-scientific-notation-review",
      },
      {
        conceptId: "concept-operations-with-scientific-notation",
        standards: ["8.EE.4"],
        tutorialHeading: "# Operations with Scientific Notation",
        coreTestId: "course3-operations-with-scientific-notation-core",
        reviewTestId: "course3-operations-with-scientific-notation-review",
      },
      {
        conceptId: "concept-unit-1-mixed-review",
        standards: ["8.NS.1", "8.NS.2", "8.EE.1", "8.EE.2", "8.EE.3", "8.EE.4"],
        tutorialHeading: "# Unit 1 Mixed Review",
        coreTestId: "course3-unit-1-mixed-review-core",
        reviewTestId: "course3-unit-1-mixed-review-review",
      },
      {
        conceptId: "concept-review-equivalent-expressions",
        standards: ["8.EE.7"],
        tutorialHeading: "# Review Equivalent Expressions",
        coreTestId: "course3-review-equivalent-expressions-core",
        reviewTestId: "course3-review-equivalent-expressions-review",
      },
      {
        conceptId: "concept-solve-multi-step-equations",
        standards: ["8.EE.7"],
        tutorialHeading: "# Solve Multi-Step Equations",
        coreTestId: "course3-solve-multi-step-equations-core",
        reviewTestId: "course3-solve-multi-step-equations-review",
      },
      {
        conceptId: "concept-equations-distributive-property",
        standards: ["8.EE.7"],
        tutorialHeading: "# Equations with the Distributive Property",
        coreTestId: "course3-equations-distributive-property-core",
        reviewTestId: "course3-equations-distributive-property-review",
      },
      {
        conceptId: "concept-equations-variables-both-sides",
        standards: ["8.EE.7"],
        tutorialHeading: "# Equations with Variables on Both Sides",
        coreTestId: "course3-equations-variables-both-sides-core",
        reviewTestId: "course3-equations-variables-both-sides-review",
      },
      {
        conceptId: "concept-equations-rational-coefficients",
        standards: ["8.EE.7"],
        tutorialHeading: "# Equations with Rational Coefficients",
        coreTestId: "course3-equations-rational-coefficients-core",
        reviewTestId: "course3-equations-rational-coefficients-review",
      },
      {
        conceptId: "concept-equations-solution-types",
        standards: ["8.EE.7"],
        tutorialHeading: "# One Solution, No Solution, or Infinitely Many Solutions",
        coreTestId: "course3-equations-solution-types-core",
        reviewTestId: "course3-equations-solution-types-review",
      },
      {
        conceptId: "concept-build-equations-from-context",
        standards: ["8.EE.7"],
        tutorialHeading: "# Build Equations from Context",
        coreTestId: "course3-build-equations-from-context-core",
        reviewTestId: "course3-build-equations-from-context-review",
      },
      {
        conceptId: "concept-linear-equation-word-problems",
        standards: ["8.EE.7"],
        tutorialHeading: "# Linear Equation Word Problems",
        coreTestId: "course3-linear-equation-word-problems-core",
        reviewTestId: "course3-linear-equation-word-problems-review",
      },
      {
        conceptId: "concept-check-explain-equation-solutions",
        standards: ["8.EE.7"],
        tutorialHeading: "# Check and Explain Equation Solutions",
        coreTestId: "course3-check-explain-equation-solutions-core",
        reviewTestId: "course3-check-explain-equation-solutions-review",
      },
      {
        conceptId: "concept-unit-2-mixed-review",
        standards: ["8.EE.7"],
        tutorialHeading: "# Unit 2 Mixed Review",
        coreTestId: "course3-unit-2-mixed-review-core",
        reviewTestId: "course3-unit-2-mixed-review-review",
      },
      {
        conceptId: "concept-proportional-relationships-as-lines",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Proportional Relationships as Lines",
        coreTestId: "course3-proportional-relationships-as-lines-core",
        reviewTestId: "course3-proportional-relationships-as-lines-review",
      },
      {
        conceptId: "concept-find-slope-tables-points",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Find Slope from Tables and Points",
        coreTestId: "course3-find-slope-tables-points-core",
        reviewTestId: "course3-find-slope-tables-points-review",
      },
      {
        conceptId: "concept-compare-rates-of-change",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Compare Rates of Change",
        coreTestId: "course3-compare-rates-of-change-core",
        reviewTestId: "course3-compare-rates-of-change-review",
      },
      {
        conceptId: "concept-equations-y-equals-mx",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Equations in the Form y = mx",
        coreTestId: "course3-equations-y-equals-mx-core",
        reviewTestId: "course3-equations-y-equals-mx-review",
      },
      {
        conceptId: "concept-understand-y-intercept",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Understand the y-Intercept",
        coreTestId: "course3-understand-y-intercept-core",
        reviewTestId: "course3-understand-y-intercept-review",
      },
      {
        conceptId: "concept-equations-y-equals-mx-plus-b",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Equations in the Form y = mx + b",
        coreTestId: "course3-equations-y-equals-mx-plus-b-core",
        reviewTestId: "course3-equations-y-equals-mx-plus-b-review",
      },
      {
        conceptId: "concept-graph-linear-equations",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Graph Linear Equations",
        coreTestId: "course3-graph-linear-equations-core",
        reviewTestId: "course3-graph-linear-equations-review",
      },
      {
        conceptId: "concept-write-linear-equations-representations",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Write Linear Equations from Representations",
        coreTestId: "course3-write-linear-equations-representations-core",
        reviewTestId: "course3-write-linear-equations-representations-review",
      },
      {
        conceptId: "concept-unit-3-mixed-review",
        standards: ["8.EE.5", "8.EE.6"],
        tutorialHeading: "# Unit 3 Mixed Review",
        coreTestId: "course3-unit-3-mixed-review-core",
        reviewTestId: "course3-unit-3-mixed-review-review",
      },
      {
        conceptId: "concept-understand-solutions-systems",
        standards: ["8.EE.8"],
        tutorialHeading: "# Understand Solutions to Systems",
        coreTestId: "course3-understand-solutions-systems-core",
        reviewTestId: "course3-understand-solutions-systems-review",
      },
      {
        conceptId: "concept-solve-systems-graphing",
        standards: ["8.EE.8"],
        tutorialHeading: "# Solve Systems by Graphing",
        coreTestId: "course3-solve-systems-graphing-core",
        reviewTestId: "course3-solve-systems-graphing-review",
      },
      {
        conceptId: "concept-solve-systems-substitution",
        standards: ["8.EE.8"],
        tutorialHeading: "# Solve Systems by Substitution",
        coreTestId: "course3-solve-systems-substitution-core",
        reviewTestId: "course3-solve-systems-substitution-review",
      },
      {
        conceptId: "concept-solve-systems-elimination",
        standards: ["8.EE.8"],
        tutorialHeading: "# Solve Systems by Elimination",
        coreTestId: "course3-solve-systems-elimination-core",
        reviewTestId: "course3-solve-systems-elimination-review",
      },
      {
        conceptId: "concept-systems-no-solution",
        standards: ["8.EE.8"],
        tutorialHeading: "# Systems with No Solution",
        coreTestId: "course3-systems-no-solution-core",
        reviewTestId: "course3-systems-no-solution-review",
      },
    ];

    expect(course?.subjectId).toBe("math");
    expect(course?.courseTitle).toBe("Course 3");
    expect(course?.instructionalGrades).toEqual(["8"]);
    expect(course?.programPathways).toEqual(["accelerated"]);
    expect(course?.standardsFrameworks).toEqual(["CA-CCSSM"]);
    expect(course?.units[0]?.id).toBe("course3-unit-rigid-transformations-congruence");
    expect(course?.units[0]?.concepts).toHaveLength(10);
    expect(course?.units[1]?.id).toBe("course3-unit-dilations-similarity-slope");
    expect(course?.units[1]?.concepts).toHaveLength(9);
    expect(course?.units[2]?.id).toBe("course3-unit-lines-slope-linear-equations");
    expect(course?.units[2]?.title).toBe("Proportional and Linear Relationships");
    expect(course?.units[2]?.concepts).toHaveLength(9);
    expect(course?.units[2]?.concepts.map((concept) => concept.id)).toEqual([
      "concept-proportional-relationships-as-lines",
      "concept-equations-y-equals-mx",
      "concept-understand-y-intercept",
      "concept-equations-y-equals-mx-plus-b",
      "concept-find-slope-tables-points",
      "concept-compare-rates-of-change",
      "concept-graph-linear-equations",
      "concept-write-linear-equations-representations",
      "concept-unit-3-mixed-review",
    ]);
    expect(course?.units[3]?.id).toBe("course3-unit-linear-equations");
    expect(course?.units[3]?.concepts).toHaveLength(10);
    expect(course?.units[4]?.id).toBe("course3-unit-systems-linear-equations");
    expect(course?.units[4]?.concepts).toHaveLength(5);
    expect(course?.units[5]?.id).toBe("course3-unit-real-numbers-exponents");
    expect(course?.units[5]?.concepts).toHaveLength(12);

    for (const pack of conceptPacks) {
      const concept = await repository.getConcept(pack.conceptId);
      const tutorial = await repository.getTutorialContent(pack.conceptId);
      const testSets = await repository.getTestSetsForConcept(pack.conceptId);
      const coreQuestions = await repository.getQuestionsForTestSet(pack.coreTestId);
      const reviewQuestions = await repository.getQuestionsForTestSet(pack.reviewTestId);

      expect(concept?.hasTest).toBe(true);
      expect(concept?.standardsFrameworks).toEqual(pack.standards);
      expect(tutorial).toContain(pack.tutorialHeading);
      expect(testSets.map((testSet) => testSet.id)).toEqual([
        pack.coreTestId,
        pack.reviewTestId,
      ]);
      expect(coreQuestions).toHaveLength(50);
      expect(
        coreQuestions.filter((question) => question.difficulty === "scaffold"),
      ).toHaveLength(10);
      expect(
        coreQuestions.filter((question) => question.difficulty === "standard"),
      ).toHaveLength(25);
      expect(
        coreQuestions.filter((question) => question.difficulty === "challenge"),
      ).toHaveLength(15);
      expect(reviewQuestions).toHaveLength(20);
      expect(
        reviewQuestions.filter((question) => question.difficulty === "scaffold"),
      ).toHaveLength(8);
      expect(
        reviewQuestions.filter((question) => question.difficulty === "standard"),
      ).toHaveLength(12);

      for (const question of [...coreQuestions, ...reviewQuestions]) {
        expect(question.questionType).toBe("multiple_choice");
        expect(question.choices).toHaveLength(4);
        expect(
          question.choices?.some((choice) => /^Not \d+$/.test(choice.label)),
          `${question.id} includes a placeholder distractor`,
        ).toBe(false);
        expect(question.choices?.map((choice) => choice.value)).toContain(
          question.correctAnswer,
        );
      }
    }
  });

  it("keeps Course 3 multiple-choice correct answers balanced across answer positions", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const concepts = course?.units.flatMap((unit) => unit.concepts) ?? [];

    for (const concept of concepts) {
      const testSets = await repository.getTestSetsForConcept(concept.id);

      for (const testSet of testSets) {
        const questions = await repository.getQuestionsForTestSet(testSet.id);
        const counts = [0, 0, 0, 0];

        for (const question of questions) {
          if (question.questionType !== "multiple_choice") {
            continue;
          }

          const correctIndex =
            question.choices?.findIndex((choice) => choice.value === question.correctAnswer) ?? -1;
          expect(correctIndex).toBeGreaterThanOrEqual(0);
          counts[correctIndex] += 1;
        }

        const total = counts.reduce((sum, count) => sum + count, 0);
        if (total === 50) {
          expect(Math.max(...counts)).toBeLessThanOrEqual(13);
          expect(Math.min(...counts)).toBeGreaterThanOrEqual(12);
        } else if (total === 20) {
          expect(counts).toEqual([5, 5, 5, 5]);
        }
      }
    }
  });

  it("keeps Course 3 multiple-choice answer positions unpredictable within each test set", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const concepts = course?.units.flatMap((unit) => unit.concepts) ?? [];

    for (const concept of concepts) {
      const testSets = await repository.getTestSetsForConcept(concept.id);

      for (const testSet of testSets) {
        const questions = await repository.getQuestionsForTestSet(testSet.id);
        const answerIndexes = questions
          .filter((question) => question.questionType === "multiple_choice")
          .map(getCorrectAnswerIndex);

        expect(answerIndexes, `${testSet.id} has invalid correct-answer options`).not.toContain(-1);
        expect(
          getLongestSequentialAnswerCycle(answerIndexes),
          `${testSet.id} has a predictable answer-position mini-cycle`,
        ).toBeLessThanOrEqual(2);
        expect(
          getLongestSameAnswerRun(answerIndexes),
          `${testSet.id} repeats the same answer position too many times in a row`,
        ).toBeLessThanOrEqual(2);

        for (let start = 0; start <= answerIndexes.length - 8; start += 1) {
          const windowCounts = [0, 0, 0, 0];

          for (const answerIndex of answerIndexes.slice(start, start + 8)) {
            windowCounts[answerIndex] += 1;
          }

          expect(
            Math.max(...windowCounts),
            `${testSet.id} overuses one answer position in questions ${start + 1}-${start + 8}`,
          ).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("keeps Course 3 visible correct-answer labels from forming predictable cycles", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const concepts = course?.units.flatMap((unit) => unit.concepts) ?? [];

    for (const concept of concepts) {
      const testSets = await repository.getTestSetsForConcept(concept.id);

      for (const testSet of testSets) {
        const questions = await repository.getQuestionsForTestSet(testSet.id);
        const visibleLabels = questions
          .filter((question) => question.questionType === "multiple_choice")
          .map(getVisibleCorrectAnswerLabel)
          .filter((label): label is string => label !== null);

        if (visibleLabels.length < 6) {
          continue;
        }

        expect(
          getLongestRepeatedCycle(visibleLabels),
          `${testSet.id} has a predictable visible correct-answer label cycle`,
        ).toBe(0);
      }
    }
  });

  it("blocks new Course 3 banks with overly repetitive question templates", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const concepts = course?.units.flatMap((unit) => unit.concepts) ?? [];

    for (const concept of concepts) {
      const testSets = await repository.getTestSetsForConcept(concept.id);

      for (const testSet of testSets) {
        if (COURSE3_TEMPLATE_VARIETY_DEBT_TEST_SET_IDS.has(testSet.id)) {
          continue;
        }

        const questions = await repository.getQuestionsForTestSet(testSet.id);
        const { uniqueTemplateCount, largestTemplateCount } = getTemplateStats(questions);
        const requiredTemplateCount = questions.length >= 50 ? 8 : 5;
        const maxTemplateShare = questions.length >= 50 ? 0.35 : 0.45;

        expect(
          uniqueTemplateCount,
          `${testSet.id} needs more question-form variety`,
        ).toBeGreaterThanOrEqual(requiredTemplateCount);
        expect(
          largestTemplateCount / questions.length,
          `${testSet.id} repeats one question form too often`,
        ).toBeLessThanOrEqual(maxTemplateShare);

        const challengeQuestions = questions.filter(
          (question) => question.difficulty === "challenge",
        );

        if (challengeQuestions.length > 0) {
          expect(
            getTemplateStats(challengeQuestions).uniqueTemplateCount,
            `${testSet.id} challenge questions need varied reasoning forms`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("keeps Course 3 question difficulty from regressing within a test set", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const concepts = course?.units.flatMap((unit) => unit.concepts) ?? [];

    for (const concept of concepts) {
      const testSets = await repository.getTestSetsForConcept(concept.id);

      for (const testSet of testSets) {
        const questions = await repository.getQuestionsForTestSet(testSet.id);
        const difficultyRanks = questions.map(getDifficultyRank);

        for (let index = 1; index < difficultyRanks.length; index += 1) {
          expect(
            difficultyRanks[index],
            `${testSet.id} lowers difficulty from question ${index} to question ${index + 1}`,
          ).toBeGreaterThanOrEqual(difficultyRanks[index - 1] ?? 0);
        }
      }
    }
  });

  it("keeps active Course 3 tutorials concept-specific instead of near-duplicates", async () => {
    const repository = await createDefaultContentRepository();
    const course = await repository.getCourse("course-3");
    const concepts = course?.units.flatMap((unit) => unit.concepts) ?? [];
    const tutorials = await Promise.all(
      concepts.map(async (concept) => ({
        conceptId: concept.id,
        title: concept.title,
        content: await repository.getTutorialContent(concept.id),
      })),
    );

    for (const tutorial of tutorials) {
      expect(tutorial.content, `${tutorial.conceptId} is missing tutorial content`).toBeTruthy();
      expect(
        normalizeTutorialForSimilarity(tutorial.content ?? "").split(" ").length,
        `${tutorial.conceptId} tutorial is too short to be learner-ready`,
      ).toBeGreaterThanOrEqual(80);
    }

    const tutorialShingles = tutorials.map((tutorial) => ({
      ...tutorial,
      shingles: getTutorialShingles(tutorial.content ?? ""),
    }));

    for (let firstIndex = 0; firstIndex < tutorialShingles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < tutorialShingles.length; secondIndex += 1) {
        const first = tutorialShingles[firstIndex];
        const second = tutorialShingles[secondIndex];
        const similarity = getJaccardSimilarity(first.shingles, second.shingles);

        expect(
          similarity,
          `${first.conceptId} and ${second.conceptId} tutorials are too similar`,
        ).toBeLessThan(0.85);
      }
    }
  });

  it("fails fast when duplicate global question ids are present", () => {
    const manifest: CourseManifestDocument = {
      courses: [
        {
          id: "course-2",
          subjectId: "math",
          subjectTitle: "Mathematics",
          courseId: "course2",
          courseTitle: "Course 2",
          instructionalGrades: ["7"],
          programPathways: ["accelerated"],
          standardsFrameworks: ["CA-CCSS"],
          title: "Course 2",
          description: "desc",
          order: 1,
          units: [
            {
              id: "u1",
              courseId: "course-2",
              title: "Unit",
              description: "desc",
              order: 1,
              concepts: [
                {
                  id: "c1",
                  courseId: "course-2",
                  unitId: "u1",
                  title: "Concept 1",
                  description: "desc",
                  tags: [],
                  instructionalGrades: ["7"],
                  programPathways: ["accelerated"],
                  standardsFrameworks: ["CA-CCSS"],
                  order: 1,
                  masteryStatus: "not_started",
                  hasTest: false,
                },
                {
                  id: "c2",
                  courseId: "course-2",
                  unitId: "u1",
                  title: "Concept 2",
                  description: "desc",
                  tags: [],
                  instructionalGrades: ["8"],
                  programPathways: ["traditional"],
                  standardsFrameworks: ["AP"],
                  order: 2,
                  masteryStatus: "not_started",
                  hasTest: false,
                },
              ],
            },
          ],
        },
      ],
    };
    const bank: QuestionBankDocument = {
      id: "test-set-1",
      conceptId: "c1",
      title: "Core Practice",
      description: "desc",
      questions: [
        {
          id: "duplicate-id",
          courseId: "course-2",
          unitId: "u1",
          conceptId: "c1",
          tags: [],
          difficulty: "easy",
          questionType: "numeric",
          answerType: "number",
          prompt: "1+1",
          correctAnswer: "2",
          explanation: "desc",
          eligibleForMixed: true,
        },
      ],
    };

    expect(() =>
      buildContentIndex(
        manifest,
        [
          bank,
          {
            ...bank,
            id: "test-set-2",
            conceptId: "c2",
            questions: [{ ...bank.questions[0], conceptId: "c2" }],
          },
        ],
        {},
      ),
    ).toThrow("Duplicate question id detected");

    expect(manifest.courses[0]?.instructionalGrades).toEqual(["7"]);
    expect(manifest.courses[0]?.programPathways).toEqual(["accelerated"]);
    expect(manifest.courses[0]?.standardsFrameworks).toEqual(["CA-CCSS"]);
    expect(manifest.courses[0]?.units[0]?.concepts[0]?.instructionalGrades).toEqual(["7"]);
    expect(manifest.courses[0]?.units[0]?.concepts[0]?.standardsFrameworks).toEqual(["CA-CCSS"]);
  });

  it("skips invalid manifest concepts safely during validation", () => {
    const validation = validateManifest(
      {
        courses: [
          {
            id: "course-2",
            subjectId: "math",
            subjectTitle: "Mathematics",
            courseId: "course2",
            courseTitle: "Course 2",
            title: "Course 2",
            description: "desc",
            order: 1,
            units: [
              {
                id: "unit-1",
                courseId: "course-2",
                title: "Unit 1",
                description: "desc",
                order: 1,
                concepts: [
                  {
                    id: "concept-ratios",
                    courseId: "course-2",
                    unitId: "unit-1",
                    title: "Ratios",
                    description: "desc",
                    tags: [],
                    order: 1,
                    masteryStatus: "not_started",
                    hasTest: false,
                  },
                  {
                    id: "",
                    courseId: "course-2",
                    unitId: "unit-1",
                    title: "Broken",
                    description: "desc",
                    tags: [],
                    order: 2,
                    masteryStatus: "not_started",
                    hasTest: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {},
      [],
    );

    expect(validation.manifest.courses[0]?.units[0]?.concepts.map((concept) => concept.id)).toEqual([
      "concept-ratios",
    ]);
    expect(validation.skippedConcepts).toBe(1);
  });

  it("requires multiple-choice correct answers to match one of the option values", () => {
    expect(
      hasMatchingMultipleChoiceCorrectAnswer({
        questionType: "multiple_choice",
        correctAnswer: "Store B",
        choices: [
          { id: "a", label: "A", value: "Store A" },
          { id: "b", label: "B", value: "Store B" },
        ],
      }),
    ).toBe(true);

    expect(
      hasMatchingMultipleChoiceCorrectAnswer({
        questionType: "multiple_choice",
        correctAnswer: "Store C",
        choices: [
          { id: "a", label: "A", value: "Store A" },
          { id: "b", label: "B", value: "Store B" },
        ],
      }),
    ).toBe(false);
  });

  it("requires multiple-choice questions to have at least two unique non-empty option values", () => {
    expect(
      hasValidMultipleChoiceChoices({
        questionType: "multiple_choice",
        choices: [
          { id: "a", label: "A", value: "Store A" },
          { id: "b", label: "B", value: "Store B" },
        ],
      }),
    ).toBe(true);

    expect(
      hasValidMultipleChoiceChoices({
        questionType: "multiple_choice",
        choices: [{ id: "a", label: "A", value: "Store A" }],
      }),
    ).toBe(false);

    expect(
      hasValidMultipleChoiceChoices({
        questionType: "multiple_choice",
        choices: [
          { id: "a", label: "A", value: "Store A" },
          { id: "b", label: "B", value: "Store A" },
        ],
      }),
    ).toBe(false);

    expect(
      hasValidMultipleChoiceChoices({
        questionType: "multiple_choice",
        choices: [
          { id: "a", label: "A", value: " " },
          { id: "b", label: "B", value: "Store B" },
        ],
      }),
    ).toBe(false);
  });

  it("requires multiple-choice scoring to accept only the authored correct option", () => {
    expect(
      hasConsistentMultipleChoiceScoring({
        questionType: "multiple_choice",
        answerType: "decimal",
        correctAnswer: "Store B",
        choices: [
          { id: "a", label: "A", value: "Store A" },
          { id: "b", label: "B", value: "Store B" },
        ],
      }),
    ).toBe(true);

    expect(
      hasConsistentMultipleChoiceScoring({
        questionType: "multiple_choice",
        answerType: "decimal",
        correctAnswer: "0.5",
        choices: [
          { id: "a", label: "A", value: "0.5" },
          { id: "b", label: "B", value: "0.50" },
        ],
      }),
    ).toBe(true);
  });

  it("verifies all authored multiple-choice correct answers score correctly", async () => {
    const repository = await createDefaultContentRepository();
    const courses = await repository.listCourses();
    const concepts = courses.flatMap((course) => course.units.flatMap((unit) => unit.concepts));

    for (const concept of concepts) {
      const questions = await repository.getQuestionsForConcept(concept.id);
      const multipleChoiceQuestions = questions.filter((question) => question.questionType === "multiple_choice");

      for (const question of multipleChoiceQuestions) {
        expect(
          hasConsistentMultipleChoiceScoring({
            questionType: question.questionType,
            answerType: question.answerType,
            correctAnswer: question.correctAnswer,
            choices: question.choices,
          }),
        ).toBe(true);
      }
    }
  });
});

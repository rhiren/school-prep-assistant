import { describe, expect, it } from "vitest";
import type { CourseManifestDocument, QuestionBankDocument } from "../domain/models";
import {
  buildContentIndex,
  hasConsistentMultipleChoiceScoring,
  createDefaultContentRepository,
  hasMatchingMultipleChoiceCorrectAnswer,
  hasValidMultipleChoiceChoices,
  validateManifest,
} from "../services/contentRepository";

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

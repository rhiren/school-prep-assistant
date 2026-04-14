import type {
  AnswerType,
  Concept,
  ContentIndex,
  Course,
  CourseManifestDocument,
  DifficultyLevel,
  Question,
  QuestionBankDocument,
  QuestionOption,
  QuestionType,
  TestSet,
  Unit,
} from "../domain/models";
import { normalizeConceptId } from "../utils/conceptIds";
import type { ContentRepository } from "./contracts";

const manifestModules = import.meta.glob("../../content/manifest/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const testSetModules = import.meta.glob("../../content/test-sets/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const tutorialModules = import.meta.glob("../../content/tutorials/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function logContentValidationError(message: string, details: Record<string, unknown>): void {
  console.error(`[content] ${message}`, details);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNumberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toQuestionType(value: unknown): QuestionType {
  return value === "multiple_choice" || value === "numeric" || value === "short_text"
    ? value
    : "multiple_choice";
}

function toDifficulty(value: unknown): DifficultyLevel {
  return value === "easy" || value === "medium" || value === "hard" || value === "challenge"
    ? value
    : "easy";
}

function toAnswerType(value: unknown): AnswerType {
  return value === "ratio" || value === "fraction" || value === "decimal" || value === "number"
    ? value
    : "number";
}

function toMasteryStatus(value: unknown): Concept["masteryStatus"] {
  return value === "not_started" ||
    value === "in_progress" ||
    value === "practiced" ||
    value === "needs_review" ||
    value === "mastered"
    ? value
    : "not_started";
}

function getTutorialConceptId(tutorialPath: string): string | null {
  const fileName = tutorialPath.split("/").pop();
  return fileName?.replace(".md", "") ?? null;
}

function buildChoiceLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function getDefaultTestTitle(type: string): string {
  if (type === "review") {
    return "Review Test";
  }

  if (type === "practice") {
    return "Practice Test";
  }

  return "Core Test";
}

function getDefaultTestDescription(type: string): string {
  if (type === "review") {
    return "Short review set for reinforcing core skills.";
  }

  if (type === "practice") {
    return "Practice set for additional concept fluency.";
  }

  return "Main concept test for building mastery.";
}

function normalizeManifestDocument(rawManifest: unknown): CourseManifestDocument {
  const manifestRecord = isRecord(rawManifest) ? rawManifest : {};
  const rawCourses = Array.isArray(manifestRecord.courses) ? manifestRecord.courses : [];

  return {
    courses: rawCourses
      .filter(isRecord)
      .map((course, courseIndex): Course => {
        const courseId = toStringValue(course.id, `course-${courseIndex + 1}`);
        const rawUnits = Array.isArray(course.units) ? course.units : [];

        return {
          id: courseId,
          title: toStringValue(course.title, `Course ${courseIndex + 1}`),
          description: toStringValue(course.description),
          order: toNumberValue(course.order, courseIndex + 1),
          units: rawUnits.filter(isRecord).map((unit, unitIndex): Unit => {
            const unitId = toStringValue(unit.id, `${courseId}-unit-${unitIndex + 1}`);
            const rawConcepts = Array.isArray(unit.concepts) ? unit.concepts : [];

            return {
              id: unitId,
              courseId,
              title: toStringValue(unit.title, `Unit ${unitIndex + 1}`),
              description: toStringValue(unit.description),
              order: toNumberValue(unit.order, unitIndex + 1),
              concepts: rawConcepts.filter(isRecord).map((concept, conceptIndex): Concept => ({
                id: toStringValue(concept.id, `${unitId}-concept-${conceptIndex + 1}`),
                courseId,
                unitId,
                title: toStringValue(concept.title, `Concept ${conceptIndex + 1}`),
                description: toStringValue(concept.description),
                tags: toStringArray(concept.tags),
                order: toNumberValue(concept.order, conceptIndex + 1),
                masteryStatus: toMasteryStatus(concept.masteryStatus),
                testQuestionCount:
                  typeof concept.testQuestionCount === "number"
                    ? concept.testQuestionCount
                    : undefined,
                hasTest: false,
              })),
            };
          }),
        };
      }),
  };
}

export function validateManifest(
  manifest: CourseManifestDocument,
  tutorialsByConceptId: Record<string, string>,
  questionBanks: Array<{ id?: string; testId?: string; path: string }>,
): { manifest: CourseManifestDocument; skippedConcepts: number } {
  const seenConceptIds = new Set<string>();
  const availableTestSetIds = new Set(
    questionBanks.flatMap((bank) =>
      [bank.id, bank.testId].filter((value): value is string => typeof value === "string"),
    ),
  );
  const availableTestPaths = new Set(questionBanks.map((bank) => bank.path));
  let skippedConcepts = 0;

  const courses = manifest.courses.flatMap((course, courseIndex) => {
    if (!course?.id) {
      logContentValidationError("Skipping course with missing id.", {
        courseIndex,
      });
      return [];
    }

    const units = course.units.flatMap((unit, unitIndex) => {
      if (!unit?.id) {
        logContentValidationError("Skipping unit with missing id.", {
          courseId: course.id,
          unitIndex,
        });
        return [];
      }

      const concepts = unit.concepts.flatMap((concept, conceptIndex) => {
        const conceptId =
          typeof concept?.id === "string" ? normalizeConceptId(concept.id) : null;

        if (!conceptId) {
          skippedConcepts += 1;
          logContentValidationError("Skipping concept with missing id.", {
            courseId: course.id,
            unitId: unit.id,
            conceptIndex,
          });
          return [];
        }

        if (seenConceptIds.has(conceptId)) {
          skippedConcepts += 1;
          logContentValidationError("Skipping duplicate concept id.", {
            courseId: course.id,
            unitId: unit.id,
            conceptId,
          });
          return [];
        }

        const conceptRecord = concept as unknown as Record<string, unknown>;
        const tutorialPath =
          typeof conceptRecord.tutorial === "string"
            ? conceptRecord.tutorial
            : conceptRecord.tutorialPath;
        const listedTests = Array.isArray(conceptRecord.tests) ? conceptRecord.tests : [];
        const testSetIds = conceptRecord.testSetIds;

        if (
          typeof tutorialPath === "string" &&
          !tutorialsByConceptId[getTutorialConceptId(tutorialPath) ?? ""]
        ) {
          skippedConcepts += 1;
          logContentValidationError("Skipping concept with missing tutorial path.", {
            courseId: course.id,
            unitId: unit.id,
            conceptId,
            tutorialPath,
          });
          return [];
        }

        if (Array.isArray(testSetIds)) {
          const missingTestSetIds = testSetIds.filter(
            (testSetId): testSetId is string =>
              typeof testSetId === "string" && !availableTestSetIds.has(testSetId),
          );

          if (missingTestSetIds.length > 0) {
            skippedConcepts += 1;
            logContentValidationError("Skipping concept with missing test set references.", {
              courseId: course.id,
              unitId: unit.id,
              conceptId,
              missingTestSetIds,
            });
            return [];
          }
        }

        if (listedTests.length > 0) {
          const missingTestPaths = listedTests
            .filter(isRecord)
            .map((test) => toStringValue(test.path))
            .filter((path) => path && !availableTestPaths.has(path));

          if (missingTestPaths.length > 0) {
            skippedConcepts += 1;
            logContentValidationError("Skipping concept with missing test file references.", {
              courseId: course.id,
              unitId: unit.id,
              conceptId,
              missingTestPaths,
            });
            return [];
          }

          const missingListedIds = listedTests
            .filter(isRecord)
            .map((test) => toStringValue(test.id))
            .filter((id) => id && !availableTestSetIds.has(id));

          if (missingListedIds.length > 0) {
            skippedConcepts += 1;
            logContentValidationError("Skipping concept with missing test ids.", {
              courseId: course.id,
              unitId: unit.id,
              conceptId,
              missingListedIds,
            });
            return [];
          }
        }

        seenConceptIds.add(conceptId);

        return [
          {
            ...concept,
            id: conceptId,
          },
        ];
      });

      return concepts.length > 0
        ? [
            {
              ...unit,
              concepts,
            },
          ]
        : [];
    });

    return units.length > 0
      ? [
          {
            ...course,
            units,
          },
        ]
      : [];
  });

  return {
    manifest: { courses },
    skippedConcepts,
  };
}

export function buildContentIndex(
  manifest: CourseManifestDocument,
  questionBanks: QuestionBankDocument[],
  tutorialsByConceptId: Record<string, string>,
): ContentIndex {
  const coursesById: Record<string, Course> = {};
  const conceptsById: Record<string, Concept> = {};
  const questionsById: Record<string, Question> = {};
  const conceptQuestionIds: Record<string, string[]> = {};
  const testSetsById: Record<string, TestSet> = {};
  const testSetsByConceptId: Record<string, TestSet[]> = {};
  const testSetQuestionIds: Record<string, string[]> = {};

  const courses = manifest.courses.map((course) => {
    const units = course.units.map((unit) => {
      const concepts = unit.concepts.map((concept) => {
        const conceptTestSets = questionBanks.filter((bank) => bank.conceptId === concept.id);
        const clonedConcept: Concept = {
          ...concept,
          courseId: course.id,
          unitId: unit.id,
          description: typeof concept.description === "string" ? concept.description : "",
          tags: Array.isArray(concept.tags) ? concept.tags : [],
          masteryStatus: toMasteryStatus(concept.masteryStatus),
          testQuestionCount:
            typeof concept.testQuestionCount === "number"
              ? concept.testQuestionCount
              : conceptTestSets[0]?.questions.length,
          hasTest: conceptTestSets.length > 0,
        };
        conceptsById[clonedConcept.id] = clonedConcept;
        conceptQuestionIds[clonedConcept.id] = [];
        testSetsByConceptId[clonedConcept.id] = [];
        return clonedConcept;
      });

      return {
        ...unit,
        courseId: course.id,
        description: typeof unit.description === "string" ? unit.description : "",
        concepts,
      };
    });

    const clonedCourse: Course = {
      ...course,
      units,
    };
    coursesById[clonedCourse.id] = clonedCourse;
    return clonedCourse;
  });

  for (const bank of questionBanks) {
    if (!conceptsById[bank.conceptId]) {
      throw new Error(`Question bank references unknown concept ${bank.conceptId}.`);
    }

    if (testSetsById[bank.id]) {
      throw new Error(`Duplicate test set id detected: ${bank.id}`);
    }

    const testSet: TestSet = {
      id: bank.id,
      conceptId: bank.conceptId,
      title: bank.title,
      description: bank.description,
      questionCount: bank.questions.length,
    };
    testSetsById[testSet.id] = testSet;
    testSetsByConceptId[bank.conceptId].push(testSet);
    testSetQuestionIds[testSet.id] = [];

    for (const question of bank.questions) {
      if (questionsById[question.id]) {
        throw new Error(`Duplicate question id detected: ${question.id}`);
      }

      questionsById[question.id] = question;
      conceptQuestionIds[bank.conceptId].push(question.id);
      testSetQuestionIds[testSet.id].push(question.id);
    }
  }

  for (const testSets of Object.values(testSetsByConceptId)) {
    testSets.sort(
      (left, right) =>
        left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
    );
  }

  return {
    courses,
    coursesById,
    conceptsById,
    questionsById,
    conceptQuestionIds,
    testSetsById,
    testSetsByConceptId,
    testSetQuestionIds,
    tutorialsByConceptId,
  };
}

export class StaticContentRepository implements ContentRepository {
  private readonly index: ContentIndex;

  constructor(
    manifest: CourseManifestDocument,
    questionBanks: QuestionBankDocument[],
    tutorialsByConceptId: Record<string, string>,
  ) {
    this.index = buildContentIndex(manifest, questionBanks, tutorialsByConceptId);
  }

  async listCourses(): Promise<Course[]> {
    return this.index.courses;
  }

  async getCourse(courseId: string): Promise<Course | null> {
    return this.index.coursesById[courseId] ?? null;
  }

  async getConcept(conceptId: string): Promise<Concept | null> {
    return this.index.conceptsById[normalizeConceptId(conceptId) ?? conceptId] ?? null;
  }

  async getQuestionsForConcept(conceptId: string): Promise<Question[]> {
    const testSets = await this.getTestSetsForConcept(conceptId);
    const firstTestSet = testSets[0];
    if (!firstTestSet) {
      return [];
    }

    return this.getQuestionsForTestSet(firstTestSet.id);
  }

  async getQuestionById(questionId: string): Promise<Question | null> {
    return this.getQuestionByIdSync(questionId);
  }

  getQuestionByIdSync(questionId: string): Question | null {
    return this.index.questionsById[questionId] ?? null;
  }

  async getCourseConcepts(courseId: string): Promise<Concept[]> {
    const course = await this.getCourse(courseId);
    if (!course) {
      return [];
    }

    return course.units.flatMap((unit) => unit.concepts);
  }

  async getTutorialContent(conceptId: string): Promise<string | null> {
    const normalizedConceptId = normalizeConceptId(conceptId) ?? conceptId;
    return this.index.tutorialsByConceptId[normalizedConceptId] ?? null;
  }

  async getTestSetsForConcept(conceptId: string): Promise<TestSet[]> {
    const normalizedConceptId = normalizeConceptId(conceptId) ?? conceptId;
    return this.index.testSetsByConceptId[normalizedConceptId] ?? [];
  }

  async getTestSet(testSetId: string): Promise<TestSet | null> {
    return this.index.testSetsById[testSetId] ?? null;
  }

  async getQuestionsForTestSet(testSetId: string): Promise<Question[]> {
    return (this.index.testSetQuestionIds[testSetId] ?? []).map(
      (questionId) => this.index.questionsById[questionId],
    );
  }
}

export function createDefaultContentRepository(): StaticContentRepository {
  const manifests = Object.entries(manifestModules)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .map(([, manifest]) => manifest);

  if (manifests.length === 0) {
    throw new Error("No course manifest found in /content/manifest.");
  }

  const tutorialsByConceptId = Object.fromEntries(
    Object.entries(tutorialModules)
      .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
      .map(([path, content]) => {
      const conceptId = path.split("/").pop()?.replace(".md", "");
      if (!conceptId) {
        throw new Error(`Cannot derive tutorial concept id from path ${path}`);
      }

      return [conceptId, content];
      }),
  );

  const validationResult = validateManifest(
    normalizeManifestDocument({
      courses: manifests.flatMap((entry) => normalizeManifestDocument(entry).courses),
    }),
    tutorialsByConceptId,
    Object.entries(testSetModules).map(([path, testSet]) => ({
      path: `/content/test-sets/${path.split("/").pop()}`,
      ...(isRecord(testSet) ? testSet : {}),
    })),
  );
  const manifest = validationResult.manifest;

  const validConceptIds = new Set(
    manifest.courses.flatMap((course) =>
      course.units.flatMap((unit) => unit.concepts.map((concept) => concept.id)),
    ),
  );

  const manifestDrivenTutorials = Object.fromEntries(
    Object.entries(tutorialsByConceptId).filter(([conceptId]) => validConceptIds.has(conceptId)),
  );

  const seenTestSetIds = new Set<string>();
  const seenQuestionIds = new Set<string>();
  let skippedTestSets = 0;
  const conceptMetaById = Object.fromEntries(
    manifest.courses.flatMap((course) =>
      course.units.flatMap((unit) =>
        unit.concepts.map((concept) => [
          concept.id,
          {
            courseId: course.id,
            unitId: unit.id,
          },
        ]),
      ),
    ),
  );
  const manifestDrivenTestSets = Object.entries(testSetModules)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .flatMap(([path, rawDocument]) => {
      const document = isRecord(rawDocument) ? rawDocument : {};
      const normalizedConceptId = normalizeConceptId(toStringValue(document.conceptId));
      if (!normalizedConceptId || !validConceptIds.has(normalizedConceptId)) {
        skippedTestSets += 1;
        logContentValidationError("Skipping test set for unknown concept.", {
          path,
          testSetId: toStringValue(document.id) || toStringValue(document.testId),
          conceptId: toStringValue(document.conceptId),
        });
        return [];
      }

      const testSetId = toStringValue(document.testId) || toStringValue(document.id);
      if (!testSetId) {
        skippedTestSets += 1;
        logContentValidationError("Skipping test set with missing id.", {
          path,
          conceptId: normalizedConceptId,
        });
        return [];
      }

      if (seenTestSetIds.has(testSetId)) {
        skippedTestSets += 1;
        logContentValidationError("Skipping duplicate test set id.", {
          path,
          testSetId,
        });
        return [];
      }

      const rawQuestions = Array.isArray(document.questions) ? document.questions : [];
      const location = conceptMetaById[normalizedConceptId];
      const normalizedQuestions: Question[] = [];
      const rawOptionsToChoices = (options: string[]): QuestionOption[] =>
        options.map((option, index) => ({
          id: buildChoiceLabel(index).toLowerCase(),
          label: buildChoiceLabel(index),
          value: option,
        }));

      for (const rawQuestion of rawQuestions) {
        if (!isRecord(rawQuestion)) {
          skippedTestSets += 1;
          logContentValidationError("Skipping test set with invalid question entry.", {
            path,
            testSetId,
          });
          return [];
        }

        const questionId = toStringValue(rawQuestion.id);
        if (!questionId) {
          skippedTestSets += 1;
          logContentValidationError("Skipping test set with missing question id.", {
            path,
            testSetId,
          });
          return [];
        }

        if (seenQuestionIds.has(questionId)) {
          skippedTestSets += 1;
          logContentValidationError("Skipping test set with duplicate question id.", {
            path,
            testSetId,
            questionId,
          });
          return [];
        }

        const optionValues = Array.isArray(rawQuestion.options)
          ? rawQuestion.options.filter((option): option is string => typeof option === "string")
          : [];
        normalizedQuestions.push({
          id: questionId,
          courseId: location.courseId,
          unitId: location.unitId,
          conceptId: normalizedConceptId,
          tags: toStringArray(rawQuestion.tags),
          difficulty: toDifficulty(rawQuestion.difficulty),
          questionType: toQuestionType(rawQuestion.type ?? rawQuestion.questionType),
          answerType: toAnswerType(rawQuestion.answerType),
          prompt: toStringValue(rawQuestion.questionText || rawQuestion.prompt),
          choices: optionValues.length > 0 ? rawOptionsToChoices(optionValues) : undefined,
          correctAnswer: toStringValue(rawQuestion.correctAnswer),
          explanation: toStringValue(rawQuestion.explanation),
          hint: toStringValue(rawQuestion.hint) || undefined,
          eligibleForMixed:
            typeof rawQuestion.eligibleForMixed === "boolean"
              ? rawQuestion.eligibleForMixed
              : true,
        });
      }

      for (const question of normalizedQuestions) {
        if (seenQuestionIds.has(question.id)) {
          skippedTestSets += 1;
          logContentValidationError("Skipping test set with duplicate question id.", {
            path,
            testSetId,
            questionId: question.id,
          });
          return [];
        }
      }

      seenTestSetIds.add(testSetId);
      normalizedQuestions.forEach((question) => seenQuestionIds.add(question.id));

      return [
        {
          id: testSetId,
          conceptId: normalizedConceptId,
          title:
            toStringValue(document.title) ||
            getDefaultTestTitle(toStringValue(document.type, "concept")),
          description:
            toStringValue(document.description) ||
            getDefaultTestDescription(toStringValue(document.type, "concept")),
          questions: normalizedQuestions,
        },
      ];
    });

  if (import.meta.env.MODE !== "test") {
    const conceptCount = manifest.courses.flatMap((course) =>
      course.units.flatMap((unit) => unit.concepts),
    ).length;
    const skippedCount = validationResult.skippedConcepts + skippedTestSets;
    console.info(
      `Loaded ${conceptCount} concepts, ${manifestDrivenTestSets.length} test sets, skipped ${skippedCount} invalid entr${skippedCount === 1 ? "y" : "ies"}`,
    );
  }

  return new StaticContentRepository(
    manifest,
    manifestDrivenTestSets,
    manifestDrivenTutorials,
  );
}

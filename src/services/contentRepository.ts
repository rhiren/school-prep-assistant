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
import { compareQuestionAnswer } from "../utils/answerNormalization";

const bundledManifestModules = import.meta.glob("../../public/content/**/manifest/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const bundledTestSetModules = import.meta.glob("../../public/content/**/test-sets/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const bundledTutorialModules = import.meta.glob("../../public/content/**/tutorials/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function logContentValidationError(message: string, details: Record<string, unknown>): void {
  console.error(`[content] ${message}`, details);
}

export function hasMatchingMultipleChoiceCorrectAnswer(
  question: Pick<Question, "questionType" | "choices" | "correctAnswer">,
): boolean {
  if (question.questionType !== "multiple_choice") {
    return true;
  }

  const correctAnswer = question.correctAnswer.trim();
  const choiceValues = question.choices?.map((choice) => choice.value.trim()) ?? [];
  return correctAnswer !== "" && choiceValues.includes(correctAnswer);
}

export function hasValidMultipleChoiceChoices(
  question: Pick<Question, "questionType" | "choices">,
): boolean {
  if (question.questionType !== "multiple_choice") {
    return true;
  }

  const normalizedChoiceValues =
    question.choices?.map((choice) => choice.value.trim()).filter((value) => value !== "") ?? [];

  if (normalizedChoiceValues.length < 2) {
    return false;
  }

  return new Set(normalizedChoiceValues).size === normalizedChoiceValues.length;
}

export function hasConsistentMultipleChoiceScoring(
  question: Pick<Question, "questionType" | "answerType" | "correctAnswer" | "choices">,
): boolean {
  if (question.questionType !== "multiple_choice") {
    return true;
  }

  const normalizedCorrectAnswer = question.correctAnswer.trim();
  if (!normalizedCorrectAnswer) {
    return false;
  }

  const correctChoice = question.choices?.find(
    (choice) => choice.value.trim() === normalizedCorrectAnswer,
  );
  if (!correctChoice) {
    return false;
  }

  if (!compareQuestionAnswer(question, correctChoice.value).isCorrect) {
    return false;
  }

  return (
    question.choices
      ?.filter((choice) => choice.value.trim() !== normalizedCorrectAnswer)
      .every((choice) => !compareQuestionAnswer(question, choice.value).isCorrect) ?? true
  );
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

function toMetadataArray(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  return toStringArray(value);
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

function getPathFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function slugifyCourseDirectoryId(courseId: string): string {
  return courseId.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function resolveCourseContentPath(path: string, subjectId: string, courseDirectoryId: string): string {
  if (!path.startsWith("./content/")) {
    return path;
  }

  const relativePath = path.slice("./content/".length);
  const nestedPrefix = `${subjectId}/${courseDirectoryId}/`;
  if (relativePath.startsWith(nestedPrefix)) {
    return path;
  }

  if (
    relativePath.startsWith("manifest/") ||
    relativePath.startsWith("test-sets/") ||
    relativePath.startsWith("tutorials/")
  ) {
    return `./content/${nestedPrefix}${relativePath}`;
  }

  return path;
}

function toRuntimeContentPath(modulePath: string): string {
  const normalizedModulePath = modulePath.replace(/\\/g, "/");
  const contentMarker = "/public/content/";
  const markerIndex = normalizedModulePath.indexOf(contentMarker);
  if (markerIndex >= 0) {
    return `./content/${normalizedModulePath.slice(markerIndex + contentMarker.length)}`;
  }

  return `./content/${getPathFileName(modulePath)}`;
}

function buildBundledContentMap<T>(modules: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(modules).map(([modulePath, value]) => [
      toRuntimeContentPath(modulePath),
      value,
    ]),
  );
}

const bundledManifestFiles = buildBundledContentMap(bundledManifestModules);
const bundledTestSetFiles = buildBundledContentMap(bundledTestSetModules);
const bundledTutorialFiles = buildBundledContentMap(bundledTutorialModules);
const DEFAULT_MANIFEST_PATHS = Object.keys(bundledManifestFiles).sort();

function getBundledContentFallback<T>(path: string, type: "json" | "text"): T | null {
  if (type === "text") {
    return ((bundledTutorialFiles[path] ?? null) as T | null);
  }

  return (((bundledManifestFiles[path] ?? bundledTestSetFiles[path]) ?? null) as T | null);
}

async function fetchContentFile<T>(path: string, type: "json" | "text"): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      const fallback = getBundledContentFallback<T>(path, type);
      if (fallback !== null) {
        return fallback;
      }

      logContentValidationError("Failed to load content file.", {
        path,
        status: response.status,
      });
      return null;
    }

    return type === "json"
      ? ((await response.json()) as T)
      : ((await response.text()) as T);
  } catch (error) {
    const fallback = getBundledContentFallback<T>(path, type);
    if (fallback !== null) {
      return fallback;
    }

    logContentValidationError("Failed to fetch content file.", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
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
        const subjectId = toStringValue(course.subjectId, "math");
        const subjectTitle = toStringValue(
          course.subjectTitle,
          subjectId === "math" ? "Mathematics" : "Learning",
        );
        const courseDirectoryId = toStringValue(course.courseId, slugifyCourseDirectoryId(courseId));
        const courseTitle = toStringValue(course.courseTitle, toStringValue(course.title, `Course ${courseIndex + 1}`));
        const rawUnits = Array.isArray(course.units) ? course.units : [];

        return {
          id: courseId,
          subjectId,
          subjectTitle,
          courseId: courseDirectoryId,
          courseTitle,
          instructionalGrades: toMetadataArray(course.instructionalGrades),
          programPathways: toMetadataArray(course.programPathways),
          standardsFrameworks: toMetadataArray(course.standardsFrameworks ?? course.standardsFramework),
          title: toStringValue(course.title, courseTitle),
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
              concepts: rawConcepts.filter(isRecord).map((concept, conceptIndex): Concept => {
                const conceptRecord = concept as Record<string, unknown>;

                return {
                  ...conceptRecord,
                  id: toStringValue(concept.id, `${unitId}-concept-${conceptIndex + 1}`),
                  courseId,
                  unitId,
                  title: toStringValue(concept.title, `Concept ${conceptIndex + 1}`),
                  description: toStringValue(concept.description),
                  tags: toStringArray(concept.tags),
                  instructionalGrades: toMetadataArray(conceptRecord.instructionalGrades),
                  programPathways: toMetadataArray(conceptRecord.programPathways),
                  standardsFrameworks: toMetadataArray(
                    conceptRecord.standardsFrameworks ?? conceptRecord.standardsFramework,
                  ),
                  order: toNumberValue(concept.order, conceptIndex + 1),
                  masteryStatus: toMasteryStatus(concept.masteryStatus),
                  testQuestionCount:
                    typeof concept.testQuestionCount === "number"
                      ? concept.testQuestionCount
                      : undefined,
                  tutorial: resolveCourseContentPath(
                    toStringValue(
                      conceptRecord.tutorial ?? conceptRecord.tutorialPath,
                      `./content/${subjectId}/${courseDirectoryId}/tutorials/${toStringValue(concept.id, `${unitId}-concept-${conceptIndex + 1}`)}.md`,
                    ),
                    subjectId,
                    courseDirectoryId,
                  ),
                  tests: Array.isArray(conceptRecord.tests)
                    ? conceptRecord.tests.filter(isRecord).map((test) => ({
                        ...test,
                        path: resolveCourseContentPath(
                          toStringValue(test.path),
                          subjectId,
                          courseDirectoryId,
                        ),
                      }))
                    : [],
                  hasTest: false,
                } as Concept;
              }),
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

async function loadRuntimeManifest(): Promise<CourseManifestDocument> {
  const manifestPaths =
    DEFAULT_MANIFEST_PATHS.length > 0
      ? DEFAULT_MANIFEST_PATHS
      : ["./content/math/course2/manifest/course2_manifest.json"];
  const manifests = (
    await Promise.all(manifestPaths.map((path) => fetchContentFile<unknown>(path, "json")))
  ).filter((manifest): manifest is unknown => manifest !== null);

  if (manifests.length === 0) {
    throw new Error("No course manifest found in ./content/**/manifest.");
  }

  return normalizeManifestDocument({
    courses: manifests.flatMap((entry) => normalizeManifestDocument(entry).courses),
  });
}

async function readTestContentDirectory(subdirectory: "manifest" | "test-sets" | "tutorials") {
  const fs = await import("node:fs/promises");
  const contentRoot = `${process.cwd()}/public/content`;

  const walk = async (directoryPath: string): Promise<string[]> => {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const nestedEntries = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith("."))
        .map(async (entry) => {
          const absolutePath = `${directoryPath}/${entry.name}`;
          if (entry.isDirectory()) {
            return walk(absolutePath);
          }

          return [absolutePath];
        }),
    );

    return nestedEntries.flat();
  };

  const absolutePaths = (await walk(contentRoot)).sort((left, right) => left.localeCompare(right));

  return absolutePaths
    .filter((absolutePath) => absolutePath.includes(`/${subdirectory}/`))
    .map((absolutePath) => {
      const relativePath = absolutePath.slice(`${contentRoot}/`.length);
      return {
        fileName: getPathFileName(absolutePath),
        path: `./content/${relativePath}`,
        absolutePath,
      };
    });
}

async function loadTestManifest(): Promise<CourseManifestDocument> {
  const fs = await import("node:fs/promises");
  const manifests = await Promise.all(
    (await readTestContentDirectory("manifest")).map(async ({ absolutePath }) =>
      JSON.parse(await fs.readFile(absolutePath, "utf8")),
    ),
  );

  if (manifests.length === 0) {
    throw new Error("No course manifest found in ./content/**/manifest.");
  }

  return normalizeManifestDocument({
    courses: manifests.flatMap((entry) => normalizeManifestDocument(entry).courses),
  });
}

async function loadRuntimeTutorials(
  manifest: CourseManifestDocument,
): Promise<Record<string, string>> {
  const tutorialPaths = Array.from(
    new Set(
      manifest.courses.flatMap((course) =>
        course.units.flatMap((unit) =>
          unit.concepts
            .map((concept) => (concept as unknown as Record<string, unknown>).tutorial)
            .filter((path): path is string => typeof path === "string"),
        ),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const tutorials = await Promise.all(
    tutorialPaths.map(async (path) => {
      const content = await fetchContentFile<string>(path, "text");
      const conceptId = getTutorialConceptId(path);
      return content && conceptId ? ([conceptId, content] as const) : null;
    }),
  );

  return Object.fromEntries(tutorials.filter((entry): entry is readonly [string, string] => entry !== null));
}

async function loadTestTutorials(): Promise<Record<string, string>> {
  const fs = await import("node:fs/promises");
  return Object.fromEntries(
    await Promise.all(
      (await readTestContentDirectory("tutorials")).map(async ({ path, absolutePath }) => {
        const content = await fs.readFile(absolutePath, "utf8");
        const conceptId = path.split("/").pop()?.replace(".md", "");
        if (!conceptId) {
          throw new Error(`Cannot derive tutorial concept id from path ${path}`);
        }

        return [conceptId, content];
      }),
    ),
  );
}

async function loadRuntimeQuestionBanks(
  manifest: CourseManifestDocument,
): Promise<Array<{ path: string; document: unknown }>> {
  const testPaths = Array.from(
    new Set(
      manifest.courses.flatMap((course) =>
        course.units.flatMap((unit) =>
          unit.concepts.flatMap((concept) => {
            const listedTests = Array.isArray((concept as unknown as Record<string, unknown>).tests)
              ? ((concept as unknown as Record<string, unknown>).tests as unknown[])
              : [];

            return listedTests
              .filter(isRecord)
              .map((test) => toStringValue(test.path))
              .filter(Boolean);
          }),
        ),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const documents: Array<{ path: string; document: unknown } | null> = await Promise.all(
    testPaths.map(async (path) => {
      const document = await fetchContentFile<unknown>(path, "json");
      return document !== null ? { path, document } : null;
    }),
  );

  return documents.filter(
    (entry): entry is { path: string; document: unknown } => entry !== null,
  );
}

async function loadTestQuestionBanks(): Promise<Array<{ path: string; document: unknown }>> {
  const fs = await import("node:fs/promises");
  return Promise.all(
    (await readTestContentDirectory("test-sets")).map(async ({ path, absolutePath }) => ({
      path,
      document: JSON.parse(await fs.readFile(absolutePath, "utf8")),
    })),
  );
}

export async function createDefaultContentRepository(): Promise<StaticContentRepository> {
  const manifest = import.meta.env.MODE === "test" ? await loadTestManifest() : await loadRuntimeManifest();
  const tutorialsByConceptId =
    import.meta.env.MODE === "test" ? await loadTestTutorials() : await loadRuntimeTutorials(manifest);
  const loadedQuestionBanks =
    import.meta.env.MODE === "test"
      ? await loadTestQuestionBanks()
      : await loadRuntimeQuestionBanks(manifest);

  const validationResult = validateManifest(
    manifest,
    tutorialsByConceptId,
    loadedQuestionBanks.map(({ path, document }) => ({
      path,
      ...(isRecord(document) ? document : {}),
    })),
  );
  const validatedManifest = validationResult.manifest;

  const validConceptIds = new Set(
    validatedManifest.courses.flatMap((course) =>
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
    validatedManifest.courses.flatMap((course) =>
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
  const manifestDrivenTestSets = loadedQuestionBanks
    .sort((left, right) => left.path.localeCompare(right.path))
    .flatMap(({ path, document: rawDocument }) => {
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
        const normalizedQuestion: Question = {
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
        };

        if (!hasMatchingMultipleChoiceCorrectAnswer(normalizedQuestion)) {
          skippedTestSets += 1;
          logContentValidationError(
            "Skipping test set with multiple-choice correct answer missing from options.",
            {
              path,
              testSetId,
              questionId,
              correctAnswer: normalizedQuestion.correctAnswer,
            },
          );
          return [];
        }

        if (!hasValidMultipleChoiceChoices(normalizedQuestion)) {
          skippedTestSets += 1;
          logContentValidationError(
            "Skipping test set with invalid multiple-choice options.",
            {
              path,
              testSetId,
              questionId,
              choiceCount: normalizedQuestion.choices?.length ?? 0,
              choiceValues:
                normalizedQuestion.choices?.map((choice) => choice.value.trim()) ?? [],
            },
          );
          return [];
        }

        if (!hasConsistentMultipleChoiceScoring(normalizedQuestion)) {
          skippedTestSets += 1;
          logContentValidationError(
            "Skipping test set with ambiguous multiple-choice scoring.",
            {
              path,
              testSetId,
              questionId,
              answerType: normalizedQuestion.answerType,
              correctAnswer: normalizedQuestion.correctAnswer,
              choiceValues:
                normalizedQuestion.choices?.map((choice) => choice.value.trim()) ?? [],
            },
          );
          return [];
        }

        normalizedQuestions.push(normalizedQuestion);
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
    const conceptCount = validatedManifest.courses.flatMap((course) =>
      course.units.flatMap((unit) => unit.concepts),
    ).length;
    const skippedCount = validationResult.skippedConcepts + skippedTestSets;
    console.info(
      `Loaded ${conceptCount} concepts, ${manifestDrivenTestSets.length} test sets, skipped ${skippedCount} invalid entr${skippedCount === 1 ? "y" : "ies"}`,
    );
  }

  return new StaticContentRepository(
    validatedManifest,
    manifestDrivenTestSets,
    manifestDrivenTutorials,
  );
}

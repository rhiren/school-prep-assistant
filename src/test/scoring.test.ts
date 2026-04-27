import { afterEach, describe, expect, it, vi } from "vitest";
import { BasicScoringEngine } from "../engines/basicScoringEngine";
import type { Question, TestSession } from "../domain/models";
import type { ContentRepository } from "../services/contracts";
import { createDefaultContentRepository } from "../services/contentRepository";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";

function createRepositoryWithQuestions(questions: Question[]): ContentRepository {
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return {
    listCourses: async () => [],
    getCourse: async () => null,
    getConcept: async () => null,
    getQuestionsForConcept: async () => [],
    getQuestionById: async (questionId) => questionMap.get(questionId) ?? null,
    getQuestionByIdSync: (questionId) => questionMap.get(questionId) ?? null,
    getCourseConcepts: async () => [],
    getTutorialContent: async () => null,
    getTestSetsForConcept: async () => [],
    getTestSet: async () => null,
    getQuestionsForTestSet: async () => [],
  };
}

describe("BasicScoringEngine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("scores correct, incorrect, and unanswered responses with normalization", async () => {
    const repository = createRepositoryWithQuestions([
      {
        id: "numeric-1",
        courseId: "course-2",
        unitId: "unit-ratios-proportions",
        conceptId: "concept-unit-rates",
        tags: [],
        difficulty: "easy",
        questionType: "numeric",
        answerType: "number",
        prompt: "Enter the unit rate.",
        correctAnswer: "8",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "numeric-2",
        courseId: "course-2",
        unitId: "unit-ratios-proportions",
        conceptId: "concept-unit-rates",
        tags: [],
        difficulty: "easy",
        questionType: "numeric",
        answerType: "number",
        prompt: "Enter the incorrect row number.",
        correctAnswer: "4",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "numeric-3",
        courseId: "course-2",
        unitId: "unit-ratios-proportions",
        conceptId: "concept-unit-rates",
        tags: [],
        difficulty: "easy",
        questionType: "numeric",
        answerType: "number",
        prompt: "Enter the pages per day.",
        correctAnswer: "9",
        explanation: "",
        eligibleForMixed: true,
      },
    ]);
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-1",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: ["numeric-1", "numeric-2", "numeric-3"],
      answers: {
        "numeric-1": {
          questionId: "numeric-1",
          response: "8.0",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
        "numeric-2": {
          questionId: "numeric-2",
          response: "6",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
        "numeric-3": {
          questionId: "numeric-3",
          response: "   ",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(1);
    expect(attempt.summary.incorrectCount).toBe(1);
    expect(attempt.summary.unansweredCount).toBe(1);
    expect(attempt.summary.percentage).toBe(33);
  });

  it("marks equivalent numeric formatting as correct", async () => {
    const repository = createRepositoryWithQuestions([
      {
        id: "decimal-1",
        courseId: "course-2",
        unitId: "unit-ratios-proportions",
        conceptId: "concept-unit-rates",
        tags: [],
        difficulty: "medium",
        questionType: "numeric",
        answerType: "decimal",
        prompt: "Enter the ticket price.",
        correctAnswer: "6.5",
        explanation: "",
        eligibleForMixed: true,
      },
    ]);
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-2",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: ["decimal-1"],
      answers: {
        "decimal-1": {
          questionId: "decimal-1",
          response: "6.50",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(1);
    expect(attempt.results[0]?.feedbackTip).toBeNull();
  });

  it("scores text-valued multiple-choice answers correctly even when authored with numeric answer types", async () => {
    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-3",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: [
        "concept-unit-rates-core-010",
        "concept-unit-rates-core-021",
        "concept-unit-rates-core-028",
        "concept-unit-rates-core-044",
        "concept-unit-rates-core-045",
        "concept-unit-rates-core-050",
      ],
      answers: {
        "concept-unit-rates-core-010": {
          questionId: "concept-unit-rates-core-010",
          response: "Divide 14 by 7",
          answeredAt: "2026-04-21T04:00:00.000Z",
        },
        "concept-unit-rates-core-021": {
          questionId: "concept-unit-rates-core-021",
          response: "Store B",
          answeredAt: "2026-04-21T04:00:00.000Z",
        },
        "concept-unit-rates-core-028": {
          questionId: "concept-unit-rates-core-028",
          response: "5 pounds in 2 days",
          answeredAt: "2026-04-21T04:00:00.000Z",
        },
        "concept-unit-rates-core-044": {
          questionId: "concept-unit-rates-core-044",
          response: "Divided 16 by 2",
          answeredAt: "2026-04-21T04:00:00.000Z",
        },
        "concept-unit-rates-core-045": {
          questionId: "concept-unit-rates-core-045",
          response: "Store B",
          answeredAt: "2026-04-21T04:00:00.000Z",
        },
        "concept-unit-rates-core-050": {
          questionId: "concept-unit-rates-core-050",
          response: "The scooter is faster",
          answeredAt: "2026-04-21T04:00:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-21T04:00:00.000Z",
      updatedAt: "2026-04-21T04:00:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(6);
    expect(attempt.summary.incorrectCount).toBe(0);
    expect(attempt.summary.percentage).toBe(100);
    expect(attempt.results.every((result) => result.isCorrect)).toBe(true);
  });

  it("scores solving proportions text-valued multiple-choice answers correctly", async () => {
    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-3b",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-solving-proportions",
      conceptIds: ["concept-solving-proportions"],
      questionIds: [
        "concept-solving-proportions-core-009",
        "concept-solving-proportions-core-014",
        "concept-solving-proportions-review-007",
        "concept-solving-proportions-review-014",
      ],
      answers: {
        "concept-solving-proportions-core-009": {
          questionId: "concept-solving-proportions-core-009",
          response: "Both parts were multiplied by 3",
          answeredAt: "2026-04-26T05:00:00.000Z",
        },
        "concept-solving-proportions-core-014": {
          questionId: "concept-solving-proportions-core-014",
          response: "The denominator did not scale by the same factor",
          answeredAt: "2026-04-26T05:00:00.000Z",
        },
        "concept-solving-proportions-review-007": {
          questionId: "concept-solving-proportions-review-007",
          response: "The denominator did not change by the same factor",
          answeredAt: "2026-04-26T05:00:00.000Z",
        },
        "concept-solving-proportions-review-014": {
          questionId: "concept-solving-proportions-review-014",
          response: "Both parts were multiplied by 3",
          answeredAt: "2026-04-26T05:00:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-26T05:00:00.000Z",
      updatedAt: "2026-04-26T05:00:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(4);
    expect(attempt.summary.incorrectCount).toBe(0);
    expect(attempt.summary.percentage).toBe(100);
    expect(attempt.results.every((result) => result.isCorrect)).toBe(true);
  });

  it("scores compare integers text-valued multiple-choice answers correctly", async () => {
    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-3c",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-compare-integers",
      conceptIds: ["concept-compare-integers"],
      questionIds: [
        "concept-compare-integers-core-008",
        "concept-compare-integers-core-011",
        "concept-compare-integers-review-005",
        "concept-compare-integers-review-011",
      ],
      answers: {
        "concept-compare-integers-core-008": {
          questionId: "concept-compare-integers-core-008",
          response: "-5 is closer to zero",
          answeredAt: "2026-04-26T05:30:00.000Z",
        },
        "concept-compare-integers-core-011": {
          questionId: "concept-compare-integers-core-011",
          response: "The student forgot that farther left means smaller",
          answeredAt: "2026-04-26T05:30:00.000Z",
        },
        "concept-compare-integers-review-005": {
          questionId: "concept-compare-integers-review-005",
          response: "-4 is greater because it is closer to zero",
          answeredAt: "2026-04-26T05:30:00.000Z",
        },
        "concept-compare-integers-review-011": {
          questionId: "concept-compare-integers-review-011",
          response: "The student ignored that numbers farther left are smaller",
          answeredAt: "2026-04-26T05:30:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-26T05:30:00.000Z",
      updatedAt: "2026-04-26T05:30:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(4);
    expect(attempt.summary.incorrectCount).toBe(0);
    expect(attempt.summary.percentage).toBe(100);
    expect(attempt.results.every((result) => result.isCorrect)).toBe(true);
  });

  it("captures hidden duration metadata at submit time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T16:05:30.000Z"));

    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-4",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: ["concept-unit-rates-core-001"],
      answers: {
        "concept-unit-rates-core-001": {
          questionId: "concept-unit-rates-core-001",
          response: "8",
          answeredAt: "2026-04-24T16:03:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-24T16:00:00.000Z",
      updatedAt: "2026-04-24T16:03:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.durationSignal).toEqual({
      startedAt: "2026-04-24T16:00:00.000Z",
      durationMs: 330000,
    });
    expect(attempt.submittedAt).toBe("2026-04-24T16:05:30.000Z");
  });

  it("clamps hidden duration metadata to zero when submit time is not after start time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T16:00:00.000Z"));

    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-5",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: ["concept-unit-rates-core-001"],
      answers: {},
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-24T16:00:30.000Z",
      updatedAt: "2026-04-24T16:00:30.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.durationSignal).toEqual({
      startedAt: "2026-04-24T16:00:30.000Z",
      durationMs: 0,
    });
  });
});

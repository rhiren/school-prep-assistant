import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../app/router";
import type { Question, TestAttempt } from "../domain/models";
import { createDefaultContentRepository } from "../services/contentRepository";
import {
  buildRetryOutcome,
  buildSkillPerformance,
  getRetryHistory,
  buildRetrySet,
  getDifficultyAdjustment,
  getQuestionSkillTags,
  getWeakSkills,
  getSmartRetryRecommendation,
  shouldExitRetry,
} from "../services/smartRetry";
import {
  AppServicesProvider,
  createAppServices,
} from "../state/AppServicesProvider";
import { TestModeProvider } from "../state/TestModeProvider";
import { MemoryStorageService } from "../storage/memoryStorageService";

function buildAttemptFromQuestions(
  questions: Question[],
  submittedAt: string,
  incorrectQuestionCount: number,
  options?: {
    smartRetryCycle?: number;
  },
): TestAttempt {
  const conceptId = questions[0]?.conceptId ?? "concept-unit-rates";
  const incorrectQuestions = questions.slice(0, incorrectQuestionCount);
  const correctQuestions = questions.slice(incorrectQuestionCount);

  return {
    attemptId: `attempt-${submittedAt}`,
    studentId: "student-1",
    sessionId: `session-${submittedAt}`,
    mode: "concept",
    courseId: "course-2",
    conceptId,
    conceptIds: [conceptId],
    questionIds: questions.map((question) => question.id),
    answers: {},
    smartRetry:
      typeof options?.smartRetryCycle === "number"
        ? {
            kind: "targeted",
            cycle: options.smartRetryCycle,
          }
        : undefined,
    results: [
      ...incorrectQuestions.map((question) => ({
        questionId: question.id,
        conceptId: question.conceptId,
        isCorrect: false,
        submittedAnswer: "wrong",
        correctAnswer: question.correctAnswer,
        skillTags: question.skillTags,
        difficulty: question.difficulty,
      })),
      ...correctQuestions.map((question) => ({
        questionId: question.id,
        conceptId: question.conceptId,
        isCorrect: true,
        submittedAnswer: question.correctAnswer,
        correctAnswer: question.correctAnswer,
        skillTags: question.skillTags,
        difficulty: question.difficulty,
      })),
    ],
    summary: {
      totalQuestions: questions.length,
      correctCount: correctQuestions.length,
      incorrectCount: incorrectQuestions.length,
      unansweredCount: 0,
      percentage: Math.round((correctQuestions.length / questions.length) * 100),
    },
    submittedAt,
  };
}

async function seedFailedAttempts(
  services: Awaited<ReturnType<typeof createAppServices>>,
  conceptId: string,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const session = await services.testGenerationService.createConceptSession(conceptId);
    for (const questionId of session.questionIds.slice(0, 3)) {
      await services.sessionService.saveAnswer(session.id, {
        questionId,
        response: "wrong",
        answeredAt: "2026-04-20T12:00:00.000Z",
      });
    }
    await services.sessionService.submitSession(session.id);
  }
}

async function submitTargetedRetryPass(
  services: Awaited<ReturnType<typeof createAppServices>>,
  questionIds: string[],
  options: {
    cycle: number;
    startState?: {
      conceptId: string;
      weakSkillsBefore: Array<
        "computation" | "conceptual" | "word-problem" | "multi-step" | "graph" | "visual"
      >;
      attemptCountBefore: number;
    };
  },
): Promise<void> {
  const session = await services.testGenerationService.createConceptSession(
    "concept-unit-rates",
    undefined,
    {
      questionIds,
      smartRetry: {
        kind: "targeted",
        cycle: options.cycle,
        startState: options.startState,
      },
    },
  );

  for (const questionId of questionIds.slice(0, 4)) {
    const question = await services.contentRepository.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Unknown question: ${questionId}`);
    }

    await services.sessionService.saveAnswer(session.id, {
      questionId,
      response: question.correctAnswer,
      answeredAt: "2026-04-20T12:00:00.000Z",
    });
  }

  await services.sessionService.saveAnswer(session.id, {
    questionId: questionIds[4],
    response: "wrong",
    answeredAt: "2026-04-20T12:00:00.000Z",
  });

  await services.sessionService.submitSession(session.id);
}

describe("Smart Retry v2 logic", () => {
  it("builds a deterministic 5-question retry set", async () => {
    const repository = await createDefaultContentRepository();
    const conceptQuestions = await repository.getQuestionsForConcept("concept-unit-rates");
    const questions = conceptQuestions.slice(0, 8);
    const attempts = [
      buildAttemptFromQuestions(questions, "2026-04-20T10:00:00.000Z", 5),
      buildAttemptFromQuestions(questions, "2026-04-19T10:00:00.000Z", 4),
    ];

    const retrySet = buildRetrySet("concept-unit-rates", conceptQuestions, attempts);
    const recentIncorrectIds = new Set(
      attempts.flatMap((attempt) =>
        attempt.results.filter((result) => !result.isCorrect).map((result) => result.questionId),
      ),
    );
    const questionById = Object.fromEntries(
      conceptQuestions.map((question) => [question.id, question] as const),
    );

    expect(retrySet.questionIds).toHaveLength(5);
    expect(new Set(retrySet.questionIds).size).toBe(5);
    expect(retrySet.missedTypeQuestionIds).toHaveLength(3);
    expect(
      retrySet.missedTypeQuestionIds.some((questionId) => recentIncorrectIds.has(questionId)),
    ).toBe(true);
    expect(["easy", "medium"]).toContain(questionById[retrySet.scaffoldQuestionId]?.difficulty);
    expect(["medium", "hard", "challenge"]).toContain(
      questionById[retrySet.transferQuestionId]?.difficulty,
    );
  });

  it("exits Smart Retry after a 4 out of 5 targeted retry pass", async () => {
    const repository = await createDefaultContentRepository();
    const conceptQuestions = (await repository.getQuestionsForConcept("concept-unit-rates")).slice(0, 5);

    expect(
      shouldExitRetry([
        buildAttemptFromQuestions(conceptQuestions, "2026-04-20T10:00:00.000Z", 1, {
          smartRetryCycle: 1,
        }),
      ]),
    ).toEqual({
      shouldExit: true,
      retryCount: 1,
      reason: "passed",
    });
  });

  it("exits Smart Retry after two targeted retry cycles", async () => {
    const repository = await createDefaultContentRepository();
    const conceptQuestions = (await repository.getQuestionsForConcept("concept-unit-rates")).slice(0, 5);

    expect(
      shouldExitRetry([
        buildAttemptFromQuestions(conceptQuestions, "2026-04-20T10:00:00.000Z", 3, {
          smartRetryCycle: 2,
        }),
        buildAttemptFromQuestions(conceptQuestions, "2026-04-19T10:00:00.000Z", 3, {
          smartRetryCycle: 1,
        }),
      ]),
    ).toEqual({
      shouldExit: true,
      retryCount: 2,
      reason: "retry_limit",
    });
  }, 10000);
});

describe("Smart Retry v3 skill-aware logic", () => {
  it("aggregates concept skill performance from answered questions", async () => {
    const repository = await createDefaultContentRepository();
    const concept = await repository.getConcept("concept-unit-rates");
    const conceptQuestions = (await repository.getQuestionsForConcept("concept-unit-rates")).slice(0, 3);

    if (!concept) {
      throw new Error("Expected concept metadata.");
    }

    const attempts = [
      buildAttemptFromQuestions(conceptQuestions, "2026-04-20T10:00:00.000Z", 2),
      buildAttemptFromQuestions(conceptQuestions, "2026-04-19T10:00:00.000Z", 2),
      buildAttemptFromQuestions(conceptQuestions, "2026-04-18T10:00:00.000Z", 2),
    ];

    const skillPerformance = buildSkillPerformance("concept-unit-rates", attempts, concept);

    expect(skillPerformance.computation).toEqual({
      correct: 6,
      incorrect: 12,
    });
    expect(skillPerformance["word-problem"]).toEqual({
      correct: 6,
      incorrect: 12,
    });
  });

  it("uses question-level skill tags before concept-level tags", () => {
    expect(
      getQuestionSkillTags(
        {
          tags: ["word-problem"],
          skillTags: ["graph"],
        },
        {
          skillTags: ["computation"],
        },
      ),
    ).toEqual(["graph"]);
  });

  it("detects weak skills only when the weighted incorrect ratio reaches the threshold", async () => {
    const repository = await createDefaultContentRepository();
    const concept = await repository.getConcept("concept-unit-rates");
    const conceptQuestions = (await repository.getQuestionsForConcept("concept-unit-rates")).slice(0, 3);

    if (!concept) {
      throw new Error("Expected concept metadata.");
    }

    const attempts = [
      buildAttemptFromQuestions(conceptQuestions, "2026-04-20T10:00:00.000Z", 2),
      buildAttemptFromQuestions(conceptQuestions, "2026-04-19T10:00:00.000Z", 2),
      buildAttemptFromQuestions(conceptQuestions, "2026-04-18T10:00:00.000Z", 2),
    ];

    expect(getWeakSkills("concept-unit-rates", attempts, concept)).toEqual([
      "computation",
      "word-problem",
    ]);
  });

  it("does not mark a skill as weak when misses do not reach the 60 percent threshold", () => {
    const questions: Question[] = [
      {
        id: "threshold-q1",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-threshold",
        tags: ["conceptual"],
        skillTags: ["multi-step"],
        difficulty: "medium",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q1",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
    ];

    const attempts = [
      buildAttemptFromQuestions(questions, "2026-04-20T10:00:00.000Z", 1),
      buildAttemptFromQuestions(questions, "2026-04-19T10:00:00.000Z", 1),
      buildAttemptFromQuestions(questions, "2026-04-18T10:00:00.000Z", 0),
      buildAttemptFromQuestions(questions, "2026-04-17T10:00:00.000Z", 0),
    ];

    expect(
      getWeakSkills("concept-threshold", attempts, {
        id: "concept-threshold",
        skillTags: ["multi-step"],
      }),
    ).toEqual([]);
  });

  it("weights the last three attempts more heavily when identifying weak skills", () => {
    const questions: Question[] = [
      {
        id: "recency-q1",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-recency",
        tags: ["conceptual"],
        skillTags: ["multi-step"],
        difficulty: "medium",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q1",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
    ];

    const attempts = [
      buildAttemptFromQuestions(questions, "2026-04-20T10:00:00.000Z", 1),
      buildAttemptFromQuestions(questions, "2026-04-19T10:00:00.000Z", 1),
      buildAttemptFromQuestions(questions, "2026-04-18T10:00:00.000Z", 0),
      buildAttemptFromQuestions(questions, "2026-04-17T10:00:00.000Z", 0),
    ];

    expect(
      buildSkillPerformance("concept-recency", attempts, {
        id: "concept-recency",
        skillTags: ["multi-step"],
      }),
    ).toEqual({
      "multi-step": {
        correct: 3,
        incorrect: 4,
      },
    });
  });

  it("reduces the challenge slot when the student has not handled standard questions yet", () => {
    const attempts: TestAttempt[] = [
      {
        attemptId: "difficulty-1",
        studentId: "student-1",
        sessionId: "session-1",
        mode: "concept",
        courseId: "course-2",
        conceptId: "concept-difficulty",
        conceptIds: ["concept-difficulty"],
        questionIds: ["q1", "q2", "q3"],
        answers: {},
        results: [
          {
            questionId: "q1",
            conceptId: "concept-difficulty",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["multi-step"],
            difficulty: "medium",
            feedbackTip: null,
          },
          {
            questionId: "q2",
            conceptId: "concept-difficulty",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["multi-step"],
            difficulty: "hard",
            feedbackTip: null,
          },
          {
            questionId: "q3",
            conceptId: "concept-difficulty",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["multi-step"],
            difficulty: "easy",
            feedbackTip: null,
          },
        ],
        summary: {
          totalQuestions: 3,
          correctCount: 0,
          incorrectCount: 3,
          unansweredCount: 0,
          percentage: 0,
        },
        submittedAt: "2026-04-20T10:00:00.000Z",
      },
    ];

    const skillPerformance = buildSkillPerformance("concept-difficulty", attempts, {
      id: "concept-difficulty",
      skillTags: ["multi-step"],
    });

    expect(
      getDifficultyAdjustment(skillPerformance, attempts, "concept-difficulty"),
    ).toEqual({
      scaffoldMode: "strong",
      allowChallenge: false,
    });
  });

  it("computes a non-improved retry outcome when score stays low and weak skills do not shrink", () => {
    const retryAttempt: TestAttempt = {
      attemptId: "retry-attempt",
      studentId: "student-1",
      sessionId: "retry-session",
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-custom",
      conceptIds: ["concept-custom"],
      questionIds: ["q1", "q2", "q3", "q4", "q5"],
      answers: {},
      smartRetry: {
        kind: "targeted",
        cycle: 1,
        startState: {
          conceptId: "concept-custom",
          weakSkillsBefore: ["word-problem"],
          attemptCountBefore: 2,
        },
      },
      results: [
        {
          questionId: "q1",
          conceptId: "concept-custom",
          isCorrect: false,
          submittedAnswer: "2",
          correctAnswer: "1",
          skillTags: ["word-problem"],
          difficulty: "easy",
          feedbackTip: null,
        },
        {
          questionId: "q2",
          conceptId: "concept-custom",
          isCorrect: false,
          submittedAnswer: "2",
          correctAnswer: "1",
          skillTags: ["word-problem"],
          difficulty: "medium",
          feedbackTip: null,
        },
        {
          questionId: "q3",
          conceptId: "concept-custom",
          isCorrect: true,
          submittedAnswer: "1",
          correctAnswer: "1",
          skillTags: ["word-problem"],
          difficulty: "medium",
          feedbackTip: null,
        },
        {
          questionId: "q4",
          conceptId: "concept-custom",
          isCorrect: true,
          submittedAnswer: "1",
          correctAnswer: "1",
          skillTags: ["conceptual"],
          difficulty: "medium",
          feedbackTip: null,
        },
        {
          questionId: "q5",
          conceptId: "concept-custom",
          isCorrect: false,
          submittedAnswer: "2",
          correctAnswer: "1",
          skillTags: ["word-problem"],
          difficulty: "challenge",
          feedbackTip: null,
        },
      ],
      summary: {
        totalQuestions: 5,
        correctCount: 2,
        incorrectCount: 3,
        unansweredCount: 0,
        percentage: 40,
      },
      submittedAt: "2026-04-21T10:00:00.000Z",
    };

    const previousAttempts: TestAttempt[] = [
      {
        ...retryAttempt,
        attemptId: "older-attempt-1",
        sessionId: "older-session-1",
        smartRetry: undefined,
        questionIds: ["q1", "q2"],
        results: retryAttempt.results.slice(0, 2),
        summary: {
          totalQuestions: 2,
          correctCount: 0,
          incorrectCount: 2,
          unansweredCount: 0,
          percentage: 0,
        },
        submittedAt: "2026-04-20T10:00:00.000Z",
      },
      {
        ...retryAttempt,
        attemptId: "older-attempt-2",
        sessionId: "older-session-2",
        smartRetry: undefined,
        questionIds: ["q1", "q3"],
        results: [retryAttempt.results[0], retryAttempt.results[2]],
        summary: {
          totalQuestions: 2,
          correctCount: 1,
          incorrectCount: 1,
          unansweredCount: 0,
          percentage: 50,
        },
        submittedAt: "2026-04-19T10:00:00.000Z",
      },
    ];

    expect(
      buildRetryOutcome(retryAttempt, previousAttempts, {
        id: "concept-custom",
        skillTags: ["word-problem", "conceptual"],
      }),
    ).toMatchObject({
      retryScore: 2,
      weakSkillsBefore: ["word-problem"],
      weakSkillsAfter: ["word-problem"],
      improved: false,
      attemptCountBefore: 2,
      attemptCountAfter: 3,
    });
  });

  it("prioritizes weak-skill questions and difficulty sequencing in the retry set", () => {
    const questions: Question[] = [
      {
        id: "q1",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-custom",
        tags: ["word-problem"],
        difficulty: "easy",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q1",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "q2",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-custom",
        tags: ["word-problem"],
        difficulty: "medium",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q2",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "q3",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-custom",
        tags: ["word-problem"],
        difficulty: "medium",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q3",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "q4",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-custom",
        tags: ["conceptual"],
        difficulty: "medium",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q4",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "q5",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-custom",
        tags: ["word-problem"],
        difficulty: "challenge",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q5",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
      {
        id: "q6",
        courseId: "course-2",
        unitId: "unit-1",
        conceptId: "concept-custom",
        tags: ["graph"],
        difficulty: "hard",
        questionType: "multiple_choice",
        answerType: "number",
        prompt: "Q6",
        choices: [{ id: "a", label: "A", value: "1" }, { id: "b", label: "B", value: "2" }],
        correctAnswer: "1",
        explanation: "",
        eligibleForMixed: true,
      },
    ];

    const attempts: TestAttempt[] = [
      {
        attemptId: "attempt-1",
        studentId: "student-1",
        sessionId: "session-1",
        mode: "concept",
        courseId: "course-2",
        conceptId: "concept-custom",
        conceptIds: ["concept-custom"],
        questionIds: ["q1", "q2", "q3"],
        answers: {},
        results: [
          {
            questionId: "q1",
            conceptId: "concept-custom",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["word-problem"],
            difficulty: "easy",
            feedbackTip: null,
          },
          {
            questionId: "q2",
            conceptId: "concept-custom",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["word-problem"],
            difficulty: "medium",
            feedbackTip: null,
          },
          {
            questionId: "q3",
            conceptId: "concept-custom",
            isCorrect: true,
            submittedAnswer: "1",
            correctAnswer: "1",
            skillTags: ["word-problem"],
            difficulty: "medium",
            feedbackTip: null,
          },
        ],
        summary: {
          totalQuestions: 3,
          correctCount: 1,
          incorrectCount: 2,
          unansweredCount: 0,
          percentage: 33,
        },
        submittedAt: "2026-04-20T10:00:00.000Z",
      },
      {
        attemptId: "attempt-2",
        studentId: "student-1",
        sessionId: "session-2",
        mode: "concept",
        courseId: "course-2",
        conceptId: "concept-custom",
        conceptIds: ["concept-custom"],
        questionIds: ["q1", "q4", "q5"],
        answers: {},
        results: [
          {
            questionId: "q1",
            conceptId: "concept-custom",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["word-problem"],
            difficulty: "easy",
            feedbackTip: null,
          },
          {
            questionId: "q4",
            conceptId: "concept-custom",
            isCorrect: true,
            submittedAnswer: "1",
            correctAnswer: "1",
            skillTags: ["conceptual"],
            difficulty: "medium",
            feedbackTip: null,
          },
          {
            questionId: "q5",
            conceptId: "concept-custom",
            isCorrect: false,
            submittedAnswer: "2",
            correctAnswer: "1",
            skillTags: ["word-problem"],
            difficulty: "challenge",
            feedbackTip: null,
          },
        ],
        summary: {
          totalQuestions: 3,
          correctCount: 1,
          incorrectCount: 2,
          unansweredCount: 0,
          percentage: 33,
        },
        submittedAt: "2026-04-19T10:00:00.000Z",
      },
    ];

    const retrySet = buildRetrySet("concept-custom", questions, attempts, {
      concept: { id: "concept-custom", skillTags: ["word-problem", "conceptual"] },
      weakSkills: ["word-problem"],
      difficultyProfile: { scaffold: true, standard: true, challenge: true },
    });

    expect(retrySet.questionIds).toEqual(["q1", "q2", "q3", "q4", "q5"]);
    expect(retrySet.missedTypeQuestionIds).toEqual(["q1", "q2", "q3", "q4"]);
    expect(retrySet.transferQuestionId).toBe("q5");
  });

  it("falls back to the generic deterministic retry logic when no weak skill is identified", async () => {
    const repository = await createDefaultContentRepository();
    const concept = await repository.getConcept("concept-unit-rates");
    const conceptQuestions = await repository.getQuestionsForConcept("concept-unit-rates");
    const attempts = [
      buildAttemptFromQuestions(conceptQuestions.slice(0, 5), "2026-04-20T10:00:00.000Z", 1),
      buildAttemptFromQuestions(conceptQuestions.slice(0, 5), "2026-04-19T10:00:00.000Z", 1),
    ];

    const retrySet = buildRetrySet("concept-unit-rates", conceptQuestions, attempts, {
      concept,
    });

    expect(retrySet.questionIds).toHaveLength(5);
    expect(new Set(retrySet.questionIds).size).toBe(5);
  });
});

describe("Smart Retry Home behavior", () => {
  it("keeps production students on the existing flow even after repeated misses", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());

    await seedFailedAttempts(services, "concept-unit-rates", 2);

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    expect(await screen.findByText("Learning Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Recommended Next")).toBeInTheDocument();
    expect(screen.queryByText("Retry Recommended")).not.toBeInTheDocument();
  });

  it("temporarily overrides the normal recommendation for a flagged test student", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());
    const testStudent = await services.studentProfileService.createProfile(
      "Test Student",
      "6",
      undefined,
      {
        profileType: "test",
        featureFlags: {
          smartRetry: true,
        },
      },
    );

    await services.studentProfileService.setActiveStudent(testStudent.studentId);
    await seedFailedAttempts(services, "concept-unit-rates", 2);

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    expect(await screen.findByText("Retry Recommended")).toBeInTheDocument();
    expect(await screen.findByText(/5-question targeted retry/i)).toBeInTheDocument();
    expect(await screen.findByText(/You may need more practice with:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry Practice" })).toBeInTheDocument();
  });

  it("returns to the normal next-concept recommendation after a successful retry", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());
    const testStudent = await services.studentProfileService.createProfile(
      "Test Student",
      "6",
      undefined,
      {
        profileType: "test",
        featureFlags: {
          smartRetry: true,
        },
      },
    );

    await services.studentProfileService.setActiveStudent(testStudent.studentId);
    await seedFailedAttempts(services, "concept-unit-rates", 2);

    const conceptQuestions = await services.contentRepository.getQuestionsForConcept("concept-unit-rates");
    const conceptAttempts = await services.progressService.getConceptAttempts("concept-unit-rates");
    const recommendation = getSmartRetryRecommendation(conceptAttempts, conceptQuestions);

    if (!recommendation) {
      throw new Error("Expected Smart Retry recommendation.");
    }

    await submitTargetedRetryPass(
      services,
      recommendation.retrySet.questionIds,
      {
        cycle: recommendation.retryCycle,
        startState: recommendation.startState,
      },
    );

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    expect(await screen.findByText("Recommended Next")).toBeInTheDocument();
    expect(screen.queryByText("Retry Recommended")).not.toBeInTheDocument();
  });

  it("stores retry outcome history on targeted retry attempts without changing retry behavior", async () => {
    const services = await createAppServices(new MemoryStorageService());
    const testStudent = await services.studentProfileService.createProfile(
      "Test Student",
      "6",
      undefined,
      {
        profileType: "test",
        featureFlags: {
          smartRetry: true,
        },
      },
    );

    await services.studentProfileService.setActiveStudent(testStudent.studentId);
    await seedFailedAttempts(services, "concept-unit-rates", 2);

    const conceptQuestions = await services.contentRepository.getQuestionsForConcept("concept-unit-rates");
    const concept = await services.contentRepository.getConcept("concept-unit-rates");
    const conceptAttempts = await services.progressService.getConceptAttempts("concept-unit-rates");
    const recommendation = getSmartRetryRecommendation(
      conceptAttempts,
      conceptQuestions,
      concept,
    );

    if (!recommendation) {
      throw new Error("Expected Smart Retry recommendation.");
    }

    await submitTargetedRetryPass(services, recommendation.retrySet.questionIds, {
      cycle: recommendation.retryCycle,
      startState: recommendation.startState,
    });

    const updatedAttempts = await services.progressService.getConceptAttempts("concept-unit-rates");
    const retryHistory = getRetryHistory("concept-unit-rates", updatedAttempts);

    expect(retryHistory).toHaveLength(1);
    expect(retryHistory[0]).toMatchObject({
      conceptId: "concept-unit-rates",
      retryScore: 4,
      weakSkillsBefore: recommendation.weakSkills,
      attemptCountBefore: recommendation.attemptCountBefore,
      attemptCountAfter: recommendation.attemptCountBefore + 1,
      improved: true,
    });
    expect(Array.isArray(retryHistory[0]?.weakSkillsAfter)).toBe(true);
  });
});

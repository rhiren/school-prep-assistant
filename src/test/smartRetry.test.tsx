import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../app/router";
import type { Question, TestAttempt } from "../domain/models";
import { createDefaultContentRepository } from "../services/contentRepository";
import {
  buildRetrySet,
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
  const incorrectQuestions = questions.slice(0, incorrectQuestionCount);
  const correctQuestions = questions.slice(incorrectQuestionCount);

  return {
    attemptId: `attempt-${submittedAt}`,
    studentId: "student-1",
    sessionId: `session-${submittedAt}`,
    mode: "concept",
    courseId: "course-2",
    conceptId: "concept-unit-rates",
    conceptIds: ["concept-unit-rates"],
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
        isCorrect: false,
        submittedAnswer: null,
        correctAnswer: question.correctAnswer,
      })),
      ...correctQuestions.map((question) => ({
        questionId: question.id,
        isCorrect: true,
        submittedAnswer: question.correctAnswer,
        correctAnswer: question.correctAnswer,
      })),
    ],
    summary: {
      totalQuestions: questions.length,
      correctCount: correctQuestions.length,
      incorrectCount: incorrectQuestions.length,
      unansweredCount: incorrectQuestions.length,
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
    await services.sessionService.submitSession(session.id);
  }
}

async function submitTargetedRetryPass(
  services: Awaited<ReturnType<typeof createAppServices>>,
  questionIds: string[],
  cycle: number,
): Promise<void> {
  const session = await services.testGenerationService.createConceptSession(
    "concept-unit-rates",
    undefined,
    {
      questionIds,
      smartRetry: {
        kind: "targeted",
        cycle,
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
      retrySet.missedTypeQuestionIds.every((questionId) => recentIncorrectIds.has(questionId)),
    ).toBe(true);
    expect(["easy", "medium"]).toContain(questionById[retrySet.scaffoldQuestionId]?.difficulty);
    expect(["hard", "challenge"]).toContain(
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
      recommendation.retryCycle,
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
});

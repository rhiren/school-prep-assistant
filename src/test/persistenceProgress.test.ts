import { describe, expect, it } from "vitest";
import { BasicScoringEngine } from "../engines/basicScoringEngine";
import { DeterministicConceptTestEngine } from "../engines/deterministicConceptTestEngine";
import { StableSelectionStrategy } from "../engines/questionSelectionStrategy";
import { createDefaultContentRepository } from "../services/contentRepository";
import { LocalProgressService } from "../services/progressService";
import { LocalSessionService } from "../services/sessionService";
import type { TestAttempt } from "../domain/models";
import { MemoryStorageService } from "../storage/memoryStorageService";
import {
  AttemptRepository,
  ProgressRepository,
  SessionRepository,
} from "../storage/repositories";

describe("session persistence and progress", () => {
  it("stores current index and preserves multiple attempts per concept", async () => {
    const repository = await createDefaultContentRepository();
    const store = new MemoryStorageService();
    const sessionRepository = new SessionRepository(store);
    const attemptRepository = new AttemptRepository(store);
    const progressRepository = new ProgressRepository(store);
    const progressService = new LocalProgressService(
      repository,
      attemptRepository,
      progressRepository,
    );
    const scoringService = new BasicScoringEngine(repository);
    const sessionService = new LocalSessionService(
      sessionRepository,
      attemptRepository,
      scoringService,
      progressService,
    );
    const generator = new DeterministicConceptTestEngine(
      repository,
      sessionRepository,
      new StableSelectionStrategy(),
    );

    const firstSession = await generator.createConceptSession("concept-unit-rates");
    await sessionService.setCurrentQuestionIndex(firstSession.id, 2);
    await sessionService.saveAnswer(firstSession.id, {
      questionId: "concept-unit-rates-core-001",
      response: "9",
      answeredAt: "2026-04-12T12:00:00.000Z",
    });

    expect((await sessionService.getSession(firstSession.id))?.currentQuestionIndex).toBe(2);

    const firstAttempt = await sessionService.submitSession(firstSession.id);
    const secondSession = await generator.createConceptSession("concept-unit-rates");
    const questions = await repository.getQuestionsForConcept("concept-unit-rates");
    for (const question of questions) {
      await sessionService.saveAnswer(secondSession.id, {
        questionId: question.id,
        response: question.correctAnswer,
        answeredAt: "2026-04-12T12:10:00.000Z",
      });
    }
    const secondAttempt = await sessionService.submitSession(secondSession.id);

    const attempts = await progressService.getConceptAttempts("concept-unit-rates");
    const progress = await progressService.getConceptProgress("concept-unit-rates");

    expect(firstAttempt.attemptId).not.toBe(secondAttempt.attemptId);
    expect(firstAttempt.durationSignal?.startedAt).toBe(firstSession.createdAt);
    expect(typeof firstAttempt.durationSignal?.durationMs).toBe("number");
    expect(secondAttempt.durationSignal?.startedAt).toBe(secondSession.createdAt);
    expect(typeof secondAttempt.durationSignal?.durationMs).toBe("number");
    expect(attempts).toHaveLength(2);
    expect(progress?.attemptCount).toBe(2);
    expect(progress?.bestScore).toBe(100);
    expect(progress?.latestScore).toBe(100);
    expect(progress?.masteryStatus).toBe("mastered");
  });

  it("repairs persisted multiple-choice attempts that were scored incorrectly", async () => {
    const repository = await createDefaultContentRepository();
    const store = new MemoryStorageService();
    const sessionRepository = new SessionRepository(store);
    const attemptRepository = new AttemptRepository(store);
    const progressRepository = new ProgressRepository(store);
    const progressService = new LocalProgressService(
      repository,
      attemptRepository,
      progressRepository,
    );

    const attempt: TestAttempt = {
      attemptId: "attempt-stale",
      studentId: "student-1",
      sessionId: "session-stale",
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: [
        "concept-unit-rates-core-010",
        "concept-unit-rates-core-021",
      ],
      answers: {
        "concept-unit-rates-core-010": {
          questionId: "concept-unit-rates-core-010",
          response: "Divide 14 by 7",
          answeredAt: "2026-04-25T18:50:56.849Z",
        },
        "concept-unit-rates-core-021": {
          questionId: "concept-unit-rates-core-021",
          response: "Store B",
          answeredAt: "2026-04-25T18:57:46.803Z",
        },
      },
      results: [
        {
          questionId: "concept-unit-rates-core-010",
          isCorrect: false,
          submittedAnswer: "Divide 14 by 7",
          correctAnswer: "Divide 14 by 7",
          feedbackTip: null,
        },
        {
          questionId: "concept-unit-rates-core-021",
          isCorrect: false,
          submittedAnswer: "Store B",
          correctAnswer: "Store B",
          feedbackTip: null,
        },
      ],
      summary: {
        totalQuestions: 2,
        correctCount: 0,
        incorrectCount: 2,
        unansweredCount: 0,
        percentage: 0,
      },
      submittedAt: "2026-04-25T19:21:40.170Z",
    };

    await attemptRepository.append(attempt);

    const repairedAttempt = await progressService.getAttempt(attempt.attemptId);
    const progress = await progressService.getConceptProgress("concept-unit-rates");

    expect(repairedAttempt?.summary.percentage).toBe(100);
    expect(repairedAttempt?.results.every((result) => result.isCorrect)).toBe(true);
    expect(progress?.latestScore).toBe(100);
    expect(progress?.attemptCount).toBe(1);
  });
});

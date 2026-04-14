import { describe, expect, it } from "vitest";
import { BasicScoringEngine } from "../engines/basicScoringEngine";
import { DeterministicConceptTestEngine } from "../engines/deterministicConceptTestEngine";
import { StableSelectionStrategy } from "../engines/questionSelectionStrategy";
import { createDefaultContentRepository } from "../services/contentRepository";
import { LocalProgressService } from "../services/progressService";
import { LocalSessionService } from "../services/sessionService";
import { MemoryStorageService } from "../storage/memoryStorageService";
import {
  AttemptRepository,
  ProgressRepository,
  SessionRepository,
} from "../storage/repositories";

describe("session persistence and progress", () => {
  it("stores current index and preserves multiple attempts per concept", async () => {
    const repository = createDefaultContentRepository();
    const store = new MemoryStorageService();
    const sessionRepository = new SessionRepository(store);
    const attemptRepository = new AttemptRepository(store);
    const progressRepository = new ProgressRepository(store);
    const progressService = new LocalProgressService(attemptRepository, progressRepository);
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
    expect(attempts).toHaveLength(2);
    expect(progress?.attemptCount).toBe(2);
    expect(progress?.bestScore).toBe(78);
    expect(progress?.latestScore).toBe(78);
    expect(progress?.masteryStatus).toBe("needs_review");
  });
});

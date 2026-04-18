import { describe, expect, it } from "vitest";
import { BasicScoringEngine } from "../engines/basicScoringEngine";
import { DeterministicConceptTestEngine } from "../engines/deterministicConceptTestEngine";
import { StableSelectionStrategy } from "../engines/questionSelectionStrategy";
import { createDefaultContentRepository } from "../services/contentRepository";
import { LocalProgressService } from "../services/progressService";
import { LocalSessionService } from "../services/sessionService";
import { LocalStudentProfileService } from "../services/studentProfileService";
import { MemoryStorageService } from "../storage/memoryStorageService";
import {
  AttemptRepository,
  ProgressRepository,
  SessionRepository,
  StudentProfileRepository,
} from "../storage/repositories";

describe("student profiles", () => {
  it("keeps progress isolated per active student", async () => {
    const contentRepository = await createDefaultContentRepository();
    const store = new MemoryStorageService();
    const studentProfileService = new LocalStudentProfileService(
      new StudentProfileRepository(store),
    );
    const sessionRepository = new SessionRepository(store, studentProfileService);
    const attemptRepository = new AttemptRepository(store, studentProfileService);
    const progressRepository = new ProgressRepository(store, studentProfileService);
    const progressService = new LocalProgressService(attemptRepository, progressRepository);
    const sessionService = new LocalSessionService(
      sessionRepository,
      attemptRepository,
      new BasicScoringEngine(contentRepository),
      progressService,
    );
    const generator = new DeterministicConceptTestEngine(
      contentRepository,
      sessionRepository,
      new StableSelectionStrategy(),
      studentProfileService,
    );

    const secondStudent = await studentProfileService.createProfile("Student 2", "7");

    const firstSession = await generator.createConceptSession("concept-unit-rates");
    const firstQuestionIds = firstSession.questionIds.slice(0, 3);
    for (const questionId of firstQuestionIds) {
      const question = await contentRepository.getQuestionById(questionId);
      await sessionService.saveAnswer(firstSession.id, {
        questionId,
        response: question?.correctAnswer ?? "",
        answeredAt: "2026-04-17T07:00:00.000Z",
      });
    }
    await sessionService.submitSession(firstSession.id);

    await studentProfileService.setActiveStudent(secondStudent.studentId);
    expect(await progressService.getProgress()).toEqual([]);

    const secondSession = await generator.createConceptSession("concept-unit-rates");
    await sessionService.saveAnswer(secondSession.id, {
      questionId: secondSession.questionIds[0] ?? "",
      response: "wrong",
      answeredAt: "2026-04-17T08:00:00.000Z",
    });
    await sessionService.submitSession(secondSession.id);

    const secondStudentProgress = await progressService.getConceptProgress("concept-unit-rates");
    expect(secondStudentProgress?.attemptCount).toBe(1);

    await studentProfileService.setActiveStudent("student-1");
    const firstStudentProgress = await progressService.getConceptProgress("concept-unit-rates");
    expect(firstStudentProgress?.attemptCount).toBe(1);
    expect(firstStudentProgress?.latestScore).not.toBe(secondStudentProgress?.latestScore);
  });
});

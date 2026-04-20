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
  it("supports home grade and accelerated instructional placement independently", async () => {
    const store = new MemoryStorageService();
    const studentProfileService = new LocalStudentProfileService(
      new StudentProfileRepository(store),
    );

    const profile = await studentProfileService.createProfile("Student 2", "6", {
      overall: {
        instructionalGrade: "7",
        programPathway: "accelerated",
      },
      subjects: {
        math: {
          instructionalGrade: "7",
          programPathway: "accelerated",
        },
      },
    });

    expect(profile.homeGrade).toBe("6");
    expect(profile.placementProfile?.overall?.instructionalGrade).toBe("7");
    expect(profile.placementProfile?.overall?.programPathway).toBe("accelerated");
    expect(profile.placementProfile?.subjects?.math?.instructionalGrade).toBe("7");
    expect(profile.profileType).toBe("production");
  });

  it("supports test profiles with per-student feature flags", async () => {
    const store = new MemoryStorageService();
    const studentProfileService = new LocalStudentProfileService(
      new StudentProfileRepository(store),
    );

    const profile = await studentProfileService.createProfile("Test Student", "6", undefined, {
      profileType: "test",
      featureFlags: {
        smartRetry: true,
      },
    });

    expect(profile.profileType).toBe("test");
    expect(profile.featureFlags).toEqual({ smartRetry: true });
    expect(await studentProfileService.isFeatureEnabled(profile.studentId, "smartRetry")).toBe(true);
    expect(await studentProfileService.isFeatureEnabled(profile.studentId, "recommendedNext")).toBe(false);
  });

  it("allows deleting test profiles without allowing production profile deletion", async () => {
    const store = new MemoryStorageService();
    const studentProfileService = new LocalStudentProfileService(
      new StudentProfileRepository(store),
      store,
    );

    const testProfile = await studentProfileService.createProfile("Test Student", "6", undefined, {
      profileType: "test",
    });

    await expect(studentProfileService.deleteTestProfile("student-1")).rejects.toThrow(
      "Only test student profiles can be deleted.",
    );

    await studentProfileService.deleteTestProfile(testProfile.studentId);

    expect((await studentProfileService.listProfiles()).map((profile) => profile.studentId)).toEqual([
      "student-1",
    ]);
  });

  it("allows converting a production profile into a test profile for safe rollout", async () => {
    const store = new MemoryStorageService();
    const studentProfileService = new LocalStudentProfileService(
      new StudentProfileRepository(store),
      store,
    );

    const productionProfile = await studentProfileService.createProfile("test1", "6");
    const convertedProfile = await studentProfileService.convertProfileToTest(
      productionProfile.studentId,
    );

    expect(convertedProfile.profileType).toBe("test");
    expect((await studentProfileService.listProfiles()).find(
      (profile) => profile.studentId === productionProfile.studentId,
    )?.profileType).toBe("test");
  });

  it("allows smart retry flag changes only for test profiles", async () => {
    const store = new MemoryStorageService();
    const studentProfileService = new LocalStudentProfileService(
      new StudentProfileRepository(store),
      store,
    );

    const testProfile = await studentProfileService.createProfile("Test Student", "6", undefined, {
      profileType: "test",
    });
    await expect(
      studentProfileService.setTestProfileFeatureFlag("student-1", "smartRetry", true),
    ).rejects.toThrow("Only test student profiles can change feature flags.");

    const updatedProfile = await studentProfileService.setTestProfileFeatureFlag(
      testProfile.studentId,
      "smartRetry",
      true,
    );

    expect(updatedProfile.featureFlags).toEqual({ smartRetry: true });
    expect(await studentProfileService.isFeatureEnabled(testProfile.studentId, "smartRetry")).toBe(true);
  });

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

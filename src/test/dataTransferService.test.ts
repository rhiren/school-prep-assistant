import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../app/version";
import type { ProgressRecord, TestAttempt, TestSession } from "../domain/models";
import { createDefaultContentRepository } from "../services/contentRepository";
import { DataTransferService } from "../services/dataTransferService";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";
import { getStudentScopedKey, STORE_NAMES } from "../storage/repositories";
import { MemoryStorageService } from "../storage/memoryStorageService";

describe("DataTransferService", () => {
  it("exports stored progress data as a snapshot", async () => {
    const storage = new MemoryStorageService();
    const service = new DataTransferService(storage);
    const session: TestSession = {
      id: "session-1",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-ratios",
      conceptIds: ["concept-ratios"],
      questionIds: ["q1"],
      answers: {},
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
    };

    await storage.set(
      STORE_NAMES.sessions,
      getStudentScopedKey(DEFAULT_STUDENT_ID, session.id),
      session,
    );

    const snapshot = await service.exportProgress();

    expect(snapshot.appVersion).toBe(APP_VERSION);
    expect(snapshot.student).toEqual({
      studentId: DEFAULT_STUDENT_ID,
      displayName: "Student 1",
      gradeLevel: undefined,
      homeGrade: undefined,
      placementProfile: undefined,
      profileType: "production",
      featureFlags: undefined,
    });
    expect(snapshot.data.sessions).toEqual([session]);
    expect(snapshot.data.attempts).toEqual([]);
    expect(snapshot.data.progress).toEqual([]);
  });

  it("imports validated snapshot data and replaces existing records", async () => {
    const storage = new MemoryStorageService();
    const service = new DataTransferService(storage);
    await storage.set(STORE_NAMES.sessions, getStudentScopedKey(DEFAULT_STUDENT_ID, "old"), {
      id: "old",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-ratios",
      conceptIds: ["concept-ratios"],
      questionIds: [],
      answers: {},
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
    } satisfies TestSession);

    const attempt: TestAttempt = {
      attemptId: "attempt-1",
      studentId: DEFAULT_STUDENT_ID,
      sessionId: "session-1",
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-ratios",
      conceptIds: ["concept-ratios"],
      questionIds: ["q1"],
      answers: {},
      results: [],
      summary: {
        totalQuestions: 1,
        correctCount: 1,
        incorrectCount: 0,
        unansweredCount: 0,
        percentage: 100,
      },
      submittedAt: "2026-04-12T00:00:00.000Z",
    };
    const progress: ProgressRecord = {
      studentId: DEFAULT_STUDENT_ID,
      conceptId: "concept-ratios",
      courseId: "course-2",
      attemptCount: 1,
      latestScore: 100,
      bestScore: 100,
      masteryStatus: "mastered",
      lastAttemptedAt: "2026-04-12T00:00:00.000Z",
      lastModified: "2026-04-12T00:00:00.000Z",
    };
    const snapshot = {
      appVersion: APP_VERSION,
      exportedAt: "2026-04-12T00:00:00.000Z",
      data: {
        sessions: [
          {
            id: "session-1",
            studentId: DEFAULT_STUDENT_ID,
            mode: "concept",
            courseId: "course-2",
            conceptId: "concept-ratios",
            conceptIds: ["concept-ratios"],
            questionIds: ["q1"],
            answers: {},
            currentQuestionIndex: 0,
            status: "in_progress",
            createdAt: "2026-04-12T00:00:00.000Z",
            updatedAt: "2026-04-12T00:00:00.000Z",
          } satisfies TestSession,
        ],
        attempts: [attempt],
        progress: [progress],
      },
    };

    await service.importProgress(snapshot);

    expect(await storage.getAll<TestSession>(STORE_NAMES.sessions)).toEqual(snapshot.data.sessions);
    expect(await storage.getAll<TestAttempt>(STORE_NAMES.attempts)).toEqual([attempt]);
    expect(await storage.getAll<ProgressRecord>(STORE_NAMES.progress)).toEqual([progress]);
    expect(await storage.getVersion()).toBe(APP_VERSION);
  });

  it("accepts legacy gradeLevel metadata and normalizes it to homeGrade", async () => {
    const storage = new MemoryStorageService();
    const service = new DataTransferService(storage);

    const snapshot = await service.importProgress({
      appVersion: APP_VERSION,
      exportedAt: "2026-04-12T00:00:00.000Z",
      student: {
        studentId: DEFAULT_STUDENT_ID,
        displayName: "Student 1",
        gradeLevel: "6",
      },
      data: {
        sessions: [],
        attempts: [],
        progress: [],
      },
    });

    expect(snapshot.student).toEqual({
      studentId: DEFAULT_STUDENT_ID,
      displayName: "Student 1",
      gradeLevel: "6",
      homeGrade: "6",
      profileType: "production",
    });
  });

  it("preserves test profile release metadata in exported snapshots", async () => {
    const storage = new MemoryStorageService();
    const service = new DataTransferService(storage, {
      getActiveProfile: async () => ({
        studentId: "student-test",
        displayName: "Test Student",
        homeGrade: "6",
        profileType: "test",
        featureFlags: {
          smartRetry: true,
        },
        createdAt: "2026-04-12T00:00:00.000Z",
        lastActiveAt: "2026-04-12T00:00:00.000Z",
        isActive: true,
      }),
      getActiveStudentId: async () => "student-test",
    });

    const snapshot = await service.exportProgress();

    expect(snapshot.student).toMatchObject({
      studentId: "student-test",
      profileType: "test",
      featureFlags: {
        smartRetry: true,
      },
    });
  });

  it("repairs stale multiple-choice attempt scoring while exporting snapshots", async () => {
    const storage = new MemoryStorageService();
    const repository = await createDefaultContentRepository();
    const service = new DataTransferService(storage, undefined, repository);

    await storage.set(
      STORE_NAMES.attempts,
      getStudentScopedKey(DEFAULT_STUDENT_ID, "attempt-stale"),
      {
        attemptId: "attempt-stale",
        studentId: DEFAULT_STUDENT_ID,
        sessionId: "session-1",
        mode: "concept",
        courseId: "course-2",
        conceptId: "concept-unit-rates",
        conceptIds: ["concept-unit-rates"],
        questionIds: ["concept-unit-rates-core-010"],
        answers: {
          "concept-unit-rates-core-010": {
            questionId: "concept-unit-rates-core-010",
            response: "Divide 14 by 7",
            answeredAt: "2026-04-25T18:50:56.849Z",
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
        ],
        summary: {
          totalQuestions: 1,
          correctCount: 0,
          incorrectCount: 1,
          unansweredCount: 0,
          percentage: 0,
        },
        submittedAt: "2026-04-25T19:21:40.170Z",
      } satisfies TestAttempt,
    );

    const snapshot = await service.exportProgress();

    expect(snapshot.data.attempts[0]?.summary.percentage).toBe(100);
    expect(snapshot.data.attempts[0]?.results[0]?.isCorrect).toBe(true);
    expect(snapshot.data.progress[0]?.latestScore).toBe(100);
  });
});

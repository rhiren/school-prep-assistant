import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../app/version";
import type { ProgressRecord, TestAttempt, TestSession } from "../domain/models";
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
});

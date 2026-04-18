import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { APP_VERSION } from "../app/version";
import type { ProgressRecord, TestAttempt, TestSession } from "../domain/models";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";
import { IndexedDBStorageService } from "../storage/indexedDbStorageService";
import { getStudentScopedKey, STORE_NAMES } from "../storage/repositories";

const LEGACY_KEYS = {
  sessions: "math-prep:sessions:v1",
  attempts: "math-prep:attempts:v1",
  progress: "math-prep:progress:v1",
} as const;

describe("IndexedDBStorageService", () => {
  let storage: IndexedDBStorageService | null = null;

  beforeEach(async () => {
    if (storage) {
      storage.close();
      storage = null;
    }
    await deleteDB("math-prep-assistant");
    window.localStorage.clear();
  });

  afterEach(async () => {
    if (storage) {
      storage.close();
      storage = null;
    }
    await deleteDB("math-prep-assistant");
  });

  it("reads and writes records by object store", async () => {
    storage = await IndexedDBStorageService.create();
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

    expect(
      await storage.get<TestSession>(
        STORE_NAMES.sessions,
        getStudentScopedKey(DEFAULT_STUDENT_ID, "session-1"),
      ),
    ).toEqual(session);
    expect(await storage.getAll<TestSession>(STORE_NAMES.sessions)).toHaveLength(1);
  });

  it("stores and retrieves app version in meta", async () => {
    storage = await IndexedDBStorageService.create();

    expect(await storage.getVersion()).toBe(APP_VERSION);
    await storage.setVersion("9.9.9");
    expect(await storage.getVersion()).toBe("9.9.9");
  });

  it("migrates existing localStorage data on first load", async () => {
    const session: TestSession = {
      id: "session-legacy",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-ratios",
      conceptIds: ["concept-ratios"],
      questionIds: ["q1"],
      answers: {},
      currentQuestionIndex: 1,
      status: "in_progress",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
    };
    const attempt: TestAttempt = {
      attemptId: "attempt-legacy",
      studentId: DEFAULT_STUDENT_ID,
      sessionId: "session-legacy",
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

    window.localStorage.setItem(LEGACY_KEYS.sessions, JSON.stringify({ [session.id]: session }));
    window.localStorage.setItem(LEGACY_KEYS.attempts, JSON.stringify([attempt]));
    window.localStorage.setItem(LEGACY_KEYS.progress, JSON.stringify({ [progress.conceptId]: progress }));

    storage = await IndexedDBStorageService.create();

    expect(
      await storage.get<TestSession>(
        STORE_NAMES.sessions,
        getStudentScopedKey(DEFAULT_STUDENT_ID, session.id),
      ),
    ).toEqual(session);
    expect(
      await storage.get<TestAttempt>(
        STORE_NAMES.attempts,
        getStudentScopedKey(DEFAULT_STUDENT_ID, attempt.attemptId),
      ),
    ).toEqual(attempt);
    expect(
      await storage.get<ProgressRecord>(
        STORE_NAMES.progress,
        getStudentScopedKey(DEFAULT_STUDENT_ID, progress.conceptId),
      ),
    ).toEqual(progress);
    expect(window.localStorage.getItem(LEGACY_KEYS.sessions)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_KEYS.attempts)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_KEYS.progress)).toBeNull();
  });

  it("normalizes legacy concept ids during startup migration", async () => {
    const legacySession: TestSession = {
      id: "session-unit-rate",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rate",
      conceptIds: ["concept-unit-rate"],
      questionIds: ["course-2-unit-rate-001"],
      answers: {},
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
    };
    const legacyAttempt: TestAttempt = {
      attemptId: "attempt-unit-rate",
      studentId: DEFAULT_STUDENT_ID,
      sessionId: "session-unit-rate",
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rate",
      conceptIds: ["concept-unit-rate"],
      questionIds: ["course-2-unit-rate-001"],
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
    const legacyProgress: ProgressRecord = {
      studentId: DEFAULT_STUDENT_ID,
      conceptId: "concept-unit-rate",
      courseId: "course-2",
      attemptCount: 1,
      latestScore: 100,
      bestScore: 100,
      masteryStatus: "mastered",
      lastAttemptedAt: "2026-04-12T00:00:00.000Z",
      lastModified: "2026-04-12T00:00:00.000Z",
    };

    storage = await IndexedDBStorageService.create();
    await storage.set(
      STORE_NAMES.sessions,
      getStudentScopedKey(DEFAULT_STUDENT_ID, legacySession.id),
      legacySession,
    );
    await storage.set(
      STORE_NAMES.attempts,
      getStudentScopedKey(DEFAULT_STUDENT_ID, legacyAttempt.attemptId),
      legacyAttempt,
    );
    await storage.set(
      STORE_NAMES.progress,
      getStudentScopedKey(DEFAULT_STUDENT_ID, legacyProgress.conceptId),
      legacyProgress,
    );
    storage.close();

    storage = await IndexedDBStorageService.create();

    expect(
      await storage.get<TestSession>(
        STORE_NAMES.sessions,
        getStudentScopedKey(DEFAULT_STUDENT_ID, legacySession.id),
      ),
    ).toMatchObject({
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
    });
    expect(
      await storage.get<TestAttempt>(
        STORE_NAMES.attempts,
        getStudentScopedKey(DEFAULT_STUDENT_ID, legacyAttempt.attemptId),
      ),
    ).toMatchObject({
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
    });
    expect(
      await storage.get<ProgressRecord>(
        STORE_NAMES.progress,
        getStudentScopedKey(DEFAULT_STUDENT_ID, "concept-unit-rate"),
      ),
    ).toBeNull();
    expect(
      await storage.get<ProgressRecord>(
        STORE_NAMES.progress,
        getStudentScopedKey(DEFAULT_STUDENT_ID, "concept-unit-rates"),
      ),
    ).toMatchObject({
      conceptId: "concept-unit-rates",
    });
  });
});

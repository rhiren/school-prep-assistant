import { describe, expect, it, vi } from "vitest";
import {
  DataTransferService,
  getProgressSnapshotLastModified,
  type ProgressSnapshot,
} from "../services/dataTransferService";
import {
  ProgressSyncManager,
  SyncingSessionService,
  SyncingProgressService,
  type ProgressSyncClient,
} from "../services/firebaseProgressSync";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";
import type { ProgressService, SessionService } from "../services/contracts";
import type { AnswerRecord, ProgressRecord, TestAttempt, TestSession } from "../domain/models";
import { MemoryStorageService } from "../storage/memoryStorageService";
import { STORE_NAMES } from "../storage/repositories";

function buildSnapshot(exportedAt: string, score: number): ProgressSnapshot {
  return {
    appVersion: "1.0.1",
    exportedAt,
    data: {
      sessions: [],
      attempts: [],
      progress: [
        {
          studentId: DEFAULT_STUDENT_ID,
          conceptId: "concept-ratios",
          courseId: "course-2",
          attemptCount: 1,
          latestScore: score,
          bestScore: score,
          masteryStatus: score >= 85 ? "mastered" : "needs_review",
          lastAttemptedAt: exportedAt,
          lastModified: exportedAt,
        },
      ],
    },
  };
}

function buildInProgressSnapshot(
  updatedAt: string,
  answeredResponses: string[],
): ProgressSnapshot {
  const answers = Object.fromEntries(
    answeredResponses.map((response, index) => [
      `question-${index + 1}`,
      {
        questionId: `question-${index + 1}`,
        response,
        answeredAt: updatedAt,
      },
    ]),
  );

  return {
    appVersion: "1.0.1",
    exportedAt: updatedAt,
    data: {
      sessions: [
        {
          id: `session-${updatedAt}`,
          studentId: DEFAULT_STUDENT_ID,
          mode: "concept",
          courseId: "course-2",
          conceptId: "concept-ratios",
          conceptIds: ["concept-ratios"],
          questionIds: Array.from({ length: 50 }, (_, index) => `question-${index + 1}`),
          answers,
          currentQuestionIndex: answeredResponses.length,
          status: "in_progress",
          createdAt: updatedAt,
          updatedAt,
        } satisfies TestSession,
      ],
      attempts: [],
      progress: [],
    },
  };
}

class FakeProgressSyncClient implements ProgressSyncClient {
  public savedSnapshots: ProgressSnapshot[] = [];

  constructor(
    private readonly options: {
      ready?: boolean;
      cloudSnapshot?: ProgressSnapshot | null;
      throwOnLoad?: boolean;
      throwOnSave?: boolean;
    } = {},
  ) {}

  isReady(): boolean {
    return this.options.ready ?? true;
  }

  async saveProgressToCloud(_userId: string, progressData: ProgressSnapshot): Promise<void> {
    if (this.options.throwOnSave) {
      throw new Error("save failed");
    }

    this.savedSnapshots.push(progressData);
  }

  async loadProgressFromCloud(_userId: string) {
    if (this.options.throwOnLoad) {
      throw new Error("load failed");
    }

    if (!this.options.cloudSnapshot) {
      return null;
    }

    return {
      appVersion: this.options.cloudSnapshot.appVersion,
      lastModified: getProgressSnapshotLastModified(this.options.cloudSnapshot),
      syncedAt: this.options.cloudSnapshot.exportedAt,
      snapshot: this.options.cloudSnapshot,
    };
  }
}

describe("ProgressSyncManager", () => {
  it("prefers newer cloud progress on startup", async () => {
    const storage = new MemoryStorageService();
    const dataTransferService = new DataTransferService(storage);
    const localSnapshot = buildSnapshot("2026-04-12T10:00:00.000Z", 70);
    const cloudSnapshot = buildSnapshot("2026-04-12T12:00:00.000Z", 95);

    await dataTransferService.importProgress(localSnapshot);

    const manager = new ProgressSyncManager(
      new FakeProgressSyncClient({ cloudSnapshot }),
      dataTransferService,
      async () => DEFAULT_STUDENT_ID,
    );

    await manager.initialize();

    const progress = await storage.getAll<ProgressRecord>(STORE_NAMES.progress);
    expect(progress[0]?.latestScore).toBe(95);
    expect(manager.getStatus()).toBe("synced");
  });

  it("falls back to offline local mode when cloud sync fails", async () => {
    const storage = new MemoryStorageService();
    const dataTransferService = new DataTransferService(storage);
    await dataTransferService.importProgress(buildSnapshot("2026-04-12T10:00:00.000Z", 70));

    const manager = new ProgressSyncManager(
      new FakeProgressSyncClient({ throwOnLoad: true }),
      dataTransferService,
      async () => DEFAULT_STUDENT_ID,
    );

    await manager.initialize();

    const progress = await storage.getAll<ProgressRecord>(STORE_NAMES.progress);
    expect(progress[0]?.latestScore).toBe(70);
    expect(manager.getStatus()).toBe("offline");
  });

  it("prefers richer cloud in-progress work over a newer empty local session", async () => {
    const storage = new MemoryStorageService();
    const dataTransferService = new DataTransferService(storage);
    const localSnapshot = buildInProgressSnapshot("2026-04-23T08:00:00.000Z", []);
    const cloudSnapshot = buildInProgressSnapshot("2026-04-20T01:00:20.704Z", [
      "3/5",
      "4/11",
      "2/3",
    ]);

    await dataTransferService.importProgress(localSnapshot);

    const manager = new ProgressSyncManager(
      new FakeProgressSyncClient({ cloudSnapshot }),
      dataTransferService,
      async () => DEFAULT_STUDENT_ID,
    );

    await manager.initialize();

    const sessions = await storage.getAll<TestSession>(STORE_NAMES.sessions);
    const restoredSession = sessions[0];

    expect(restoredSession).toBeDefined();
    expect(Object.keys(restoredSession?.answers ?? {})).toHaveLength(3);
    expect(restoredSession?.currentQuestionIndex).toBe(3);
    expect(manager.getStatus()).toBe("synced");
  });
});

describe("SyncingProgressService", () => {
  it("keeps local updates and triggers background sync", async () => {
    const updateFromAttempt = vi.fn<ProgressService["updateFromAttempt"]>().mockResolvedValue();
    const delegate: ProgressService = {
      getProgress: vi.fn().mockResolvedValue([]),
      getConceptProgress: vi.fn().mockResolvedValue(null),
      getConceptAttempts: vi.fn().mockResolvedValue([]),
      getAttempt: vi.fn().mockResolvedValue(null),
      updateFromAttempt,
    };

    const storage = new MemoryStorageService();
    const dataTransferService = new DataTransferService(storage);
    await dataTransferService.importProgress(buildSnapshot("2026-04-12T10:00:00.000Z", 70));

    const client = new FakeProgressSyncClient();
    const manager = new ProgressSyncManager(client, dataTransferService, async () => DEFAULT_STUDENT_ID);
    const service = new SyncingProgressService(delegate, manager);

    const attempt = {
      attemptId: "attempt-1",
      studentId: DEFAULT_STUDENT_ID,
      sessionId: "session-1",
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-ratios",
      conceptIds: ["concept-ratios"],
      questionIds: [],
      answers: {},
      results: [],
      summary: {
        totalQuestions: 1,
        correctCount: 1,
        incorrectCount: 0,
        unansweredCount: 0,
        percentage: 100,
      },
      submittedAt: "2026-04-12T12:00:00.000Z",
    } satisfies TestAttempt;

    await service.updateFromAttempt(attempt);
    await manager.waitForIdle();

    expect(updateFromAttempt).toHaveBeenCalledWith(attempt);
    expect(client.savedSnapshots).toHaveLength(1);
  });
});

describe("SyncingSessionService", () => {
  it("triggers background sync when answers are saved", async () => {
    const saveAnswer = vi.fn<SessionService["saveAnswer"]>().mockResolvedValue();
    const delegate: SessionService = {
      getSession: vi.fn().mockResolvedValue(null),
      getLatestInProgressSession: vi.fn().mockResolvedValue(null),
      saveAnswer,
      setCurrentQuestionIndex: vi.fn().mockResolvedValue(undefined),
      submitSession: vi.fn<SessionService["submitSession"]>(),
    };

    const syncInBackground = vi.fn();
    const service = new SyncingSessionService(
      delegate,
      { syncInBackground } as unknown as ProgressSyncManager,
    );

    const answer: AnswerRecord = {
      questionId: "question-1",
      response: "42",
      answeredAt: "2026-04-12T12:00:00.000Z",
    };

    await service.saveAnswer("session-1", answer);

    expect(saveAnswer).toHaveBeenCalledWith("session-1", answer);
    expect(syncInBackground).toHaveBeenCalledTimes(1);
  });
});

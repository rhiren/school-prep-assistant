import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressSnapshot } from "../services/dataTransferService";

const {
  deleteFieldMock,
  docMock,
  getDocMock,
  serverTimestampMock,
  setDocMock,
} = vi.hoisted(() => ({
  deleteFieldMock: vi.fn(() => "__DELETE_FIELD__"),
  docMock: vi.fn(() => ({ path: "students/student-1/progress/current" })),
  getDocMock: vi.fn(),
  serverTimestampMock: vi.fn(() => "__SERVER_TIMESTAMP__"),
  setDocMock: vi.fn(),
}));

vi.mock("../services/firebase", () => ({
  db: null,
}));

vi.mock("firebase/firestore", () => ({
  deleteField: () => deleteFieldMock(),
  doc: docMock,
  getDoc: getDocMock,
  serverTimestamp: () => serverTimestampMock(),
  setDoc: setDocMock,
}));

import { FirestoreProgressSyncClient } from "../services/firebaseProgressSync";

function buildSnapshot(): ProgressSnapshot {
  return {
    appVersion: "1.0.1",
    exportedAt: "2026-04-19T18:00:00.000Z",
    student: {
      studentId: "student-1",
      displayName: "Student 1",
      gradeLevel: undefined,
    },
    data: {
      sessions: [
        {
          id: "session-1",
          studentId: "student-1",
          mode: "concept",
          courseId: "course-2",
          conceptId: "concept-ratios",
          testSetId: undefined,
          conceptIds: ["concept-ratios"],
          questionIds: ["question-1"],
          answers: {
            "question-1": {
              questionId: "question-1",
              response: "42",
              answeredAt: "2026-04-19T18:01:00.000Z",
            },
          },
          currentQuestionIndex: 0,
          status: "in_progress",
          createdAt: "2026-04-19T18:00:00.000Z",
          updatedAt: "2026-04-19T18:01:00.000Z",
        },
      ],
      attempts: [],
      progress: [],
    },
  };
}

describe("FirestoreProgressSyncClient", () => {
  beforeEach(() => {
    deleteFieldMock.mockClear();
    docMock.mockClear();
    getDocMock.mockReset();
    serverTimestampMock.mockClear();
    setDocMock.mockReset();
  });

  it("ignores invalid cloud documents instead of treating them as fatal", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        serverUpdatedAt: "2026-04-19T18:00:00.000Z",
      }),
    });

    const client = new FirestoreProgressSyncClient({} as never);

    await expect(client.loadProgressFromCloud("student-1")).resolves.toBeNull();
  });

  it("removes stale debug payloads while writing real progress snapshots", async () => {
    const client = new FirestoreProgressSyncClient({} as never);
    const snapshot = buildSnapshot();

    await client.saveProgressToCloud("student-1", snapshot);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(setDocMock).toHaveBeenCalledWith(
      { path: "students/student-1/progress/current" },
      expect.objectContaining({
        appVersion: snapshot.appVersion,
        debugCliWrite: "__DELETE_FIELD__",
        snapshot: expect.objectContaining({
          appVersion: snapshot.appVersion,
          student: {
            studentId: "student-1",
            displayName: "Student 1",
          },
        }),
        serverUpdatedAt: "__SERVER_TIMESTAMP__",
      }),
      { merge: true },
    );

    const writtenSnapshot = setDocMock.mock.calls[0]?.[1]?.snapshot as ProgressSnapshot;
    expect(writtenSnapshot.student).not.toHaveProperty("gradeLevel");
    expect(writtenSnapshot.data.sessions[0]).not.toHaveProperty("testSetId");
  });
});

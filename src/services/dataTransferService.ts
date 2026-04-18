import { APP_VERSION } from "../app/version";
import type { ProgressRecord, TestAttempt, TestSession } from "../domain/models";
import type { StudentProfileService } from "./contracts";
import { getStudentScopedKey, STORE_NAMES } from "../storage/repositories";
import type { StorageService } from "../storage/storageService";

export interface ProgressSnapshot {
  appVersion: string;
  exportedAt: string;
  student?: {
    studentId: string;
    displayName: string;
    gradeLevel?: string;
  };
  data: {
    sessions: TestSession[];
    attempts: TestAttempt[];
    progress: ProgressRecord[];
  };
}

function getLatestIsoTimestamp(values: Array<string | null | undefined>): string {
  const timestamps = values
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return new Date(0).toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSession(value: unknown): value is TestSession {
  return isObject(value) && typeof value.id === "string" && typeof value.status === "string";
}

function isAttempt(value: unknown): value is TestAttempt {
  return isObject(value) && typeof value.attemptId === "string" && isObject(value.summary);
}

function isProgress(value: unknown): value is ProgressRecord {
  return isObject(value) && typeof value.conceptId === "string" && typeof value.courseId === "string";
}

function isStudentSummary(
  value: unknown,
): value is { studentId: string; displayName: string; gradeLevel?: string } {
  return (
    isObject(value) &&
    typeof value.studentId === "string" &&
    typeof value.displayName === "string" &&
    (typeof value.gradeLevel === "undefined" || typeof value.gradeLevel === "string")
  );
}

export function validateProgressSnapshot(value: unknown): ProgressSnapshot {
  if (!isObject(value)) {
    throw new Error("Import file must contain an object.");
  }

  const appVersion = value.appVersion;
  const exportedAt = value.exportedAt;
  const student = value.student;
  const data = value.data;

  if (
    typeof appVersion !== "string" ||
    typeof exportedAt !== "string" ||
    !isObject(data) ||
    (typeof student !== "undefined" && !isStudentSummary(student))
  ) {
    throw new Error("Import file is missing required metadata.");
  }

  const sessions = data.sessions;
  const attempts = data.attempts;
  const progress = data.progress;

  if (!Array.isArray(sessions) || !sessions.every(isSession)) {
    throw new Error("Import file has invalid sessions data.");
  }

  if (!Array.isArray(attempts) || !attempts.every(isAttempt)) {
    throw new Error("Import file has invalid attempts data.");
  }

  if (!Array.isArray(progress) || !progress.every(isProgress)) {
    throw new Error("Import file has invalid progress data.");
  }

  return {
    appVersion,
    exportedAt,
    student,
    data: {
      sessions,
      attempts,
      progress,
    },
  };
}

export function getProgressSnapshotLastModified(snapshot: ProgressSnapshot): string {
  return getLatestIsoTimestamp([
    ...snapshot.data.sessions.flatMap((session) => [session.createdAt, session.updatedAt]),
    ...snapshot.data.attempts.map((attempt) => attempt.submittedAt),
    ...snapshot.data.progress.flatMap((progress) => [progress.lastModified, progress.lastAttemptedAt]),
  ]);
}

export class DataTransferService {
  constructor(
    private readonly storage: StorageService,
    private readonly studentProfileService: Pick<
      StudentProfileService,
      "getActiveProfile" | "getActiveStudentId"
    > = {
      getActiveProfile: async () => ({
        studentId: "student-1",
        displayName: "Student 1",
        createdAt: new Date(0).toISOString(),
        lastActiveAt: new Date(0).toISOString(),
        isActive: true,
      }),
      getActiveStudentId: async () => "student-1",
    },
  ) {}

  async exportProgress(): Promise<ProgressSnapshot> {
    const activeProfile = await this.studentProfileService.getActiveProfile();
    const [sessions, attempts, progress] = await Promise.all([
      this.storage.getAll<TestSession>(STORE_NAMES.sessions),
      this.storage.getAll<TestAttempt>(STORE_NAMES.attempts),
      this.storage.getAll<ProgressRecord>(STORE_NAMES.progress),
    ]);

    return {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      student: {
        studentId: activeProfile.studentId,
        displayName: activeProfile.displayName,
        gradeLevel: activeProfile.gradeLevel,
      },
      data: {
        sessions: sessions.filter((session) => session.studentId === activeProfile.studentId),
        attempts: attempts.filter((attempt) => attempt.studentId === activeProfile.studentId),
        progress: progress.filter((record) => record.studentId === activeProfile.studentId),
      },
    };
  }

  async importProgress(value: unknown): Promise<ProgressSnapshot> {
    const snapshot = validateProgressSnapshot(value);
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    const [existingSessions, existingAttempts, existingProgress] = await Promise.all([
      this.storage.getAll<TestSession>(STORE_NAMES.sessions),
      this.storage.getAll<TestAttempt>(STORE_NAMES.attempts),
      this.storage.getAll<ProgressRecord>(STORE_NAMES.progress),
    ]);

    for (const session of existingSessions.filter((item) => item.studentId === activeStudentId)) {
      await this.storage.delete(
        STORE_NAMES.sessions,
        getStudentScopedKey(activeStudentId, session.id),
      );
    }

    for (const attempt of existingAttempts.filter((item) => item.studentId === activeStudentId)) {
      await this.storage.delete(
        STORE_NAMES.attempts,
        getStudentScopedKey(activeStudentId, attempt.attemptId),
      );
    }

    for (const progress of existingProgress.filter((item) => item.studentId === activeStudentId)) {
      await this.storage.delete(
        STORE_NAMES.progress,
        getStudentScopedKey(activeStudentId, progress.conceptId),
      );
    }

    for (const session of snapshot.data.sessions) {
      const normalizedSession = {
        ...session,
        studentId: activeStudentId,
      };
      await this.storage.set(
        STORE_NAMES.sessions,
        getStudentScopedKey(activeStudentId, normalizedSession.id),
        normalizedSession,
      );
    }

    for (const attempt of snapshot.data.attempts) {
      const normalizedAttempt = {
        ...attempt,
        studentId: activeStudentId,
      };
      await this.storage.set(
        STORE_NAMES.attempts,
        getStudentScopedKey(activeStudentId, normalizedAttempt.attemptId),
        normalizedAttempt,
      );
    }

    for (const progress of snapshot.data.progress) {
      const normalizedProgress = {
        ...progress,
        studentId: activeStudentId,
      };
      await this.storage.set(
        STORE_NAMES.progress,
        getStudentScopedKey(activeStudentId, normalizedProgress.conceptId),
        normalizedProgress,
      );
    }

    await this.storage.setVersion(APP_VERSION);
    return {
      ...snapshot,
      student: snapshot.student,
      data: {
        sessions: snapshot.data.sessions.map((session) => ({
          ...session,
          studentId: activeStudentId,
        })),
        attempts: snapshot.data.attempts.map((attempt) => ({
          ...attempt,
          studentId: activeStudentId,
        })),
        progress: snapshot.data.progress.map((record) => ({
          ...record,
          studentId: activeStudentId,
        })),
      },
    };
  }
}

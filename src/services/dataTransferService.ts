import { APP_VERSION } from "../app/version";
import type { ProgressRecord, TestAttempt, TestSession } from "../domain/models";
import { STORE_NAMES } from "../storage/repositories";
import type { StorageService } from "../storage/storageService";

export interface ProgressSnapshot {
  appVersion: string;
  exportedAt: string;
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

export function validateProgressSnapshot(value: unknown): ProgressSnapshot {
  if (!isObject(value)) {
    throw new Error("Import file must contain an object.");
  }

  const appVersion = value.appVersion;
  const exportedAt = value.exportedAt;
  const data = value.data;

  if (typeof appVersion !== "string" || typeof exportedAt !== "string" || !isObject(data)) {
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
  constructor(private readonly storage: StorageService) {}

  async exportProgress(): Promise<ProgressSnapshot> {
    const [sessions, attempts, progress] = await Promise.all([
      this.storage.getAll<TestSession>(STORE_NAMES.sessions),
      this.storage.getAll<TestAttempt>(STORE_NAMES.attempts),
      this.storage.getAll<ProgressRecord>(STORE_NAMES.progress),
    ]);

    return {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        sessions,
        attempts,
        progress,
      },
    };
  }

  async importProgress(value: unknown): Promise<ProgressSnapshot> {
    const snapshot = validateProgressSnapshot(value);

    await this.storage.clear(STORE_NAMES.sessions);
    await this.storage.clear(STORE_NAMES.attempts);
    await this.storage.clear(STORE_NAMES.progress);

    for (const session of snapshot.data.sessions) {
      await this.storage.set(STORE_NAMES.sessions, session.id, session);
    }

    for (const attempt of snapshot.data.attempts) {
      await this.storage.set(STORE_NAMES.attempts, attempt.attemptId, attempt);
    }

    for (const progress of snapshot.data.progress) {
      await this.storage.set(STORE_NAMES.progress, progress.conceptId, progress);
    }

    await this.storage.setVersion(APP_VERSION);
    return snapshot;
  }
}

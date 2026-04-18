import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { APP_VERSION } from "../app/version";
import type { ProgressRecord, StudentProfile, TestAttempt, TestSession } from "../domain/models";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";
import { normalizeConceptId, normalizeConceptIds } from "../utils/conceptIds";
import { getStudentScopedKey } from "./repositories";
import type { StorageService, StoreName } from "./storageService";

const DB_NAME = "math-prep-assistant";
const DB_VERSION = 3;
const VERSION_KEY = "app_version";

const LEGACY_KEYS = {
  sessions: "math-prep:sessions:v1",
  attempts: "math-prep:attempts:v1",
  progress: "math-prep:progress:v1",
} as const;

interface MathPrepDb extends DBSchema {
  sessions: {
    key: string;
    value: TestSession;
  };
  attempts: {
    key: string;
    value: TestAttempt;
  };
  progress: {
    key: string;
    value: ProgressRecord;
  };
  students: {
    key: string;
    value: StudentProfile;
  };
  meta: {
    key: string;
    value: string;
  };
}

function readLegacyJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export class IndexedDBStorageService implements StorageService {
  private constructor(private readonly db: IDBPDatabase<MathPrepDb>) {}

  static async create(): Promise<IndexedDBStorageService> {
    const db = await openDB<MathPrepDb>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("sessions")) {
          database.createObjectStore("sessions");
        }
        if (!database.objectStoreNames.contains("attempts")) {
          database.createObjectStore("attempts");
        }
        if (!database.objectStoreNames.contains("progress")) {
          database.createObjectStore("progress");
        }
        if (!database.objectStoreNames.contains("students")) {
          database.createObjectStore("students");
        }
        if (!database.objectStoreNames.contains("meta")) {
          database.createObjectStore("meta");
        }
      },
    });

    const service = new IndexedDBStorageService(db);
    await service.migrateLegacyLocalStorage();
    await service.runMigrations();
    return service;
  }

  async get<T>(storeName: StoreName, key: string): Promise<T | null> {
    return ((await this.db.get(storeName, key)) as T | undefined) ?? null;
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    return (await this.db.getAll(storeName)) as T[];
  }

  async set<T>(storeName: StoreName, key: string, value: T): Promise<void> {
    await this.db.put(storeName, value as MathPrepDb[StoreName]["value"], key);
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    await this.db.delete(storeName, key);
  }

  async clear(storeName: StoreName): Promise<void> {
    await this.db.clear(storeName);
  }

  async getVersion(): Promise<string | null> {
    return (await this.db.get("meta", VERSION_KEY)) ?? null;
  }

  async setVersion(version: string): Promise<void> {
    await this.db.put("meta", version, VERSION_KEY);
  }

  close(): void {
    this.db.close();
  }

  private async migrateLegacyLocalStorage(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const sessions = readLegacyJson<Record<string, TestSession>>(LEGACY_KEYS.sessions, {});
    const attempts = readLegacyJson<TestAttempt[]>(LEGACY_KEYS.attempts, []);
    const progress = readLegacyJson<Record<string, ProgressRecord>>(LEGACY_KEYS.progress, {});

    if (
      Object.keys(sessions).length === 0 &&
      attempts.length === 0 &&
      Object.keys(progress).length === 0
    ) {
      return;
    }

    for (const session of Object.values(sessions)) {
      const normalizedSession = this.normalizeSession(session);
      await this.db.put(
        "sessions",
        normalizedSession,
        getStudentScopedKey(normalizedSession.studentId, normalizedSession.id),
      );
    }

    for (const attempt of attempts) {
      const normalizedAttempt = this.normalizeAttempt(attempt);
      await this.db.put(
        "attempts",
        normalizedAttempt,
        getStudentScopedKey(normalizedAttempt.studentId, normalizedAttempt.attemptId),
      );
    }

    for (const record of Object.values(progress)) {
      const normalizedRecord = this.normalizeProgress(record);
      await this.db.put(
        "progress",
        normalizedRecord,
        getStudentScopedKey(normalizedRecord.studentId, normalizedRecord.conceptId),
      );
    }

    Object.values(LEGACY_KEYS).forEach((key) => window.localStorage.removeItem(key));
  }

  private async runMigrations(): Promise<void> {
    await this.migrateLegacyStudentScoping();
    await this.migrateLegacyConceptIds();
    await this.ensureDefaultStudentProfile();

    const currentVersion = await this.getVersion();

    if (!currentVersion) {
      await this.setVersion(APP_VERSION);
      return;
    }

    if (currentVersion === APP_VERSION) {
      return;
    }

    await this.setVersion(APP_VERSION);
  }

  private normalizeSession(session: TestSession): TestSession {
    const conceptId = normalizeConceptId(session.conceptId);
    return {
      ...session,
      studentId: session.studentId ?? DEFAULT_STUDENT_ID,
      conceptId: conceptId ?? undefined,
      conceptIds: normalizeConceptIds(session.conceptIds),
    };
  }

  private normalizeAttempt(attempt: TestAttempt): TestAttempt {
    const conceptId = normalizeConceptId(attempt.conceptId);
    return {
      ...attempt,
      studentId: attempt.studentId ?? DEFAULT_STUDENT_ID,
      conceptId: conceptId ?? undefined,
      conceptIds: normalizeConceptIds(attempt.conceptIds),
    };
  }

  private normalizeProgress(progress: ProgressRecord): ProgressRecord {
    return {
      ...progress,
      studentId: progress.studentId ?? DEFAULT_STUDENT_ID,
      conceptId: normalizeConceptId(progress.conceptId) ?? progress.conceptId,
      lastModified: progress.lastModified ?? progress.lastAttemptedAt ?? null,
    };
  }

  private async ensureDefaultStudentProfile(): Promise<void> {
    const students = await this.getAll<StudentProfile>("students");
    if (students.length > 0) {
      return;
    }

    const latestActivity = await this.getLatestActivityTimestamp();
    await this.db.put(
      "students",
      {
        studentId: DEFAULT_STUDENT_ID,
        displayName: "Student 1",
        createdAt: latestActivity,
        lastActiveAt: latestActivity,
        isActive: true,
      },
      DEFAULT_STUDENT_ID,
    );
  }

  private async migrateLegacyStudentScoping(): Promise<void> {
    const sessions = await this.getAll<TestSession>("sessions");
    for (const session of sessions) {
      const normalized = this.normalizeSession(session);
      const expectedKey = getStudentScopedKey(normalized.studentId, normalized.id);
      if (JSON.stringify(normalized) !== JSON.stringify(session)) {
        await this.db.delete("sessions", session.id);
        await this.db.put("sessions", normalized, expectedKey);
        continue;
      }

      const storedWithScopedKey = await this.db.get("sessions", expectedKey);
      if (!storedWithScopedKey) {
        await this.db.delete("sessions", session.id);
        await this.db.put("sessions", normalized, expectedKey);
      }
    }

    const attempts = await this.getAll<TestAttempt>("attempts");
    for (const attempt of attempts) {
      const normalized = this.normalizeAttempt(attempt);
      const expectedKey = getStudentScopedKey(normalized.studentId, normalized.attemptId);
      if (JSON.stringify(normalized) !== JSON.stringify(attempt)) {
        await this.db.delete("attempts", attempt.attemptId);
        await this.db.put("attempts", normalized, expectedKey);
        continue;
      }

      const storedWithScopedKey = await this.db.get("attempts", expectedKey);
      if (!storedWithScopedKey) {
        await this.db.delete("attempts", attempt.attemptId);
        await this.db.put("attempts", normalized, expectedKey);
      }
    }

    const progress = await this.getAll<ProgressRecord>("progress");
    for (const record of progress) {
      const normalized = this.normalizeProgress(record);
      const expectedKey = getStudentScopedKey(normalized.studentId, normalized.conceptId);
      if (JSON.stringify(normalized) !== JSON.stringify(record)) {
        await this.db.delete("progress", record.conceptId);
        await this.db.put("progress", normalized, expectedKey);
        continue;
      }

      const storedWithScopedKey = await this.db.get("progress", expectedKey);
      if (!storedWithScopedKey) {
        await this.db.delete("progress", record.conceptId);
        await this.db.put("progress", normalized, expectedKey);
      }
    }
  }

  private async migrateLegacyConceptIds(): Promise<void> {
    const sessions = await this.getAll<TestSession>("sessions");
    for (const session of sessions) {
      const normalized = this.normalizeSession(session);
      if (JSON.stringify(normalized) !== JSON.stringify(session)) {
        await this.db.put(
          "sessions",
          normalized,
          getStudentScopedKey(normalized.studentId, normalized.id),
        );
      }
    }

    const attempts = await this.getAll<TestAttempt>("attempts");
    for (const attempt of attempts) {
      const normalized = this.normalizeAttempt(attempt);
      if (JSON.stringify(normalized) !== JSON.stringify(attempt)) {
        await this.db.put(
          "attempts",
          normalized,
          getStudentScopedKey(normalized.studentId, normalized.attemptId),
        );
      }
    }

    const progress = await this.getAll<ProgressRecord>("progress");
    for (const record of progress) {
      const normalized = this.normalizeProgress(record);
      if (normalized.conceptId !== record.conceptId) {
        await this.db.delete("progress", getStudentScopedKey(normalized.studentId, record.conceptId));
        await this.db.put(
          "progress",
          normalized,
          getStudentScopedKey(normalized.studentId, normalized.conceptId),
        );
      }
    }
  }

  private async getLatestActivityTimestamp(): Promise<string> {
    const [sessions, attempts, progress] = await Promise.all([
      this.getAll<TestSession>("sessions"),
      this.getAll<TestAttempt>("attempts"),
      this.getAll<ProgressRecord>("progress"),
    ]);

    const timestamps = [
      ...sessions.flatMap((session) => [session.createdAt, session.updatedAt]),
      ...attempts.map((attempt) => attempt.submittedAt),
      ...progress.flatMap((record) => [record.lastModified, record.lastAttemptedAt]),
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value));

    return timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : new Date().toISOString();
  }
}

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { APP_VERSION } from "../app/version";
import type { ProgressRecord, TestAttempt, TestSession } from "../domain/models";
import { normalizeConceptId, normalizeConceptIds } from "../utils/conceptIds";
import type { StorageService, StoreName } from "./storageService";

const DB_NAME = "math-prep-assistant";
const DB_VERSION = 2;
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
      await this.db.put("sessions", this.normalizeSession(session), session.id);
    }

    for (const attempt of attempts) {
      await this.db.put("attempts", this.normalizeAttempt(attempt), attempt.attemptId);
    }

    for (const record of Object.values(progress)) {
      const normalizedRecord = this.normalizeProgress(record);
      await this.db.put("progress", normalizedRecord, normalizedRecord.conceptId);
    }

    Object.values(LEGACY_KEYS).forEach((key) => window.localStorage.removeItem(key));
  }

  private async runMigrations(): Promise<void> {
    await this.migrateLegacyConceptIds();

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
      conceptId: conceptId ?? undefined,
      conceptIds: normalizeConceptIds(session.conceptIds),
    };
  }

  private normalizeAttempt(attempt: TestAttempt): TestAttempt {
    const conceptId = normalizeConceptId(attempt.conceptId);
    return {
      ...attempt,
      conceptId: conceptId ?? undefined,
      conceptIds: normalizeConceptIds(attempt.conceptIds),
    };
  }

  private normalizeProgress(progress: ProgressRecord): ProgressRecord {
    return {
      ...progress,
      conceptId: normalizeConceptId(progress.conceptId) ?? progress.conceptId,
      lastModified: progress.lastModified ?? progress.lastAttemptedAt ?? null,
    };
  }

  private async migrateLegacyConceptIds(): Promise<void> {
    const sessions = await this.getAll<TestSession>("sessions");
    for (const session of sessions) {
      const normalized = this.normalizeSession(session);
      if (JSON.stringify(normalized) !== JSON.stringify(session)) {
        await this.db.put("sessions", normalized, normalized.id);
      }
    }

    const attempts = await this.getAll<TestAttempt>("attempts");
    for (const attempt of attempts) {
      const normalized = this.normalizeAttempt(attempt);
      if (JSON.stringify(normalized) !== JSON.stringify(attempt)) {
        await this.db.put("attempts", normalized, normalized.attemptId);
      }
    }

    const progress = await this.getAll<ProgressRecord>("progress");
    for (const record of progress) {
      const normalized = this.normalizeProgress(record);
      if (normalized.conceptId !== record.conceptId) {
        await this.db.delete("progress", record.conceptId);
        await this.db.put("progress", normalized, normalized.conceptId);
      }
    }
  }
}

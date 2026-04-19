import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type {
  DataTransferServiceContract,
  ProgressService,
  SessionService,
} from "./contracts";
import {
  getProgressSnapshotLastModified,
  type ProgressSnapshot,
  validateProgressSnapshot,
} from "./dataTransferService";
import { db } from "./firebase";

const LEGACY_PROGRESS_SYNC_USER_ID = "daughter-1";

export type ProgressSyncStatus = "offline" | "syncing" | "synced";

export interface CloudProgressDocument {
  appVersion: string;
  lastModified: string;
  syncedAt: string;
  snapshot: ProgressSnapshot;
}

export interface ProgressSyncClient {
  isReady(): boolean;
  saveProgressToCloud(studentId: string, progressData: ProgressSnapshot): Promise<void>;
  loadProgressFromCloud(studentId: string): Promise<CloudProgressDocument | null>;
}

type ProgressSyncListener = (status: ProgressSyncStatus) => void;

function hasSnapshotData(snapshot: ProgressSnapshot): boolean {
  return (
    snapshot.data.sessions.length > 0 ||
    snapshot.data.attempts.length > 0 ||
    snapshot.data.progress.length > 0
  );
}

function isCloudProgressDocument(value: unknown): value is CloudProgressDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.appVersion === "string" &&
    typeof candidate.lastModified === "string" &&
    typeof candidate.syncedAt === "string" &&
    typeof candidate.snapshot === "object" &&
    candidate.snapshot !== null
  );
}

function parseCloudProgressDocument(value: unknown): CloudProgressDocument | null {
  if (!isCloudProgressDocument(value)) {
    return null;
  }

  return {
    ...value,
    snapshot: validateProgressSnapshot(value.snapshot),
  };
}

function sanitizeProgressSnapshotForCloud<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProgressSnapshotForCloud(item)) as T;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => typeof entryValue !== "undefined")
      .map(([key, entryValue]) => [key, sanitizeProgressSnapshotForCloud(entryValue)]),
  ) as T;
}

export class FirestoreProgressSyncClient implements ProgressSyncClient {
  constructor(private readonly firestore: Firestore | null = db) {}

  isReady(): boolean {
    return this.firestore !== null;
  }

  async saveProgressToCloud(studentId: string, progressData: ProgressSnapshot): Promise<void> {
    if (!this.firestore) {
      throw new Error("Firebase sync is not configured.");
    }

    const documentRef = doc(this.firestore, "students", studentId, "progress", "current");
    const snapshot = sanitizeProgressSnapshotForCloud(progressData);
    await setDoc(
      documentRef,
      {
        appVersion: snapshot.appVersion,
        debugCliWrite: deleteField(),
        lastModified: getProgressSnapshotLastModified(snapshot),
        syncedAt: new Date().toISOString(),
        snapshot,
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async loadProgressFromCloud(studentId: string): Promise<CloudProgressDocument | null> {
    if (!this.firestore) {
      throw new Error("Firebase sync is not configured.");
    }

    const documentRef = doc(this.firestore, "students", studentId, "progress", "current");
    const snapshot = await getDoc(documentRef);

    if (snapshot.exists()) {
      return parseCloudProgressDocument(snapshot.data());
    }

    if (studentId !== "student-1") {
      return null;
    }

    const legacyDocumentRef = doc(this.firestore, "progress", LEGACY_PROGRESS_SYNC_USER_ID);
    const legacySnapshot = await getDoc(legacyDocumentRef);
    if (!legacySnapshot.exists()) {
      return null;
    }

    return parseCloudProgressDocument(legacySnapshot.data());
  }
}

export class ProgressSyncManager {
  private readonly listeners = new Set<ProgressSyncListener>();
  private queuedSync: Promise<void> = Promise.resolve();
  private status: ProgressSyncStatus = "offline";

  constructor(
    private readonly client: ProgressSyncClient,
    private readonly dataTransferService: DataTransferServiceContract,
    private readonly getActiveStudentId: () => Promise<string>,
  ) {}

  getStatus(): ProgressSyncStatus {
    return this.status;
  }

  subscribe(listener: ProgressSyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    if (!this.client.isReady()) {
      this.setStatus("offline");
      return;
    }

    await this.runSync();
  }

  syncInBackground(): void {
    if (!this.client.isReady()) {
      this.setStatus("offline");
      return;
    }

    this.queuedSync = this.queuedSync
      .catch(() => undefined)
      .then(async () => {
        await this.runSync();
      });
  }

  waitForIdle(): Promise<void> {
    return this.queuedSync.catch(() => undefined);
  }

  private async runSync(): Promise<void> {
    this.setStatus("syncing");

    try {
      const studentId = await this.getActiveStudentId();
      const localSnapshot = await this.dataTransferService.exportProgress();
      const localLastModified = getProgressSnapshotLastModified(localSnapshot);
      const cloudDocument = await this.client.loadProgressFromCloud(studentId);

      if (cloudDocument) {
        const cloudLastModified = cloudDocument.lastModified;
        if (Date.parse(cloudLastModified) > Date.parse(localLastModified)) {
          await this.dataTransferService.importProgress(cloudDocument.snapshot);
          this.setStatus("synced");
          return;
        }
      }

      if (hasSnapshotData(localSnapshot) || cloudDocument !== null) {
        await this.client.saveProgressToCloud(studentId, localSnapshot);
      }

      this.setStatus("synced");
    } catch {
      this.setStatus("offline");
    }
  }

  private setStatus(status: ProgressSyncStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export class SyncingSessionService implements SessionService {
  constructor(
    private readonly delegate: SessionService,
    private readonly syncManager: ProgressSyncManager,
  ) {}

  getSession(sessionId: string) {
    return this.delegate.getSession(sessionId);
  }

  getLatestInProgressSession() {
    return this.delegate.getLatestInProgressSession();
  }

  async saveAnswer(
    sessionId: string,
    answer: Parameters<SessionService["saveAnswer"]>[1],
  ): Promise<void> {
    await this.delegate.saveAnswer(sessionId, answer);
    this.syncManager.syncInBackground();
  }

  async setCurrentQuestionIndex(sessionId: string, index: number): Promise<void> {
    await this.delegate.setCurrentQuestionIndex(sessionId, index);
    this.syncManager.syncInBackground();
  }

  submitSession(sessionId: string) {
    return this.delegate.submitSession(sessionId);
  }
}

export class SyncingProgressService implements ProgressService {
  constructor(
    private readonly delegate: ProgressService,
    private readonly syncManager: ProgressSyncManager,
  ) {}

  getProgress() {
    return this.delegate.getProgress();
  }

  getConceptProgress(conceptId: string) {
    return this.delegate.getConceptProgress(conceptId);
  }

  getConceptAttempts(conceptId: string) {
    return this.delegate.getConceptAttempts(conceptId);
  }

  getAttempt(attemptId: string) {
    return this.delegate.getAttempt(attemptId);
  }

  async updateFromAttempt(attempt: Parameters<ProgressService["updateFromAttempt"]>[0]): Promise<void> {
    await this.delegate.updateFromAttempt(attempt);
    this.syncManager.syncInBackground();
  }
}

export class SyncingDataTransferService implements DataTransferServiceContract {
  constructor(
    private readonly delegate: DataTransferServiceContract,
    private readonly syncManager: ProgressSyncManager,
  ) {}

  exportProgress() {
    return this.delegate.exportProgress();
  }

  async importProgress(value: unknown) {
    const snapshot = await this.delegate.importProgress(value);
    this.syncManager.syncInBackground();
    return snapshot;
  }
}

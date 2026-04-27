import { APP_VERSION } from "../app/version";
import type {
  PlacementLevel,
  PlacementProfile,
  ProgressRecord,
  StudentFeatureFlags,
  StudentProfileType,
  TestAttempt,
  TestSession,
} from "../domain/models";
import type { ContentRepository, StudentProfileService } from "./contracts";
import { getStudentScopedKey, STORE_NAMES } from "../storage/repositories";
import type { StorageService } from "../storage/storageService";
import {
  buildProgressRecordFromAttempts,
  rebuildAttemptResults,
} from "./attemptRepair";

interface ProgressSnapshotStudentSummary {
  studentId: string;
  displayName: string;
  gradeLevel?: string;
  homeGrade?: string;
  placementProfile?: PlacementProfile;
  profileType?: StudentProfileType;
  featureFlags?: StudentFeatureFlags;
}

export interface ProgressSnapshot {
  appVersion: string;
  exportedAt: string;
  student?: ProgressSnapshotStudentSummary;
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

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "undefined" || typeof value === "string";
}

function isPlacementLevel(value: unknown): value is PlacementLevel {
  return (
    isObject(value) &&
    isOptionalString(value.instructionalGrade) &&
    isOptionalString(value.programPathway)
  );
}

function isPlacementProfile(value: unknown): value is PlacementProfile {
  if (!isObject(value)) {
    return false;
  }

  const overall = value.overall;
  const subjects = value.subjects;

  return (
    (typeof overall === "undefined" || isPlacementLevel(overall)) &&
    (typeof subjects === "undefined" ||
      (isObject(subjects) && Object.values(subjects).every(isPlacementLevel)))
  );
}

function isFeatureFlags(value: unknown): value is StudentFeatureFlags {
  return isObject(value) && Object.values(value).every((entry) => typeof entry === "boolean");
}

function normalizeProfileType(value: unknown): StudentProfileType {
  return value === "test" ? "test" : "production";
}

function normalizeStudentSummary(
  student: ProgressSnapshotStudentSummary,
): ProgressSnapshotStudentSummary {
  return {
    ...student,
    homeGrade: student.homeGrade ?? student.gradeLevel,
    profileType: normalizeProfileType(student.profileType),
    featureFlags: isFeatureFlags(student.featureFlags) ? student.featureFlags : undefined,
  };
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

function isStudentSummary(value: unknown): value is ProgressSnapshotStudentSummary {
  return (
    isObject(value) &&
    typeof value.studentId === "string" &&
    typeof value.displayName === "string" &&
    isOptionalString(value.gradeLevel) &&
    isOptionalString(value.homeGrade) &&
    (typeof value.placementProfile === "undefined" || isPlacementProfile(value.placementProfile)) &&
    (typeof value.profileType === "undefined" ||
      value.profileType === "production" ||
      value.profileType === "test") &&
    (typeof value.featureFlags === "undefined" || isFeatureFlags(value.featureFlags))
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
    student: typeof student === "undefined" ? undefined : normalizeStudentSummary(student),
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
        profileType: "production",
        createdAt: new Date(0).toISOString(),
        lastActiveAt: new Date(0).toISOString(),
        isActive: true,
      }),
      getActiveStudentId: async () => "student-1",
    },
    private readonly contentRepository: ContentRepository | null = null,
  ) {}

  async exportProgress(): Promise<ProgressSnapshot> {
    const activeProfile = await this.studentProfileService.getActiveProfile();
    const [sessions, attempts, progress] = await Promise.all([
      this.storage.getAll<TestSession>(STORE_NAMES.sessions),
      this.storage.getAll<TestAttempt>(STORE_NAMES.attempts),
      this.storage.getAll<ProgressRecord>(STORE_NAMES.progress),
    ]);

    const snapshot = {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      student: {
        studentId: activeProfile.studentId,
        displayName: activeProfile.displayName,
        gradeLevel: activeProfile.gradeLevel,
        homeGrade: activeProfile.homeGrade,
        placementProfile: activeProfile.placementProfile,
        profileType: activeProfile.profileType,
        featureFlags: activeProfile.featureFlags,
      },
      data: {
        sessions: sessions.filter((session) => session.studentId === activeProfile.studentId),
        attempts: attempts.filter((attempt) => attempt.studentId === activeProfile.studentId),
        progress: progress.filter((record) => record.studentId === activeProfile.studentId),
      },
    };

    return this.repairSnapshot(snapshot);
  }

  async importProgress(value: unknown): Promise<ProgressSnapshot> {
    const snapshot = await this.repairSnapshot(validateProgressSnapshot(value));
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

  private async repairSnapshot(snapshot: ProgressSnapshot): Promise<ProgressSnapshot> {
    if (!this.contentRepository) {
      return snapshot;
    }

    const repairedAttempts = await Promise.all(
      snapshot.data.attempts.map((attempt) => rebuildAttemptResults(this.contentRepository!, attempt)),
    );
    const conceptIds = new Set<string>();
    for (const attempt of repairedAttempts) {
      if (attempt.conceptId) {
        conceptIds.add(attempt.conceptId);
      }
    }
    for (const progress of snapshot.data.progress) {
      conceptIds.add(progress.conceptId);
    }

    const repairedProgress: ProgressRecord[] = [];
    for (const conceptId of conceptIds) {
      const rebuilt = buildProgressRecordFromAttempts(conceptId, repairedAttempts);
      if (rebuilt) {
        repairedProgress.push(rebuilt);
        continue;
      }

      const existing = snapshot.data.progress.find((record) => record.conceptId === conceptId);
      if (existing) {
        repairedProgress.push(existing);
      }
    }

    return {
      ...snapshot,
      data: {
        ...snapshot.data,
        attempts: repairedAttempts,
        progress: repairedProgress,
      },
    };
  }
}

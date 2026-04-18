import type { ProgressRecord, StudentProfile, TestAttempt, TestSession } from "../domain/models";
import type { StorageService } from "./storageService";
import type { StudentProfileService } from "../services/contracts";

export const STORE_NAMES = {
  sessions: "sessions",
  attempts: "attempts",
  progress: "progress",
  students: "students",
} as const;

const defaultStudentProfileService: Pick<StudentProfileService, "getActiveStudentId"> = {
  getActiveStudentId: async () => "student-1",
};

export function getStudentScopedKey(studentId: string, recordId: string): string {
  return `${studentId}:${recordId}`;
}

export class SessionRepository {
  constructor(
    private readonly store: StorageService,
    private readonly studentProfileService: Pick<StudentProfileService, "getActiveStudentId"> = defaultStudentProfileService,
  ) {}

  async list(): Promise<Record<string, TestSession>> {
    const sessions = await this.store.getAll<TestSession>(STORE_NAMES.sessions);
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    return Object.fromEntries(
      sessions
        .filter((session) => session.studentId === activeStudentId)
        .map((session) => [session.id, session]),
    );
  }

  async get(sessionId: string): Promise<TestSession | null> {
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    return this.store.get<TestSession>(STORE_NAMES.sessions, getStudentScopedKey(activeStudentId, sessionId));
  }

  async save(session: TestSession): Promise<void> {
    await this.store.set(
      STORE_NAMES.sessions,
      getStudentScopedKey(session.studentId, session.id),
      session,
    );
  }
}

export class AttemptRepository {
  constructor(
    private readonly store: StorageService,
    private readonly studentProfileService: Pick<StudentProfileService, "getActiveStudentId"> = defaultStudentProfileService,
  ) {}

  async list(): Promise<TestAttempt[]> {
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    return (await this.store.getAll<TestAttempt>(STORE_NAMES.attempts)).filter(
      (attempt) => attempt.studentId === activeStudentId,
    );
  }

  async append(attempt: TestAttempt): Promise<void> {
    await this.store.set(
      STORE_NAMES.attempts,
      getStudentScopedKey(attempt.studentId, attempt.attemptId),
      attempt,
    );
  }

  async get(attemptId: string): Promise<TestAttempt | null> {
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    return this.store.get<TestAttempt>(
      STORE_NAMES.attempts,
      getStudentScopedKey(activeStudentId, attemptId),
    );
  }

  async listByConcept(conceptId: string): Promise<TestAttempt[]> {
    const attempts = await this.list();
    return attempts
      .filter((attempt) => attempt.conceptId === conceptId)
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  }
}

export class ProgressRepository {
  constructor(
    private readonly store: StorageService,
    private readonly studentProfileService: Pick<StudentProfileService, "getActiveStudentId"> = defaultStudentProfileService,
  ) {}

  async list(): Promise<Record<string, ProgressRecord>> {
    const records = await this.store.getAll<ProgressRecord>(STORE_NAMES.progress);
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    return Object.fromEntries(
      records
        .filter((progress) => progress.studentId === activeStudentId)
        .map((progress) => [progress.conceptId, progress]),
    );
  }

  async get(conceptId: string): Promise<ProgressRecord | null> {
    const activeStudentId = await this.studentProfileService.getActiveStudentId();
    return this.store.get<ProgressRecord>(
      STORE_NAMES.progress,
      getStudentScopedKey(activeStudentId, conceptId),
    );
  }

  async save(progress: ProgressRecord): Promise<void> {
    await this.store.set(
      STORE_NAMES.progress,
      getStudentScopedKey(progress.studentId, progress.conceptId),
      progress,
    );
  }
}

export class StudentProfileRepository {
  constructor(private readonly store: StorageService) {}

  async list(): Promise<StudentProfile[]> {
    return this.store.getAll<StudentProfile>(STORE_NAMES.students);
  }

  async get(studentId: string): Promise<StudentProfile | null> {
    return this.store.get<StudentProfile>(STORE_NAMES.students, studentId);
  }

  async save(profile: StudentProfile): Promise<void> {
    await this.store.set(STORE_NAMES.students, profile.studentId, profile);
  }
}

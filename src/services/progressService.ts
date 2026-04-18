import type { ProgressRecord, TestAttempt } from "../domain/models";
import type { ProgressService } from "./contracts";
import type { AttemptRepository, ProgressRepository } from "../storage/repositories";
import { getMasteryStatus } from "../utils/mastery";

export class LocalProgressService implements ProgressService {
  constructor(
    private readonly attemptRepository: AttemptRepository,
    private readonly progressRepository: ProgressRepository,
  ) {}

  async getProgress(): Promise<ProgressRecord[]> {
    return Object.values(await this.progressRepository.list()).sort((left, right) =>
      left.conceptId.localeCompare(right.conceptId),
    );
  }

  async getConceptProgress(conceptId: string): Promise<ProgressRecord | null> {
    return this.progressRepository.get(conceptId);
  }

  async getConceptAttempts(conceptId: string): Promise<TestAttempt[]> {
    return this.attemptRepository.listByConcept(conceptId);
  }

  async getAttempt(attemptId: string): Promise<TestAttempt | null> {
    return this.attemptRepository.get(attemptId);
  }

  async updateFromAttempt(attempt: TestAttempt): Promise<void> {
    if (!attempt.conceptId) {
      return;
    }

    const attempts = await this.attemptRepository.listByConcept(attempt.conceptId);
    const bestScore = attempts.reduce(
      (currentBest, item) =>
        currentBest === null ? item.summary.percentage : Math.max(currentBest, item.summary.percentage),
      null as number | null,
    );

    const progress: ProgressRecord = {
      studentId: attempt.studentId,
      conceptId: attempt.conceptId,
      courseId: attempt.courseId,
      attemptCount: attempts.length,
      latestScore: attempt.summary.percentage,
      bestScore,
      masteryStatus: getMasteryStatus(attempt.summary.percentage, attempts.length),
      lastAttemptedAt: attempt.submittedAt,
      lastModified: attempt.submittedAt,
    };

    await this.progressRepository.save(progress);
  }
}

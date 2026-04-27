import type { ProgressRecord, TestAttempt } from "../domain/models";
import type { ContentRepository, ProgressService } from "./contracts";
import type { AttemptRepository, ProgressRepository } from "../storage/repositories";
import {
  attemptsEqual,
  buildProgressRecordFromAttempts,
  rebuildAttemptResults,
} from "./attemptRepair";

export class LocalProgressService implements ProgressService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly attemptRepository: AttemptRepository,
    private readonly progressRepository: ProgressRepository,
  ) {}

  async getProgress(): Promise<ProgressRecord[]> {
    const repairedAttempts = await this.getAllRepairedAttempts();
    const conceptIds = [...new Set(repairedAttempts.flatMap((attempt) => attempt.conceptId ? [attempt.conceptId] : []))];
    const records = (
      await Promise.all(conceptIds.map(async (conceptId) => this.getConceptProgress(conceptId)))
    ).filter((record): record is ProgressRecord => record !== null);

    return records.sort((left, right) => left.conceptId.localeCompare(right.conceptId));
  }

  async getConceptProgress(conceptId: string): Promise<ProgressRecord | null> {
    const attempts = await this.getConceptAttempts(conceptId);
    const derivedProgress = buildProgressRecordFromAttempts(conceptId, attempts);
    const storedProgress = await this.progressRepository.get(conceptId);

    if (!derivedProgress) {
      return storedProgress;
    }

    if (!storedProgress || JSON.stringify(storedProgress) !== JSON.stringify(derivedProgress)) {
      await this.progressRepository.save(derivedProgress);
    }

    return derivedProgress;
  }

  async getConceptAttempts(conceptId: string): Promise<TestAttempt[]> {
    const attempts = await this.attemptRepository.listByConcept(conceptId);
    return this.repairAttempts(attempts);
  }

  async getAttempt(attemptId: string): Promise<TestAttempt | null> {
    const attempt = await this.attemptRepository.get(attemptId);
    if (!attempt) {
      return null;
    }

    return this.repairAttempt(attempt);
  }

  async updateFromAttempt(attempt: TestAttempt): Promise<void> {
    if (!attempt.conceptId) {
      return;
    }

    const attempts = await this.attemptRepository.listByConcept(attempt.conceptId);
    const repairedAttempts = await this.repairAttempts(attempts);
    const progress = buildProgressRecordFromAttempts(attempt.conceptId, repairedAttempts);

    if (progress) {
      await this.progressRepository.save(progress);
    }
  }

  private async getAllRepairedAttempts(): Promise<TestAttempt[]> {
    const attempts = await this.attemptRepository.list();
    return this.repairAttempts(attempts);
  }

  private async repairAttempts(attempts: TestAttempt[]): Promise<TestAttempt[]> {
    return Promise.all(attempts.map((attempt) => this.repairAttempt(attempt)));
  }

  private async repairAttempt(attempt: TestAttempt): Promise<TestAttempt> {
    const repairedAttempt = await rebuildAttemptResults(this.contentRepository, attempt);
    if (!attemptsEqual(attempt, repairedAttempt)) {
      await this.attemptRepository.append(repairedAttempt);
    }

    return repairedAttempt;
  }
}

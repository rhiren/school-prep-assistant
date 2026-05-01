import type { AnswerRecord, TestAttempt, TestSession } from "../domain/models";
import type { ProgressService, ScoringService, SessionService } from "./contracts";
import type { AttemptRepository, SessionRepository } from "../storage/repositories";

function hasMeaningfulInProgressWork(session: TestSession): boolean {
  const answeredCount = Object.values(session.answers ?? {}).filter(
    (answer) => answer.response.trim() !== "",
  ).length;

  return answeredCount > 0 || session.currentQuestionIndex > 0;
}

export class LocalSessionService implements SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly attemptRepository: AttemptRepository,
    private readonly scoringService: ScoringService,
    private readonly progressService: ProgressService,
  ) {}

  async getSession(sessionId: string): Promise<TestSession | null> {
    return this.sessionRepository.get(sessionId);
  }

  async getLatestInProgressSession(): Promise<TestSession | null> {
    const sessions = Object.values(await this.sessionRepository.list())
      .filter(
        (session) => session.status === "in_progress" && hasMeaningfulInProgressWork(session),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return sessions[0] ?? null;
  }

  async saveAnswer(sessionId: string, answer: AnswerRecord): Promise<void> {
    const session = await this.requireMutableSession(sessionId);

    session.answers[answer.questionId] = answer;
    session.updatedAt = new Date().toISOString();
    await this.sessionRepository.save(session);
  }

  async setCurrentQuestionIndex(sessionId: string, index: number): Promise<void> {
    const session = await this.requireMutableSession(sessionId);

    session.currentQuestionIndex = index;
    session.updatedAt = new Date().toISOString();
    await this.sessionRepository.save(session);
  }

  async submitSession(sessionId: string): Promise<TestAttempt> {
    const session = await this.requireMutableSession(sessionId);
    const attempt = await this.scoringService.scoreSession(session);

    session.status = "submitted";
    session.updatedAt = new Date().toISOString();

    await this.attemptRepository.append(attempt);
    await this.sessionRepository.save(session);
    await this.progressService.updateFromAttempt(attempt);

    return attempt;
  }

  private async requireMutableSession(sessionId: string): Promise<TestSession> {
    const session = await this.sessionRepository.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    if (session.status === "submitted") {
      throw new Error(`Session ${sessionId} has already been submitted.`);
    }

    return { ...session, answers: { ...session.answers } };
  }
}

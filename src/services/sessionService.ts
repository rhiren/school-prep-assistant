import type { AnswerHistoryEntry, AnswerRecord, TestAttempt, TestSession } from "../domain/models";
import type { ProgressService, ScoringService, SessionService } from "./contracts";
import type { AttemptRepository, SessionRepository } from "../storage/repositories";
import { buildRetryOutcome } from "./smartRetry";

function hasMeaningfulInProgressWork(session: TestSession): boolean {
  const answeredCount = Object.values(session.answers ?? {}).filter(
    (answer) => answer.response.trim() !== "",
  ).length;

  return answeredCount > 0 || session.currentQuestionIndex > 0;
}

export class LocalSessionService implements SessionService {
  private readonly pending = new Map<string, Promise<unknown>>();

  private serialize<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const next = (this.pending.get(id) ?? Promise.resolve()).then(operation);
    this.pending.set(id, next.catch(() => undefined));
    return next;
  }
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

  saveAnswer(sessionId: string, answer: AnswerRecord): Promise<void> {
    return this.serialize(sessionId, () => this.persistAnswer(sessionId, answer));
  }

  private async persistAnswer(sessionId: string, answer: AnswerRecord): Promise<void> {
    const session = await this.requireMutableSession(sessionId);
    const previousAnswer = session.answers[answer.questionId];
    const history = session.answerHistory?.[answer.questionId] ?? [];
    const previousResponse = answer.inputMethod === "text" && answer.committed
      ? history[history.length - 1]?.response ?? (previousAnswer?.committed === false ? null : previousAnswer?.response ?? null)
      : previousAnswer?.response ?? null;

    session.answers[answer.questionId] = answer;
    if (previousResponse !== answer.response && (answer.inputMethod !== "text" || answer.committed === true)) {
      const historyEntry: AnswerHistoryEntry = {
        ...answer,
        previousResponse,
      };
      session.answerHistory = {
        ...(session.answerHistory ?? {}),
        [answer.questionId]: [
          ...(session.answerHistory?.[answer.questionId] ?? []),
          historyEntry,
        ],
      };
    }
    session.updatedAt = new Date().toISOString();
    await this.sessionRepository.save(session);
  }

  setCurrentQuestionIndex(sessionId: string, index: number): Promise<void> {
    return this.serialize(sessionId, () => this.persistIndex(sessionId, index));
  }

  private async persistIndex(sessionId: string, index: number): Promise<void> {
    const session = await this.requireMutableSession(sessionId);

    session.currentQuestionIndex = index;
    session.updatedAt = new Date().toISOString();
    await this.sessionRepository.save(session);
  }

  submitSession(sessionId: string, support?: "independent" | "help"): Promise<TestAttempt> {
    return this.serialize(sessionId, () => this.persistSubmission(sessionId, support));
  }

  private async persistSubmission(sessionId: string, support?: "independent" | "help"): Promise<TestAttempt> {
    const session = await this.requireMutableSession(sessionId);
    if (session.understandingCheck) session.understandingCheck = { ...session.understandingCheck, support };
    let attempt = await this.scoringService.scoreSession(session);

    if (attempt.conceptId && attempt.smartRetry?.kind === "targeted") {
      const previousAttempts = await this.progressService.getConceptAttempts(attempt.conceptId);
      const outcome = buildRetryOutcome(attempt, previousAttempts);
      if (outcome) {
        attempt = {
          ...attempt,
          smartRetry: {
            ...attempt.smartRetry,
            outcome,
          },
        };
      }
    }

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

    return {
      ...session,
      answers: { ...session.answers },
      answerHistory: { ...(session.answerHistory ?? {}) },
    };
  }
}

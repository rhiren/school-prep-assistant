import type {
  AttemptDurationSignal,
  AnswerRecord,
  Concept,
  Question,
  ScoredQuestionResult,
  TestAttempt,
  TestSession,
} from "../domain/models";
import type { ContentRepository, ScoringService } from "../services/contracts";
import { createId } from "../utils/id";
import { compareQuestionAnswer } from "../utils/answerNormalization";

function toScoredResult(
  question: Question,
  concept: Concept | null,
  answer?: AnswerRecord,
): ScoredQuestionResult {
  const submittedAnswer = answer?.response?.trim() ? answer.response : null;
  const comparison = answer
    ? compareQuestionAnswer(question, answer.response)
    : {
        isCorrect: false,
        normalizedSubmitted: "",
        normalizedCorrect: question.correctAnswer,
        feedbackTip: null,
      };

  return {
    questionId: question.id,
    conceptId: question.conceptId,
    isCorrect: submittedAnswer !== null && comparison.isCorrect,
    submittedAnswer,
    correctAnswer: question.correctAnswer,
    skillTags: question.skillTags?.length ? question.skillTags : concept?.skillTags ?? [],
    difficulty: question.difficulty,
    feedbackTip: comparison.feedbackTip,
  };
}

function toAttemptDurationSignal(
  session: TestSession,
  submittedAt: string,
): AttemptDurationSignal | undefined {
  const startedAtMs = Date.parse(session.createdAt);
  const submittedAtMs = Date.parse(submittedAt);

  if (!Number.isFinite(startedAtMs) || !Number.isFinite(submittedAtMs)) {
    return undefined;
  }

  return {
    startedAt: session.createdAt,
    durationMs: Math.max(0, submittedAtMs - startedAtMs),
  };
}

export class BasicScoringEngine implements ScoringService {
  constructor(private readonly contentRepository: ContentRepository) {}

  async scoreSession(session: TestSession): Promise<TestAttempt> {
    const submittedAt = new Date().toISOString();
    const results: ScoredQuestionResult[] = [];

    for (const questionId of session.questionIds) {
      const question = await this.contentRepository.getQuestionById(questionId);
      if (!question) {
        throw new Error(`Unknown question: ${questionId}`);
      }

      const concept = await this.contentRepository.getConcept(question.conceptId);
      results.push(toScoredResult(question, concept, session.answers[questionId]));
    }

    const totalQuestions = results.length;
    const correctCount = results.filter((result) => result.isCorrect).length;
    const unansweredCount = results.filter((result) => result.submittedAnswer === null).length;
    const incorrectCount = totalQuestions - correctCount - unansweredCount;
    const percentage = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

    return {
      attemptId: createId("attempt"),
      studentId: session.studentId,
      sessionId: session.id,
      mode: session.mode,
      courseId: session.courseId,
      conceptId: session.conceptId,
      conceptIds: session.conceptIds,
      questionIds: session.questionIds,
      answers: session.answers,
      smartRetry: session.smartRetry,
      durationSignal: toAttemptDurationSignal(session, submittedAt),
      results,
      summary: {
        totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        percentage,
      },
      submittedAt,
    };
  }
}

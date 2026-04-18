import type {
  AnswerRecord,
  Question,
  ScoredQuestionResult,
  TestAttempt,
  TestSession,
} from "../domain/models";
import type { ContentRepository, ScoringService } from "../services/contracts";
import { createId } from "../utils/id";
import { compareAnswers } from "../utils/answerNormalization";

function toScoredResult(question: Question, answer?: AnswerRecord): ScoredQuestionResult {
  const submittedAnswer = answer?.response?.trim() ? answer.response : null;
  const comparison = answer
    ? compareAnswers(answer.response, question.correctAnswer, question.answerType)
    : {
        isCorrect: false,
        normalizedSubmitted: "",
        normalizedCorrect: question.correctAnswer,
        feedbackTip: null,
      };

  return {
    questionId: question.id,
    isCorrect: submittedAnswer !== null && comparison.isCorrect,
    submittedAnswer,
    correctAnswer: question.correctAnswer,
    feedbackTip: comparison.feedbackTip,
  };
}

export class BasicScoringEngine implements ScoringService {
  constructor(private readonly contentRepository: ContentRepository) {}

  async scoreSession(session: TestSession): Promise<TestAttempt> {
    const results: ScoredQuestionResult[] = [];

    for (const questionId of session.questionIds) {
      const question = await this.contentRepository.getQuestionById(questionId);
      if (!question) {
        throw new Error(`Unknown question: ${questionId}`);
      }

      results.push(toScoredResult(question, session.answers[questionId]));
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
      results,
      summary: {
        totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        percentage,
      },
      submittedAt: new Date().toISOString(),
    };
  }
}

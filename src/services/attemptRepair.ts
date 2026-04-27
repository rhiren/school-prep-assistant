import type {
  ProgressRecord,
  Question,
  ScoredQuestionResult,
  TestAttempt,
} from "../domain/models";
import type { ContentRepository } from "./contracts";
import { compareQuestionAnswer } from "../utils/answerNormalization";
import { getMasteryStatus } from "../utils/mastery";

function buildScoredResult(question: Question, submittedAnswer: string | null): ScoredQuestionResult {
  const comparison =
    submittedAnswer === null
      ? {
          isCorrect: false,
          normalizedSubmitted: "",
          normalizedCorrect: question.correctAnswer,
          feedbackTip: null,
        }
      : compareQuestionAnswer(question, submittedAnswer);

  return {
    questionId: question.id,
    isCorrect: submittedAnswer !== null && comparison.isCorrect,
    submittedAnswer,
    correctAnswer: question.correctAnswer,
    feedbackTip: comparison.feedbackTip,
  };
}

export async function rebuildAttemptResults(
  contentRepository: ContentRepository,
  attempt: TestAttempt,
): Promise<TestAttempt> {
  const repairedResults: ScoredQuestionResult[] = [];

  for (const questionId of attempt.questionIds) {
    const question = await contentRepository.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Unknown question: ${questionId}`);
    }

    const submittedAnswer = attempt.answers[questionId]?.response?.trim()
      ? attempt.answers[questionId]?.response ?? null
      : null;
    repairedResults.push(buildScoredResult(question, submittedAnswer));
  }

  const totalQuestions = repairedResults.length;
  const correctCount = repairedResults.filter((result) => result.isCorrect).length;
  const unansweredCount = repairedResults.filter((result) => result.submittedAnswer === null).length;
  const incorrectCount = totalQuestions - correctCount - unansweredCount;
  const percentage = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  return {
    ...attempt,
    results: repairedResults,
    summary: {
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage,
    },
  };
}

export function attemptsEqual(left: TestAttempt, right: TestAttempt): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildProgressRecordFromAttempts(
  conceptId: string,
  attempts: TestAttempt[],
): ProgressRecord | null {
  const conceptAttempts = attempts
    .filter((attempt) => attempt.conceptId === conceptId)
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

  const latestAttempt = conceptAttempts[0];
  if (!latestAttempt?.conceptId) {
    return null;
  }

  const bestScore = conceptAttempts.reduce(
    (currentBest, item) =>
      currentBest === null ? item.summary.percentage : Math.max(currentBest, item.summary.percentage),
    null as number | null,
  );

  return {
    studentId: latestAttempt.studentId,
    conceptId: latestAttempt.conceptId,
    courseId: latestAttempt.courseId,
    attemptCount: conceptAttempts.length,
    latestScore: latestAttempt.summary.percentage,
    bestScore,
    masteryStatus: getMasteryStatus(latestAttempt.summary.percentage, conceptAttempts.length),
    lastAttemptedAt: latestAttempt.submittedAt,
    lastModified: latestAttempt.submittedAt,
  };
}

import type { Question, TestAttempt } from "../domain/models";

export const SMART_RETRY_MIN_MISSED_ATTEMPTS = 2;
export const SMART_RETRY_RECENT_ATTEMPT_WINDOW = 3;
export const SMART_RETRY_PASSING_SCORE = 70;
export const SMART_RETRY_SET_SIZE = 5;
export const SMART_RETRY_MISSED_TYPE_COUNT = 3;
export const SMART_RETRY_EXIT_CORRECT_COUNT = 4;
export const SMART_RETRY_MAX_CYCLES = 2;

export interface SmartRetrySet {
  questionIds: string[];
  missedTypeQuestionIds: string[];
  scaffoldQuestionId: string;
  transferQuestionId: string;
}

export interface SmartRetryExitDecision {
  shouldExit: boolean;
  retryCount: number;
  reason?: "passed" | "retry_limit";
}

export interface SmartRetryRecommendation {
  conceptId: string;
  recentAttemptCount: number;
  missedAttemptCount: number;
  retryCycle: number;
  retrySet: SmartRetrySet;
  explanation: string;
  shortDescription: string;
}

function sortAttemptsByMostRecent(attempts: TestAttempt[]): TestAttempt[] {
  return [...attempts].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

function getRetryAttempts(attempts: TestAttempt[]): TestAttempt[] {
  return sortAttemptsByMostRecent(attempts).filter((attempt) => attempt.smartRetry?.kind === "targeted");
}

function pickUnusedQuestion(
  questions: Question[],
  usedIds: Set<string>,
  predicate?: (question: Question) => boolean,
  direction: "forward" | "backward" = "forward",
): Question | null {
  const orderedQuestions = direction === "forward" ? questions : [...questions].reverse();
  return (
    orderedQuestions.find(
      (question) => !usedIds.has(question.id) && (predicate ? predicate(question) : true),
    ) ?? null
  );
}

function matchesMissedType(question: Question, reference: Question): boolean {
  if (question.id === reference.id) {
    return true;
  }

  if (
    question.questionType === reference.questionType &&
    question.answerType === reference.answerType
  ) {
    return true;
  }

  return question.tags.some((tag) => reference.tags.includes(tag));
}

function getRecentIncorrectQuestionIds(attempts: TestAttempt[]): string[] {
  const questionIds: string[] = [];
  const seen = new Set<string>();

  for (const attempt of sortAttemptsByMostRecent(attempts).slice(0, SMART_RETRY_RECENT_ATTEMPT_WINDOW)) {
    for (const result of attempt.results) {
      if (result.isCorrect || seen.has(result.questionId)) {
        continue;
      }

      seen.add(result.questionId);
      questionIds.push(result.questionId);
    }
  }

  return questionIds;
}

export function buildRetrySet(
  conceptId: string,
  questions: Question[],
  attempts: TestAttempt[],
): SmartRetrySet {
  const conceptQuestions = questions.filter((question) => question.conceptId === conceptId);
  if (conceptQuestions.length < SMART_RETRY_SET_SIZE) {
    throw new Error(`Smart Retry requires at least ${SMART_RETRY_SET_SIZE} questions for ${conceptId}.`);
  }

  const questionById = Object.fromEntries(
    conceptQuestions.map((question) => [question.id, question] as const),
  );
  const recentIncorrectQuestions = getRecentIncorrectQuestionIds(attempts)
    .map((questionId) => questionById[questionId])
    .filter((question): question is Question => Boolean(question));
  const missedTypeCandidates: Question[] = [];
  const missedTypeCandidateIds = new Set<string>();

  for (const incorrectQuestion of recentIncorrectQuestions) {
    for (const candidate of conceptQuestions) {
      if (
        missedTypeCandidateIds.has(candidate.id) ||
        !matchesMissedType(candidate, incorrectQuestion)
      ) {
        continue;
      }

      missedTypeCandidates.push(candidate);
      missedTypeCandidateIds.add(candidate.id);
    }
  }

  for (const question of conceptQuestions) {
    if (missedTypeCandidates.length >= SMART_RETRY_MISSED_TYPE_COUNT) {
      break;
    }

    if (!missedTypeCandidateIds.has(question.id)) {
      missedTypeCandidates.push(question);
      missedTypeCandidateIds.add(question.id);
    }
  }

  const missedTypeQuestionIds = missedTypeCandidates
    .slice(0, SMART_RETRY_MISSED_TYPE_COUNT)
    .map((question) => question.id);
  const usedQuestionIds = new Set(missedTypeQuestionIds);

  const scaffoldQuestion =
    pickUnusedQuestion(
      conceptQuestions,
      usedQuestionIds,
      (question) => question.difficulty === "easy",
    ) ??
    pickUnusedQuestion(
      conceptQuestions,
      usedQuestionIds,
      (question) => question.difficulty === "medium",
    ) ??
    pickUnusedQuestion(conceptQuestions, usedQuestionIds);

  if (!scaffoldQuestion) {
    throw new Error(`Unable to build Smart Retry scaffold question for ${conceptId}.`);
  }
  usedQuestionIds.add(scaffoldQuestion.id);

  const transferQuestion =
    pickUnusedQuestion(
      conceptQuestions,
      usedQuestionIds,
      (question) => question.difficulty === "challenge",
    ) ??
    pickUnusedQuestion(
      conceptQuestions,
      usedQuestionIds,
      (question) => question.difficulty === "hard",
    ) ??
    pickUnusedQuestion(conceptQuestions, usedQuestionIds, undefined, "backward");

  if (!transferQuestion) {
    throw new Error(`Unable to build Smart Retry transfer question for ${conceptId}.`);
  }
  usedQuestionIds.add(transferQuestion.id);

  const questionIds = [
    ...missedTypeQuestionIds,
    scaffoldQuestion.id,
    transferQuestion.id,
  ];

  return {
    questionIds,
    missedTypeQuestionIds,
    scaffoldQuestionId: scaffoldQuestion.id,
    transferQuestionId: transferQuestion.id,
  };
}

export function shouldExitRetry(attempts: TestAttempt[]): SmartRetryExitDecision {
  const retryAttempts = getRetryAttempts(attempts);
  const latestRetry = retryAttempts[0];

  if (latestRetry && latestRetry.summary.correctCount >= SMART_RETRY_EXIT_CORRECT_COUNT) {
    return {
      shouldExit: true,
      retryCount: retryAttempts.length,
      reason: "passed",
    };
  }

  if (retryAttempts.length >= SMART_RETRY_MAX_CYCLES) {
    return {
      shouldExit: true,
      retryCount: retryAttempts.length,
      reason: "retry_limit",
    };
  }

  return {
    shouldExit: false,
    retryCount: retryAttempts.length,
  };
}

export function getSmartRetryRecommendation(
  attempts: TestAttempt[],
  questions: Question[],
): SmartRetryRecommendation | null {
  const exitDecision = shouldExitRetry(attempts);
  if (exitDecision.shouldExit) {
    return null;
  }

  const recentAttempts = sortAttemptsByMostRecent(attempts).slice(
    0,
    SMART_RETRY_RECENT_ATTEMPT_WINDOW,
  );
  const conceptId = recentAttempts[0]?.conceptId;

  if (!conceptId || recentAttempts.length < SMART_RETRY_MIN_MISSED_ATTEMPTS) {
    return null;
  }

  const missedAttempts = recentAttempts.filter(
    (attempt) => attempt.summary.percentage < SMART_RETRY_PASSING_SCORE,
  );

  if (missedAttempts.length < SMART_RETRY_MIN_MISSED_ATTEMPTS) {
    return null;
  }

  const retrySet = buildRetrySet(conceptId, questions, recentAttempts);
  const retryCycle = exitDecision.retryCount + 1;

  return {
    conceptId,
    recentAttemptCount: recentAttempts.length,
    missedAttemptCount: missedAttempts.length,
    retryCycle,
    retrySet,
    explanation: `Recommended because this concept was missed in ${missedAttempts.length} of your last ${recentAttempts.length} attempts. This is a short 5-question targeted retry, and then you will return to your normal next step.`,
    shortDescription: "5-question targeted retry",
  };
}

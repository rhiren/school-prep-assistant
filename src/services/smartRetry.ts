import type {
  Concept,
  DifficultyProfile,
  Question,
  SkillTag,
  SmartRetryOutcome,
  SmartRetryStartState,
  TestAttempt,
} from "../domain/models";

export const SMART_RETRY_MIN_MISSED_ATTEMPTS = 2;
export const SMART_RETRY_RECENT_ATTEMPT_WINDOW = 3;
export const SMART_RETRY_PASSING_SCORE = 70;
export const SMART_RETRY_SET_SIZE = 5;
export const SMART_RETRY_MISSED_TYPE_COUNT = 4;
export const SMART_RETRY_EXIT_CORRECT_COUNT = 4;
export const SMART_RETRY_MAX_CYCLES = 2;

type DifficultyBucket = "scaffold" | "standard" | "challenge";

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
  attemptCountBefore: number;
  retryCycle: number;
  retrySet: SmartRetrySet;
  explanation: string;
  shortDescription: string;
  weakSkills: SkillTag[];
  startState: SmartRetryStartState;
}

export interface SkillPerformanceEntry {
  correct: number;
  incorrect: number;
}

export type SkillPerformance = Partial<Record<SkillTag, SkillPerformanceEntry>>;

export interface DifficultyAdjustment {
  scaffoldMode: "strong" | "balanced";
  allowChallenge: boolean;
}

export type RetryHistory = SmartRetryOutcome[];

interface DifficultyPerformanceEntry {
  correct: number;
  incorrect: number;
}

type DifficultyPerformance = Record<DifficultyBucket, DifficultyPerformanceEntry>;

function sortAttemptsByMostRecent(attempts: TestAttempt[]): TestAttempt[] {
  return [...attempts].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

function getRetryAttempts(attempts: TestAttempt[]): TestAttempt[] {
  return sortAttemptsByMostRecent(attempts).filter((attempt) => attempt.smartRetry?.kind === "targeted");
}

function buildDefaultDifficultyProfile(): DifficultyProfile {
  return {
    scaffold: true,
    standard: true,
    challenge: true,
  };
}

function normalizeDifficultyProfile(profile?: DifficultyProfile): DifficultyProfile {
  return {
    scaffold: profile?.scaffold !== false,
    standard: profile?.standard !== false,
    challenge: profile?.challenge !== false,
  };
}

function buildDefaultDifficultyPerformance(): DifficultyPerformance {
  return {
    scaffold: { correct: 0, incorrect: 0 },
    standard: { correct: 0, incorrect: 0 },
    challenge: { correct: 0, incorrect: 0 },
  };
}

function getAttemptWeight(index: number): number {
  return index < SMART_RETRY_RECENT_ATTEMPT_WINDOW ? 2 : 1;
}

function toDifficultyBucket(
  difficulty: Question["difficulty"] | undefined,
): DifficultyBucket {
  if (difficulty === "challenge") {
    return "challenge";
  }

  if (difficulty === "medium" || difficulty === "hard") {
    return "standard";
  }

  return "scaffold";
}

export function getQuestionSkillTags(
  question: Pick<Question, "skillTags" | "tags">,
  concept: Pick<Concept, "skillTags"> | null,
): SkillTag[] {
  if (question.skillTags?.length) {
    return question.skillTags;
  }

  if (concept?.skillTags?.length) {
    return concept.skillTags;
  }

  return question.tags.filter(
    (tag): tag is SkillTag =>
      tag === "computation" ||
      tag === "conceptual" ||
      tag === "word-problem" ||
      tag === "multi-step" ||
      tag === "graph" ||
      tag === "visual",
  );
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

export function buildSkillPerformance(
  conceptId: string,
  attempts: TestAttempt[],
  concept: Pick<Concept, "id" | "skillTags"> | null,
): SkillPerformance {
  const skillPerformance: SkillPerformance = {};
  const conceptAttempts = sortAttemptsByMostRecent(attempts).filter(
    (attempt) => attempt.conceptId === conceptId,
  );

  for (const [attemptIndex, attempt] of conceptAttempts.entries()) {
    const weight = getAttemptWeight(attemptIndex);

    for (const result of attempt.results) {
      if (result.submittedAnswer === null) {
        continue;
      }

      const skillTags = (result.skillTags?.length ? result.skillTags : concept?.skillTags) ?? [];
      for (const skillTag of skillTags) {
        skillPerformance[skillTag] ??= { correct: 0, incorrect: 0 };
        if (result.isCorrect) {
          skillPerformance[skillTag]!.correct += weight;
        } else {
          skillPerformance[skillTag]!.incorrect += weight;
        }
      }
    }
  }

  return skillPerformance;
}

function buildDifficultyPerformance(
  conceptId: string,
  attempts: TestAttempt[],
): DifficultyPerformance {
  const difficultyPerformance = buildDefaultDifficultyPerformance();
  const conceptAttempts = sortAttemptsByMostRecent(attempts).filter(
    (attempt) => attempt.conceptId === conceptId,
  );

  for (const [attemptIndex, attempt] of conceptAttempts.entries()) {
    const weight = getAttemptWeight(attemptIndex);
    for (const result of attempt.results) {
      if (result.submittedAnswer === null) {
        continue;
      }

      const bucket = toDifficultyBucket(result.difficulty);
      if (result.isCorrect) {
        difficultyPerformance[bucket].correct += weight;
      } else {
        difficultyPerformance[bucket].incorrect += weight;
      }
    }
  }

  return difficultyPerformance;
}

function isWeakSkillEntry(counts: SkillPerformanceEntry | undefined): boolean {
  if (!counts) {
    return false;
  }

  const total = counts.correct + counts.incorrect;
  return counts.incorrect >= 2 && counts.incorrect / Math.max(1, total) >= 0.6;
}

export function getWeakSkills(
  conceptId: string,
  attempts: TestAttempt[],
  concept: Pick<Concept, "id" | "skillTags"> | null,
): SkillTag[] {
  const skillPerformance = buildSkillPerformance(conceptId, attempts, concept);

  return Object.entries(skillPerformance)
    .filter(([, counts]) => isWeakSkillEntry(counts))
    .sort((left, right) => {
      const rightCounts = right[1]!;
      const leftCounts = left[1]!;
      const rightRatio = rightCounts.incorrect / Math.max(1, rightCounts.correct + rightCounts.incorrect);
      const leftRatio = leftCounts.incorrect / Math.max(1, leftCounts.correct + leftCounts.incorrect);
      return (
        rightRatio - leftRatio ||
        rightCounts.incorrect - leftCounts.incorrect ||
        leftCounts.correct - rightCounts.correct ||
        left[0].localeCompare(right[0])
      );
    })
    .map(([skillTag]) => skillTag as SkillTag);
}

export function getDifficultyAdjustment(
  skillPerformance: SkillPerformance,
  attempts: TestAttempt[],
  conceptId: string,
): DifficultyAdjustment {
  const difficultyPerformance = buildDifficultyPerformance(conceptId, attempts);
  const scaffoldTotal =
    difficultyPerformance.scaffold.correct + difficultyPerformance.scaffold.incorrect;
  const standardTotal =
    difficultyPerformance.standard.correct + difficultyPerformance.standard.incorrect;
  const standardAccuracy =
    standardTotal === 0
      ? 0
      : difficultyPerformance.standard.correct / standardTotal;
  const hasWeakSkill = Object.values(skillPerformance).some((counts) => isWeakSkillEntry(counts));

  return {
    scaffoldMode:
      scaffoldTotal > 0 &&
      difficultyPerformance.scaffold.incorrect > difficultyPerformance.scaffold.correct
        ? "strong"
        : hasWeakSkill
          ? "balanced"
          : "strong",
    allowChallenge: standardTotal > 0 && standardAccuracy >= 0.5,
  };
}

function getDifficultyPreference(
  bucket: "scaffold" | "scaffold_standard" | "standard" | "challenge",
  profile?: DifficultyProfile,
  adjustment?: DifficultyAdjustment,
): Array<Question["difficulty"]> {
  const normalizedProfile = normalizeDifficultyProfile(profile);

  if (bucket === "challenge") {
    if (!adjustment?.allowChallenge) {
      if (normalizedProfile.standard) {
        return ["medium", "hard", "easy", "challenge"];
      }

      return ["easy", "medium", "hard", "challenge"];
    }

    if (normalizedProfile.challenge) {
      return ["challenge", "hard", "medium", "easy"];
    }

    if (normalizedProfile.standard) {
      return ["hard", "medium", "easy"];
    }

    return ["easy", "medium", "hard", "challenge"];
  }

  if (bucket === "standard") {
    if (normalizedProfile.standard) {
      return ["medium", "hard", "easy", "challenge"];
    }

    if (normalizedProfile.scaffold) {
      return ["easy", "medium", "hard", "challenge"];
    }

    return ["challenge", "hard", "medium", "easy"];
  }

  if (bucket === "scaffold") {
    if (adjustment?.scaffoldMode === "balanced" && normalizedProfile.standard) {
      return ["medium", "easy", "hard", "challenge"];
    }

    return ["easy", "medium", "hard", "challenge"];
  }

  if (normalizedProfile.scaffold && normalizedProfile.standard) {
    return ["easy", "medium", "hard", "challenge"];
  }

  if (normalizedProfile.standard) {
    return ["medium", "hard", "easy", "challenge"];
  }

  return ["easy", "medium", "hard", "challenge"];
}

function pickByDifficulty(
  questions: Question[],
  usedIds: Set<string>,
  difficultyBucket: "scaffold" | "scaffold_standard" | "standard" | "challenge",
  profile?: DifficultyProfile,
  adjustment?: DifficultyAdjustment,
  predicate?: (question: Question) => boolean,
): Question | null {
  const difficultyOrder = getDifficultyPreference(difficultyBucket, profile, adjustment);

  for (const difficulty of difficultyOrder) {
    const match = questions.find(
      (question) =>
        !usedIds.has(question.id) &&
        question.difficulty === difficulty &&
        (predicate ? predicate(question) : true),
    );
    if (match) {
      return match;
    }
  }

  return (
    questions.find(
      (question) => !usedIds.has(question.id) && (predicate ? predicate(question) : true),
    ) ?? null
  );
}

function formatSkillName(skill: SkillTag): string {
  switch (skill) {
    case "word-problem":
      return "word problems";
    case "multi-step":
      return "multi-step problems";
    case "graph":
      return "graph questions";
    case "visual":
      return "visual questions";
    case "computation":
      return "computation";
    case "conceptual":
      return "conceptual questions";
    default:
      return skill;
  }
}

function joinSkillList(skills: SkillTag[]): string {
  const labels = skills.map(formatSkillName);
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function buildRetrySet(
  conceptId: string,
  questions: Question[],
  attempts: TestAttempt[],
  options?: {
    concept?: Pick<Concept, "id" | "skillTags"> | null;
    difficultyProfile?: DifficultyProfile;
    weakSkills?: SkillTag[];
  },
): SmartRetrySet {
  const conceptQuestions = questions.filter((question) => question.conceptId === conceptId);
  if (conceptQuestions.length < SMART_RETRY_SET_SIZE) {
    throw new Error(`Smart Retry requires at least ${SMART_RETRY_SET_SIZE} questions for ${conceptId}.`);
  }

  const weakSkills =
    options?.weakSkills ??
    getWeakSkills(conceptId, attempts, options?.concept ?? null);
  const difficultyProfile = options?.difficultyProfile ?? buildDefaultDifficultyProfile();
  const skillPerformance = buildSkillPerformance(conceptId, attempts, options?.concept ?? null);
  const difficultyAdjustment = getDifficultyAdjustment(skillPerformance, attempts, conceptId);
  const fallbackToGeneric = weakSkills.length === 0;

  const questionById = Object.fromEntries(
    conceptQuestions.map((question) => [question.id, question] as const),
  );
  const recentIncorrectQuestions = sortAttemptsByMostRecent(attempts)
    .slice(0, SMART_RETRY_RECENT_ATTEMPT_WINDOW)
    .flatMap((attempt) =>
      attempt.results
        .filter((result) => !result.isCorrect)
        .map((result) => {
          const question = questionById[result.questionId];
          return question
            ? {
                question,
                skillTags:
                  (result.skillTags?.length
                    ? result.skillTags
                    : getQuestionSkillTags(question, options?.concept ?? null)) ?? [],
              }
            : null;
        })
        .filter((entry): entry is { question: Question; skillTags: SkillTag[] } => Boolean(entry)),
    );
  const missedTypeCandidates: Question[] = [];
  const missedTypeCandidateIds = new Set<string>();
  const weakSkillReferences =
    weakSkills.length > 0
      ? recentIncorrectQuestions.filter((entry) =>
          entry.skillTags.some((skillTag) => weakSkills.includes(skillTag)),
        )
      : [];
  const referenceQuestions =
    weakSkillReferences.length > 0
      ? weakSkillReferences.map((entry) => entry.question)
      : recentIncorrectQuestions.map((entry) => entry.question);

  for (const incorrectQuestion of referenceQuestions) {
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

  const usedQuestionIds = new Set<string>();
  const targetedQuestionIds: string[] = [];
  const targetedBuckets: Array<"scaffold" | "standard"> = fallbackToGeneric
    ? ["scaffold", "scaffold", "standard"]
    : ["scaffold", "scaffold", "standard", "standard"];
  const weakSkillPredicate = (question: Question) =>
    getQuestionSkillTags(question, options?.concept ?? null).some((tag) => weakSkills.includes(tag));

  for (const bucket of targetedBuckets) {
    const targetedQuestion =
      pickByDifficulty(
        missedTypeCandidates,
        usedQuestionIds,
        bucket,
        difficultyProfile,
        difficultyAdjustment,
        fallbackToGeneric ? undefined : weakSkillPredicate,
      ) ??
      pickByDifficulty(
        conceptQuestions,
        usedQuestionIds,
        bucket,
        difficultyProfile,
        difficultyAdjustment,
        fallbackToGeneric ? undefined : weakSkillPredicate,
      ) ??
      pickByDifficulty(
        missedTypeCandidates.length > 0 ? missedTypeCandidates : conceptQuestions,
        usedQuestionIds,
        bucket,
        difficultyProfile,
        difficultyAdjustment,
      );

    if (!targetedQuestion) {
      throw new Error(`Unable to build Smart Retry targeted question for ${conceptId}.`);
    }

    usedQuestionIds.add(targetedQuestion.id);
    targetedQuestionIds.push(targetedQuestion.id);
  }

  const missedTypeQuestionIds = targetedQuestionIds;

  const scaffoldQuestion =
    fallbackToGeneric
      ? pickByDifficulty(
          conceptQuestions,
          usedQuestionIds,
          "standard",
          difficultyProfile,
          difficultyAdjustment,
        ) ??
        pickUnusedQuestion(conceptQuestions, usedQuestionIds)
      : null;

  if (scaffoldQuestion) {
    usedQuestionIds.add(scaffoldQuestion.id);
  }

  const transferQuestion =
    pickByDifficulty(
      conceptQuestions,
      usedQuestionIds,
      difficultyAdjustment.allowChallenge ? "challenge" : "standard",
      difficultyProfile,
      difficultyAdjustment,
      fallbackToGeneric ? undefined : weakSkillPredicate,
    ) ??
    pickByDifficulty(
      conceptQuestions,
      usedQuestionIds,
      difficultyAdjustment.allowChallenge ? "challenge" : "standard",
      difficultyProfile,
      difficultyAdjustment,
    ) ??
    pickUnusedQuestion(conceptQuestions, usedQuestionIds, undefined, "backward");

  if (!transferQuestion) {
    throw new Error(`Unable to build Smart Retry transfer question for ${conceptId}.`);
  }

  const questionIds = [...missedTypeQuestionIds, transferQuestion.id];
  if (scaffoldQuestion) {
    questionIds.splice(missedTypeQuestionIds.length, 0, scaffoldQuestion.id);
  }

  return {
    questionIds,
    missedTypeQuestionIds,
    scaffoldQuestionId: scaffoldQuestion?.id ?? missedTypeQuestionIds[0] ?? transferQuestion.id,
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

export function buildRetryOutcome(
  attempt: TestAttempt,
  previousAttempts: TestAttempt[],
  concept?: Pick<Concept, "id" | "skillTags"> | null,
): SmartRetryOutcome | null {
  if (
    attempt.smartRetry?.kind !== "targeted" ||
    !attempt.conceptId ||
    !attempt.smartRetry.startState
  ) {
    return null;
  }

  const weakSkillsAfter = getWeakSkills(
    attempt.conceptId,
    [...previousAttempts, attempt],
    concept ?? null,
  );
  const retryScore = attempt.summary.correctCount;
  const attemptCountAfter = previousAttempts.filter(
    (previousAttempt) => previousAttempt.conceptId === attempt.conceptId,
  ).length + 1;
  const weakSkillsBefore = attempt.smartRetry.startState.weakSkillsBefore;

  return {
    conceptId: attempt.conceptId,
    retryScore,
    weakSkillsBefore,
    weakSkillsAfter,
    attemptCountBefore: attempt.smartRetry.startState.attemptCountBefore,
    attemptCountAfter,
    improved:
      retryScore >= SMART_RETRY_EXIT_CORRECT_COUNT ||
      weakSkillsAfter.length < weakSkillsBefore.length,
  };
}

export function getRetryHistory(
  conceptId: string,
  attempts: TestAttempt[],
): RetryHistory {
  return sortAttemptsByMostRecent(attempts)
    .filter((attempt) => attempt.conceptId === conceptId)
    .flatMap((attempt) =>
      attempt.smartRetry?.outcome ? [attempt.smartRetry.outcome] : [],
    );
}

export function getSmartRetryRecommendation(
  attempts: TestAttempt[],
  questions: Question[],
  concept?: Pick<Concept, "id" | "skillTags"> | null,
  difficultyProfile?: DifficultyProfile,
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

  const weakSkills = getWeakSkills(conceptId, attempts, concept ?? null);
  const retrySet = buildRetrySet(conceptId, questions, attempts, {
    concept: concept ?? null,
    difficultyProfile,
    weakSkills,
  });
  const retryCycle = exitDecision.retryCount + 1;
  const weakSkillsExplanation =
    weakSkills.length > 0
      ? ` You may need more practice with ${joinSkillList(weakSkills)}.`
      : "";

  return {
    conceptId,
    recentAttemptCount: recentAttempts.length,
    missedAttemptCount: missedAttempts.length,
    attemptCountBefore: attempts.filter((attempt) => attempt.conceptId === conceptId).length,
    retryCycle,
    retrySet,
    explanation: `Recommended because this concept was missed in ${missedAttempts.length} of your last ${recentAttempts.length} attempts.${weakSkillsExplanation} This is a short 5-question targeted retry, and then you will return to your normal next step.`,
    shortDescription: "5-question targeted retry",
    weakSkills,
    startState: {
      conceptId,
      weakSkillsBefore: weakSkills,
      attemptCountBefore: attempts.filter((attempt) => attempt.conceptId === conceptId).length,
    },
  };
}

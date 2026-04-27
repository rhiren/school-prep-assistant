import type { AnswerType, Question } from "../domain/models";
import { normalizeFraction } from "./normalizers/normalizeFraction";
import {
  normalizeNumber,
  type NormalizedAnswerValue,
} from "./normalizers/normalizeNumber";
import { normalizeRatio } from "./normalizers/normalizeRatio";

const EPSILON = 1e-9;

const RELATED_ANSWER_TYPES: Record<AnswerType, AnswerType[]> = {
  ratio: ["fraction"],
  fraction: ["ratio", "decimal"],
  decimal: ["fraction", "number"],
  number: ["decimal"],
};

export interface AnswerComparison {
  isCorrect: boolean;
  normalizedSubmitted: string;
  normalizedCorrect: string;
  feedbackTip: string | null;
}

function buildExactMatchComparison(
  submittedValue: string,
  correctValue: string,
): AnswerComparison {
  const normalizedSubmitted = submittedValue.trim();
  const normalizedCorrect = correctValue.trim();

  return {
    isCorrect: normalizedSubmitted !== "" && normalizedSubmitted === normalizedCorrect,
    normalizedSubmitted,
    normalizedCorrect,
    feedbackTip: null,
  };
}

export function normalizeAnswer(
  value: string,
  answerType: AnswerType,
): NormalizedAnswerValue | null {
  switch (answerType) {
    case "ratio":
      return normalizeRatio(value);
    case "fraction":
      return normalizeFraction(value);
    case "decimal":
    case "number":
      return normalizeNumber(value, answerType);
    default:
      return null;
  }
}

function areEquivalentTypes(left: AnswerType, right: AnswerType): boolean {
  return (
    left === right ||
    RELATED_ANSWER_TYPES[left].includes(right) ||
    RELATED_ANSWER_TYPES[right].includes(left)
  );
}

function areEquivalentValues(
  left: NormalizedAnswerValue,
  right: NormalizedAnswerValue,
): boolean {
  if (!areEquivalentTypes(left.answerType, right.answerType)) {
    return false;
  }

  if (left.answerType === right.answerType) {
    return left.canonical === right.canonical;
  }

  if (left.numericValue === null || right.numericValue === null) {
    return false;
  }

  return Math.abs(left.numericValue - right.numericValue) < EPSILON;
}

function getFormatTip(
  submitted: NormalizedAnswerValue,
  correct: NormalizedAnswerValue,
): string | null {
  if (submitted.wasSimplified) {
    return `Correct. A simplified form is ${submitted.canonical}.`;
  }

  if (submitted.answerType === "ratio" && submitted.notation === "slash-ratio") {
    return `Correct. Ratios are usually written with ":" like ${correct.canonical}.`;
  }

  if (submitted.answerType !== correct.answerType) {
    switch (correct.answerType) {
      case "ratio":
        return `Correct. Ratios are usually written with ":" like ${correct.canonical}.`;
      case "fraction":
        return `Correct. Fractions are usually written with "/" like ${correct.canonical}.`;
      case "decimal":
        return `Correct. This answer is usually written as a decimal like ${correct.canonical}.`;
      case "number":
        return `Correct. This answer is usually written as a whole number like ${correct.canonical}.`;
      default:
        return null;
    }
  }

  if (
    submitted.answerType === "number" &&
    submitted.notation === "decimal" &&
    correct.notation === "integer"
  ) {
    return `Correct. This answer is usually written without a decimal, like ${correct.canonical}.`;
  }

  return null;
}

export function compareAnswers(
  submittedValue: string,
  correctValue: string,
  answerType: AnswerType,
): AnswerComparison {
  const exactMatchComparison = buildExactMatchComparison(submittedValue, correctValue);
  if (exactMatchComparison.isCorrect) {
    return exactMatchComparison;
  }

  const correct = normalizeAnswer(correctValue, answerType);
  if (!correct) {
    return {
      isCorrect: false,
      normalizedSubmitted: submittedValue.trim(),
      normalizedCorrect: correctValue.trim(),
      feedbackTip: null,
    };
  }

  const submittedDirect = normalizeAnswer(submittedValue, answerType);
  if (submittedDirect && areEquivalentValues(submittedDirect, correct)) {
    return {
      isCorrect: true,
      normalizedSubmitted: submittedDirect.canonical,
      normalizedCorrect: correct.canonical,
      feedbackTip: getFormatTip(submittedDirect, correct),
    };
  }

  for (const alternateType of RELATED_ANSWER_TYPES[answerType]) {
    const alternate = normalizeAnswer(submittedValue, alternateType);
    if (alternate && areEquivalentValues(alternate, correct)) {
      return {
        isCorrect: true,
        normalizedSubmitted: alternate.canonical,
        normalizedCorrect: correct.canonical,
        feedbackTip: getFormatTip(alternate, correct),
      };
    }
  }

  return {
    isCorrect: false,
    normalizedSubmitted: submittedDirect?.canonical ?? submittedValue.trim(),
    normalizedCorrect: correct.canonical,
    feedbackTip: null,
  };
}

export function compareQuestionAnswer(
  question: Pick<Question, "answerType" | "correctAnswer" | "questionType">,
  submittedValue: string,
): AnswerComparison {
  const exactMatchComparison = buildExactMatchComparison(submittedValue, question.correctAnswer);

  if (exactMatchComparison.isCorrect) {
    return exactMatchComparison;
  }

  if (question.questionType === "multiple_choice") {
    return exactMatchComparison;
  }

  return compareAnswers(submittedValue, question.correctAnswer, question.answerType);
}

export function isRatioQuestion(question: Question): boolean {
  return question.answerType === "ratio";
}

export function usesFractionRatioNotation(value: string): boolean {
  return /^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(value.trim());
}

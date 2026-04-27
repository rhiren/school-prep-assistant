import { describe, expect, it } from "vitest";
import {
  compareAnswers,
  compareQuestionAnswer,
  normalizeAnswer,
  usesFractionRatioNotation,
} from "../utils/answerNormalization";

describe("normalizeAnswer", () => {
  it("trims whitespace and lowercases text", () => {
    expect(normalizeAnswer(" 2 ", "number")?.canonical).toBe("2");
  });

  it("treats equivalent numeric strings as equal", () => {
    expect(normalizeAnswer("2.0", "number")?.canonical).toBe("2");
    expect(normalizeAnswer("02", "number")?.canonical).toBe("2");
  });

  it("normalizes numeric-looking text answers too", () => {
    expect(normalizeAnswer(" 2.0 ", "decimal")?.canonical).toBe("2");
  });

  it("normalizes ratio formatting into canonical ratio form", () => {
    expect(normalizeAnswer("2:3", "ratio")?.canonical).toBe("2:3");
    expect(normalizeAnswer(" 2 / 3 ", "ratio")?.canonical).toBe("2:3");
    expect(normalizeAnswer("2/3", "ratio")?.canonical).toBe("2:3");
    expect(normalizeAnswer("2.0 / 3.00", "ratio")?.canonical).toBe("2:3");
    expect(normalizeAnswer("4:6", "ratio")?.canonical).toBe("2:3");
  });

  it("detects fraction-style ratio input for student tips", () => {
    expect(usesFractionRatioNotation("2/3")).toBe(true);
    expect(usesFractionRatioNotation("2 : 3")).toBe(false);
  });

  it("accepts equivalent cross-type math formats and returns feedback tips", () => {
    const ratioComparison = compareAnswers("2/3", "2:3", "ratio");
    expect(ratioComparison.isCorrect).toBe(true);
    expect(ratioComparison.feedbackTip).toContain('":"');

    const fractionComparison = compareAnswers("0.5", "1/2", "fraction");
    expect(fractionComparison.isCorrect).toBe(true);
    expect(fractionComparison.feedbackTip).toContain('"/"');

    const numberComparison = compareAnswers("2.0", "2", "number");
    expect(numberComparison.isCorrect).toBe(true);
    expect(numberComparison.feedbackTip).toContain("without a decimal");
  });

  it("accepts simplified-equivalent ratios and fractions with a simplification tip", () => {
    const ratioComparison = compareAnswers("4:6", "2:3", "ratio");
    expect(ratioComparison.isCorrect).toBe(true);
    expect(ratioComparison.feedbackTip).toContain("simplified form is 2:3");

    const fractionComparison = compareAnswers("6/8", "3/4", "fraction");
    expect(fractionComparison.isCorrect).toBe(true);
    expect(fractionComparison.feedbackTip).toContain("simplified form is 3/4");
  });

  it("accepts exact literal matches even when the authored answer type is numeric", () => {
    const comparison = compareQuestionAnswer(
      {
        questionType: "multiple_choice",
        answerType: "number",
        correctAnswer: "Divide 14 by 7",
      },
      "Divide 14 by 7",
    );

    expect(comparison.isCorrect).toBe(true);
    expect(comparison.feedbackTip).toBeNull();
  });

  it("scores multiple-choice questions by exact option identity instead of numeric equivalence", () => {
    const comparison = compareQuestionAnswer(
      {
        questionType: "multiple_choice",
        answerType: "decimal",
        correctAnswer: "0.5",
      },
      "0.50",
    );

    expect(comparison.isCorrect).toBe(false);
  });
});

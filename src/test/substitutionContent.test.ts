import { describe, expect, it } from "vitest";

interface Item {
  id: string;
  questionText: string;
  correctAnswer: string;
  options: string[];
}
interface Bank { conceptId: string; questions: Item[] }

const banks = Object.values(import.meta.glob<Bank>(
  "../../public/content/math/course3/test-sets/*.json",
  { eager: true, import: "default" },
)).filter((bank) => bank.conceptId === "concept-solve-systems-substitution");

// Intentionally derive the solution from visible text, not generator metadata.
function validate(question: Item) {
  const equations = [...question.questionText.matchAll(/y = (-?\d*)x(?: ([+-]) (\d+))?/g)];
  if (equations.length !== 2) throw new Error("Two visible equations required");
  const coefficients = equations.map((match) => ({
    m: match[1] === "" ? 1 : match[1] === "-" ? -1 : Number(match[1]),
    b: (match[2] === "-" ? -1 : 1) * Number(match[3] ?? 0),
  }));
  const [a, b] = coefficients;
  if (a.m === b.m) throw new Error("Expected a unique solution");
  const x = (b.b - a.b) / (a.m - b.m);
  const y = a.m * x + a.b;
  const prompt = question.questionText;
  const pair = /ordered.pair|[Ww]hich point|[Ww]hat is the solution/.test(prompt);
  const scalar = /[Ww]hat x-value/.test(prompt);
  const equation = /which equation/i.test(prompt);
  if ([pair, scalar, equation].filter(Boolean).length !== 1) throw new Error("Ambiguous requested answer format");
  const expected = pair ? `(${x}, ${y})` : scalar ? String(x)
    : `${equations[0][0].slice(4)} = ${equations[1][0].slice(4)}`;
  if (question.correctAnswer !== expected) throw new Error("Incorrect mathematical answer");
  const shape = pair ? /^\(-?\d+(?:\.\d+)?, -?\d+(?:\.\d+)?\)$/
    : scalar ? /^-?\d+(?:\.\d+)?$/ : /^[^=]+ = [^=]+$/;
  if (!question.options.every((option) => shape.test(option))) throw new Error("Options do not match requested format");
  if (question.options.filter((option) => option === expected).length !== 1) throw new Error("Exactly one correct option required");
  // Each point choice is independently checked in both original equations.
  if (pair) {
    const valid = question.options.filter((option) => {
      const [px, py] = option.slice(1, -1).split(", ").map(Number);
      return coefficients.every(({ m, b: intercept }) => m * px + intercept === py);
    });
    if (valid.length !== 1 || valid[0] !== expected) throw new Error("Ambiguous point choices");
  }
}

describe("substitution prompt and answer contracts", () => {
  it("checks every published substitution question independently", () => {
    expect(banks.length).toBeGreaterThanOrEqual(2);
    for (const bank of banks) {
      for (const question of bank.questions) {
        expect(() => validate(question), question.id).not.toThrow();
      }
    }
  });

  it("rejects the original missing-equation and switched-format defects", () => {
    const question = banks[0].questions[0];
    for (const questionText of [
      "A student sets the two expressions for y equal because both equal y. What solution should they find?",
      "After substituting, the x-value is 4. What full ordered-pair solution follows?",
      "Which answer checks in both equations: y = 2x - 2 and y = 4x - 8?",
    ]) expect(() => validate({ ...question, questionText })).toThrow();
    expect(() => validate({ ...question,
      questionText: "Use substitution on y = 4x - 18 and y = -x + 7. Which point makes both equations true?",
      correctAnswer: "4x - 18 = -x + 7",
      options: ["4x - 18 = -x + 7", "4 = -1", "4x - 18 = 7", "-x + 7 = -18"],
    })).toThrow();
  });

  it("rejects a swapped key even when it is an authored option", () => {
    const question = banks[0].questions[0];
    expect(() => validate({ ...question,
      correctAnswer: question.options.find((option) => option !== question.correctAnswer)!,
    })).toThrow("Incorrect mathematical answer");
  });
});

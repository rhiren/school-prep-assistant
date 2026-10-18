import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type AuthoredQuestion = { id: string; questionText: string; correctAnswer: string; options: string[]; difficulty: string };
const slugs = ["systems-infinitely-many-solutions", "choose-efficient-system-method", "systems-equations-word-problems", "unit4-equations-systems-mixed-review"];
function bank(slug: string, kind = "core"): AuthoredQuestion[] {
  return JSON.parse(readFileSync(`public/content/math/course3/test-sets/course3-${slug}-${kind}.json`, "utf8")).questions;
}

describe("Unit 4 release content", () => {
  it("rejects repeating answer blocks of any order, including CADB/CADB", () => {
    for (const slug of slugs) for (const kind of ["core", "review"]) {
      const questions = bank(slug, kind);
      const sequence = questions.map(q => q.options.indexOf(q.correctAnswer));
      expect(sequence).not.toContain(-1);
      for (let k = 2; k <= 4; k++) for (let i = 0; i + 2*k <= sequence.length; i++) {
        expect(sequence.slice(i, i+k), `${slug}/${kind} repeated ${k}-position block at ${i}`).not.toEqual(sequence.slice(i+k, i+2*k));
      }
      expect(new Set(questions.map(q => q.questionText)).size).toBe(questions.length);
      for (const q of questions) expect(new Set(q.options).size, q.id).toBe(4);
    }
  });

  it("checks independently calculated answers across all four packs and difficulty stages", () => {
    const cases: [string, number, string][] = [
      [slugs[0], 2, "21"],
      [slugs[0], 10, "24"],
      [slugs[0], 12, "(4, 8)"],
      [slugs[0], 36, "(6, 24)"],
      [slugs[0], 37, "13"],
      [slugs[1], 13, "7"],
      [slugs[1], 14, "-4x + 6y = -12"],
      [slugs[1], 36, "(10, 4)"],
      [slugs[1], 38, "x = 1.5, y = 2.75; equate the expressions for y."],
      [slugs[2], 3, "6"],
      [slugs[2], 10, "2"],
      [slugs[2], 13, "3"],
      [slugs[2], 36, "7"],
      [slugs[2], 39, "(4, 7)"],
      [slugs[3], 0, "2"],
      [slugs[3], 11, "8"],
      [slugs[3], 12, "(2, 5)"],
      [slugs[3], 35, "The constant should be +4; x = -1."],
      [slugs[3], 37, "(4, 4)"],
    ];
    for (const [slug, index, answer] of cases) expect(bank(slug)[index].correctAnswer, `${slug} question ${index+1}`).toBe(answer);
  });

  it("verifies every generated ticket, wheel, mixture, and fundraiser solution against its original constraints", () => {
    let checked = 0;
    for (const kind of ["core", "review"]) for (const q of bank(slugs[2], kind)) {
      const text = q.questionText;
      if (text.startsWith("A show sells")) {
        const numbers = text.match(/\d+/g)!.map(Number);
        const [total, adultPrice, childPrice, revenue] = numbers;
        const adults = Number(q.correctAnswer);
        expect(adultPrice*adults + childPrice*(total-adults), q.id).toBe(revenue);
        checked++;
      } else if (text.startsWith("A rack holds")) {
        const [vehicles, wheels] = text.match(/\d+/g)!.map(Number);
        const tricycles = Number(q.correctAnswer);
        expect(2*(vehicles-tricycles)+3*tricycles, q.id).toBe(wheels);
        checked++;
      } else if (text.startsWith("A school needs")) {
        const [mass, targetPrice, nutPrice, cerealPrice] = text.match(/\d+/g)!.map(Number);
        const nuts = Number(q.correctAnswer);
        expect(nuts*nutPrice+(mass-nuts)*cerealPrice, q.id).toBe(mass*targetPrice);
        checked++;
      } else if (text.startsWith("A fundraiser")) {
        const [xp, yp, total, revenue] = text.match(/\d+/g)!.map(Number);
        const [x,y] = q.correctAnswer.match(/\d+/g)!.map(Number);
        expect(x+y, q.id).toBe(total);
        expect(xp*x+yp*y, q.id).toBe(revenue);
        checked++;
      }
    }
    expect(checked).toBe(22);
  });
});

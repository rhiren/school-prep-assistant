import { readFile, writeFile } from "node:fs/promises";

const contentRoot = "public/content/math/course3";
const testSetDir = `${contentRoot}/test-sets`;
const tutorialDir = `${contentRoot}/tutorials`;

function point(x, y) {
  return `(${x}, ${y})`;
}

function term(coefficient) {
  if (coefficient === 1) return "x";
  if (coefficient === -1) return "-x";
  if (coefficient === 0) return "0x";
  return `${coefficient}x`;
}

function equation(m, b) {
  if (m === 0) return `y = ${b}`;
  if (b === 0) return `y = ${term(m)}`;
  return b > 0 ? `y = ${term(m)} + ${b}` : `y = ${term(m)} - ${Math.abs(b)}`;
}

function valueAt(m, b, x) {
  return m * x + b;
}

function fourUniqueOptions(correct, candidates) {
  const options = [correct];
  for (const candidate of candidates) {
    if (candidate !== correct && !options.includes(candidate)) {
      options.push(candidate);
    }
    if (options.length === 4) return options;
  }
  throw new Error(`Could not build options for ${correct}`);
}

function makeQuestion({ id, questionText, options, correctAnswer, difficulty, skillTags, explanation }) {
  if (new Set(options).size !== 4) {
    throw new Error(`${id} has duplicate options: ${options.join(" | ")}`);
  }
  if (!options.includes(correctAnswer)) {
    throw new Error(`${id} is missing correct answer: ${correctAnswer}`);
  }
  return {
    id,
    type: "multiple_choice",
    questionText,
    options,
    correctAnswer,
    difficulty,
    answerType: "number",
    skillTags,
    explanation,
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function longestCycle(sequence) {
  let longest = 0;
  for (let start = 0; start < sequence.length; start += 1) {
    let length = 1;
    for (let index = start + 1; index < sequence.length; index += 1) {
      if (sequence[index] !== ((sequence[index - 1] + 1) % 4)) break;
      length += 1;
    }
    longest = Math.max(longest, length);
  }
  return longest;
}

function longestRun(sequence) {
  let longest = 0;
  let current = 0;
  let previous = -1;
  for (const value of sequence) {
    current = value === previous ? current + 1 : 1;
    previous = value;
    longest = Math.max(longest, current);
  }
  return longest;
}

function sequencePasses(sequence) {
  if (longestCycle(sequence) > 2) return false;
  if (longestRun(sequence) > 2) return false;
  for (let start = 0; start <= sequence.length - 8; start += 1) {
    const counts = [0, 0, 0, 0];
    for (const value of sequence.slice(start, start + 8)) counts[value] += 1;
    if (Math.max(...counts) > 4) return false;
  }
  return true;
}

function targetCounts(length) {
  if (length === 50) return [13, 13, 12, 12];
  if (length === 20) return [5, 5, 5, 5];
  const base = Math.floor(length / 4);
  return [0, 1, 2, 3].map((index) => base + (index < length % 4 ? 1 : 0));
}

function answerSequence(length, seedText) {
  const values = targetCounts(length).flatMap((count, index) => Array(count).fill(index));
  for (let attempt = 0; attempt < 100000; attempt += 1) {
    const sequence = shuffle(values, rng(hashSeed(`${seedText}:strict:${attempt}`)));
    if (sequencePasses(sequence)) return sequence;
  }
  throw new Error(`Could not create answer sequence for ${seedText}`);
}

function placeCorrect(question, correctIndex) {
  const distractors = question.options.filter((option) => option !== question.correctAnswer);
  const ordered = shuffle(distractors, rng(hashSeed(`${question.id}:strict-distractors`)));
  ordered.splice(correctIndex, 0, question.correctAnswer);
  return { ...question, options: ordered };
}

function difficulty(index, kind) {
  if (kind === "review") return index < 8 ? "scaffold" : "standard";
  if (index < 10) return "scaffold";
  if (index < 35) return "standard";
  return "challenge";
}

function finalize(slug, kind, builders) {
  const questions = builders.map((builder, index) =>
    builder(`course3-${slug}-${kind}-${String(index + 1).padStart(3, "0")}`),
  );
  const sequence = answerSequence(questions.length, `${slug}-${kind}`);
  return questions.map((question, index) => placeCorrect(question, sequence[index]));
}

const solutions = [
  [-4, 3],
  [-3, -2],
  [-2, 5],
  [-1, 1],
  [0, -4],
  [1, 3],
  [2, -1],
  [3, 4],
  [4, -3],
  [5, 2],
  [-5, -1],
  [6, 1],
];

const slopePairs = [
  [1, -1],
  [2, -1],
  [-2, 1],
  [3, 1],
  [-1, 2],
  [1, 3],
  [-3, -1],
  [2, 4],
  [-2, -4],
  [4, -1],
  [1, -3],
  [3, -2],
];

function systemFrom(index) {
  const [x, y] = solutions[index % solutions.length];
  const [m1, m2] = slopePairs[index % slopePairs.length];
  const b1 = y - m1 * x;
  const b2 = y - m2 * x;
  return { x, y, m1, m2, b1, b2, eq1: equation(m1, b1), eq2: equation(m2, b2) };
}

function pointOptions(x, y) {
  return fourUniqueOptions(point(x, y), [
    point(y, x),
    point(x + 1, y),
    point(x, y + 1),
    point(-x, y),
    point(x, -y),
    point(x - 1, y + 2),
    point(x + 2, y - 1),
  ]);
}

function yesNoOptions(correct) {
  return fourUniqueOptions(correct, [
    "No; it satisfies only the first equation",
    "No; it satisfies only the second equation",
    "No; it satisfies neither equation",
    "Yes; it is the y-intercept of both lines",
    "Yes; every ordered pair solves both equations",
  ]);
}

function understandBuilders(kind) {
  const count = kind === "core" ? 50 : 20;
  return Array.from({ length: count }, (_, index) => (id) => {
    const s = systemFrom(index * 5 + 1);
    const d = difficulty(index, kind);
    const template = index % 10;
    const candidateX = template % 4 === 0 ? s.x + 1 : s.x;
    const candidateY = template % 4 === 0 ? s.y : s.y;
    const isSolution = candidateX === s.x && candidateY === s.y;
    const correctAnswer =
      template % 3 === 0
        ? point(s.x, s.y)
        : template % 3 === 1
          ? isSolution
            ? "Yes; it makes both equations true"
            : "No; it does not make both equations true"
          : "the point where the two lines intersect";
    const options =
      template % 3 === 0
        ? pointOptions(s.x, s.y)
        : template % 3 === 1
          ? yesNoOptions(correctAnswer)
          : fourUniqueOptions(correctAnswer, [
              "the point where one line crosses the y-axis",
              "the slope of the steeper line",
              "any point that satisfies the first equation",
              "the x-value where the first equation equals 0",
            ]);
    const questionText = [
      `The lines ${s.eq1} and ${s.eq2} intersect at ${point(s.x, s.y)}. What is the solution to the system?`,
      `Does ${point(candidateX, candidateY)} solve the system ${s.eq1} and ${s.eq2}?`,
      `What does the solution to a system of two linear equations represent on a graph?`,
      `A student says ${point(s.x, s.y)} solves ${s.eq1} and ${s.eq2}. What must be true?`,
      `Which ordered pair makes both ${s.eq1} and ${s.eq2} true?`,
      `If two lines intersect once, how many solutions does the system have?`,
      `The point ${point(s.x, s.y)} lies on both lines in a system. What does that point mean?`,
      `Which statement best describes a solution to two linear equations?`,
      `For the system ${s.eq1} and ${s.eq2}, what point should appear on both tables?`,
      `A graph shows two lines crossing at ${point(s.x, s.y)}. What ordered pair solves the system?`,
    ][template];
    const finalCorrect =
      template === 5
        ? "one solution"
        : template === 7
          ? "an ordered pair that makes both equations true"
          : correctAnswer;
    const finalOptions =
      template === 5
        ? fourUniqueOptions("one solution", ["no solution", "infinitely many solutions", "two solutions", "one solution for each line"])
        : template === 7
          ? fourUniqueOptions("an ordered pair that makes both equations true", [
              "an ordered pair that makes only one equation true",
              "the larger slope",
              "the y-intercept of the first line",
              "any point on either line",
            ])
          : options;
    return makeQuestion({
      id,
      questionText,
      options: finalOptions,
      correctAnswer: finalCorrect,
      difficulty: d,
      skillTags: ["systems", "graph", "conceptual"],
      explanation: "A solution to a system is an ordered pair that makes both equations true. On a graph, it is the intersection point.",
    });
  });
}

function graphingBuilders(kind) {
  const count = kind === "core" ? 50 : 20;
  return Array.from({ length: count }, (_, index) => (id) => {
    const s = systemFrom(index * 7 + 2);
    const d = difficulty(index, kind);
    const template = index % 10;
    const correctAnswer = template % 4 === 1 ? "graph both lines and find their intersection" : point(s.x, s.y);
    const options =
      template % 4 === 1
        ? fourUniqueOptions(correctAnswer, [
            "graph only the line with the larger slope",
            "add the two y-intercepts",
            "choose any point on either line",
            "set both slopes equal to zero",
          ])
        : pointOptions(s.x, s.y);
    const questionText = [
      `Solve the system by graphing: ${s.eq1} and ${s.eq2}. The lines intersect at which point?`,
      `Which graphing step solves a system of two linear equations?`,
      `A graph of ${s.eq1} and ${s.eq2} shows one crossing point. What is the solution?`,
      `The table for ${s.eq1} and the table for ${s.eq2} both include which ordered pair?`,
      `When graphing ${s.eq1} and ${s.eq2}, which point should be marked as the intersection?`,
      `A student graphs both lines but chooses ${point(s.x + 1, s.y)} as the answer. Why is ${point(s.x, s.y)} better?`,
      `Which ordered pair is on both lines ${s.eq1} and ${s.eq2}?`,
      `A coordinate grid shows ${s.eq1} crossing ${s.eq2} at ${point(s.x, s.y)}. What is the system's solution?`,
      `Use the graphing idea for ${s.eq1} and ${s.eq2}. Which point satisfies both lines?`,
      `What point would you circle on a graph to show the solution of ${s.eq1} and ${s.eq2}?`,
    ][template];
    return makeQuestion({
      id,
      questionText,
      options,
      correctAnswer,
      difficulty: d,
      skillTags: ["systems", "graphing", "intersection"],
      explanation: "To solve by graphing, graph both lines and read the point where they intersect. That point satisfies both equations.",
    });
  });
}

function substitutionBuilders(kind) {
  const count = kind === "core" ? 50 : 20;
  return Array.from({ length: count }, (_, index) => (id) => {
    const s = systemFrom(index * 11 + 3);
    const d = difficulty(index, kind);
    const template = index % 10;
    const sum = s.x + s.y;
    const difference = s.y - s.x;
    const correctAnswer =
      template % 5 === 1
        ? `${s.eq1.replace("y = ", "")} = ${s.eq2.replace("y = ", "")}`
        : template % 5 === 3
          ? String(s.x)
          : point(s.x, s.y);
    const options =
      template % 5 === 1
        ? fourUniqueOptions(correctAnswer, [
            `${s.eq1.replace("y = ", "")} = ${s.b2}`,
            `${s.eq2.replace("y = ", "")} = ${s.b1}`,
            `${s.m1} = ${s.m2}`,
            `${s.eq1.replace("y = ", "")} + ${s.eq2.replace("y = ", "")} = 0`,
          ])
        : template % 5 === 3
          ? fourUniqueOptions(String(s.x), [String(s.y), String(-s.x), String(s.x + 1), String(s.x - 1), String(sum), String(difference)])
          : pointOptions(s.x, s.y);
    const questionText = [
      `Use substitution to solve ${s.eq1} and ${s.eq2}. What is the solution?`,
      `For the system ${s.eq1} and ${s.eq2}, which equation should you solve after substituting one expression for y?`,
      `A system has ${s.eq1} and ${s.eq2}. After substitution, the solution is which ordered pair?`,
      `Substitute ${s.eq1.replace("y = ", "y = ")} into ${s.eq2}. What x-value solves the system?`,
      `Which ordered pair solves the system ${s.eq1} and ${s.eq2}?`,
      `For ${s.eq1} and ${s.eq2}, a student sets the two expressions for y equal. What ordered-pair solution should they find?`,
      `Use substitution on the system ${s.eq1} and ${s.eq2}. Which equation results when you set the two expressions for y equal?`,
      `For ${s.eq1} and ${s.eq2}, substitution gives x = ${s.x}. What full ordered-pair solution follows?`,
      `For ${s.eq1} and ${s.eq2}, what x-value makes the two expressions for y equal?`,
      `Solve by substitution: ${s.eq1}; ${s.eq2}. Which ordered pair is correct?`,
    ][template];
    return makeQuestion({
      id,
      questionText,
      options,
      correctAnswer,
      difficulty: d,
      skillTags: ["systems", "substitution", "algebra"],
      explanation: `Set ${s.eq1.replace("y = ", "")} = ${s.eq2.replace("y = ", "")}. Combining terms gives ${s.m1 - s.m2}x = ${s.b2 - s.b1}, so x = ${s.x}. Substituting into ${s.eq1} gives y = ${s.y}. The solution is ${point(s.x, s.y)}.`,
    });
  });
}

async function writeBank({ slug, conceptId, kind, title, description, questions }) {
  await writeFile(
    `${testSetDir}/course3-${slug}-${kind}.json`,
    `${JSON.stringify(
      {
        testId: `course3-${slug}-${kind}`,
        conceptId,
        type: kind === "core" ? "concept" : "review",
        title: `${title} ${kind === "core" ? "Core Test" : "Review Test"}`,
        description,
        questions,
      },
      null,
      2,
    )}\n`,
  );
}

async function writeTutorial(slug, body) {
  await writeFile(`${tutorialDir}/concept-${slug}.md`, body);
}

const packs = [
  {
    slug: "understand-solutions-systems",
    conceptId: "concept-understand-solutions-systems",
    title: "Understand Solutions to Systems",
    description: "Understand a system solution as an ordered pair that makes both equations true.",
    builder: understandBuilders,
    tutorial: `# Understand Solutions to Systems

## Big Idea

A system of linear equations is two or more equations considered at the same time. A solution must work in every equation in the system.

## What To Notice

- A solution is usually written as an ordered pair, such as \`(2, 5)\`.
- The ordered pair must make both equations true.
- On a graph, the solution is where the two lines intersect.
- If two lines cross once, the system has one solution.
- A point on only one line is not a solution to the system.

## Worked Example

Check whether \`(3, 4)\` solves:

\`y = x + 1\`

\`y = -2x + 10\`

First equation: \`4 = 3 + 1\`, so \`4 = 4\`.

Second equation: \`4 = -2(3) + 10\`, so \`4 = 4\`.

The point works in both equations, so \`(3, 4)\` is the solution.

## Common Mistake

Do not choose a point just because it lies on one line. A system solution must satisfy every equation.

## Quick Self-Check

Substitute the x-value and y-value into both equations. Both checks must be true.
`,
  },
  {
    slug: "solve-systems-graphing",
    conceptId: "concept-solve-systems-graphing",
    title: "Solve Systems by Graphing",
    description: "Solve systems by graphing both lines and identifying their intersection point.",
    builder: graphingBuilders,
    tutorial: `# Solve Systems by Graphing

## Big Idea

To solve a system by graphing, graph both equations on the same coordinate plane. The solution is the point where the lines meet.

## What To Notice

- Each equation makes a line.
- The intersection point is on both lines.
- The x-coordinate and y-coordinate of the intersection form the solution.
- Graphing is especially useful for estimating or checking a solution.
- If the lines are parallel, they never intersect and there is no solution.

## Worked Example

Solve by graphing:

\`y = x + 1\`

\`y = -2x + 10\`

The first line contains \`(0, 1)\`, \`(1, 2)\`, and \`(3, 4)\`.

The second line contains \`(0, 10)\`, \`(1, 8)\`, and \`(3, 4)\`.

Both lines pass through \`(3, 4)\`, so the solution is \`(3, 4)\`.

## Common Mistake

Do not report only the x-value or only the y-value. A system solution is an ordered pair.

## Quick Self-Check

After reading the intersection from the graph, substitute the ordered pair into both equations.
`,
  },
  {
    slug: "solve-systems-substitution",
    conceptId: "concept-solve-systems-substitution",
    title: "Solve Systems by Substitution",
    description: "Solve systems algebraically by replacing one variable with an equivalent expression.",
    builder: substitutionBuilders,
    tutorial: `# Solve Systems by Substitution

## Big Idea

Substitution works by replacing one expression with an equal expression. If both equations tell you what \`y\` equals, you can set those expressions equal to each other.

## What To Notice

- Substitute when one equation already has a variable isolated.
- If \`y = x + 1\` and \`y = -2x + 10\`, then \`x + 1 = -2x + 10\`.
- Solve for one variable first.
- Substitute that value back into either original equation to find the other variable.
- Write the final answer as an ordered pair.

## Worked Example

Solve:

\`y = x + 1\`

\`y = -2x + 10\`

Set the expressions for \`y\` equal:

\`x + 1 = -2x + 10\`

Add \`2x\`:

\`3x + 1 = 10\`

Subtract 1:

\`3x = 9\`

\`x = 3\`

Substitute into \`y = x + 1\`:

\`y = 3 + 1 = 4\`

The solution is \`(3, 4)\`.

## Common Mistake

Do not stop after finding x. Substitute back to find y, then write the ordered pair.

## Quick Self-Check

The final ordered pair should make both original equations true.
`,
  },
];

// Repair wording without changing saved answer identities or option positions.
if (process.argv.includes("--repair-substitution")) {
  for (const kind of ["core", "review"]) {
    const path = `${testSetDir}/course3-solve-systems-substitution-${kind}.json`;
    const bank = JSON.parse(await readFile(path, "utf8"));
    const builders = substitutionBuilders(kind);
    if (bank.questions.length !== builders.length) throw new Error("Unexpected bank length");
    bank.questions = bank.questions.map((question, index) => {
      const generated = builders[index](question.id);
      if (generated.correctAnswer !== question.correctAnswer) throw new Error(`Answer changed: ${question.id}`);
      return { ...question, questionText: generated.questionText, explanation: generated.explanation };
    });
    await writeFile(path, `${JSON.stringify(bank, null, 2)}\n`);
  }
} else {
  for (const pack of packs) {
    await writeTutorial(pack.slug, pack.tutorial);
    for (const kind of ["core", "review"]) {
      await writeBank({
        slug: pack.slug,
        conceptId: pack.conceptId,
        kind,
        title: pack.title,
        description: pack.description,
        questions: finalize(pack.slug, kind, pack.builder(kind)),
      });
    }
  }

  console.log(`Generated ${packs.length} tutorials and ${packs.length * 2} assessment banks.`);
}

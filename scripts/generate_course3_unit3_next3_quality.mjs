import { writeFile } from "node:fs/promises";

const contentRoot = "public/content/math/course3";
const testSetDir = `${contentRoot}/test-sets`;
const tutorialDir = `${contentRoot}/tutorials`;

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

function reduce(n, d = 1) {
  if (d === 0) throw new Error("Zero denominator");
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return { n: (sign * n) / divisor, d: Math.abs(d) / divisor };
}

function frac(n, d = 1) {
  const value = reduce(n, d);
  return value.d === 1 ? String(value.n) : `${value.n}/${value.d}`;
}

function add(a, b) {
  return reduce(a.n * b.d + b.n * a.d, a.d * b.d);
}

function multiply(a, value) {
  return reduce(a.n * value, a.d);
}

function valueAt(m, b, x) {
  return add(multiply(m, x), { n: b, d: 1 });
}

function point(x, y) {
  return `(${x}, ${frac(y.n, y.d)})`;
}

function slopeText(m) {
  const value = reduce(m.n, m.d);
  if (value.n === 1 && value.d === 1) return "x";
  if (value.n === -1 && value.d === 1) return "-x";
  if (value.n === 0) return "0x";
  return `${frac(value.n, value.d)}x`;
}

function equation(m, b) {
  const mx = slopeText(m);
  if (m.n === 0) return `y = ${b}`;
  if (b === 0) return `y = ${mx}`;
  return b > 0 ? `y = ${mx} + ${b}` : `y = ${mx} - ${Math.abs(b)}`;
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
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const sequence = shuffle(values, rng(hashSeed(`${seedText}:${attempt}`)));
    if (sequencePasses(sequence)) return sequence;
  }
  throw new Error(`Could not create answer sequence for ${seedText}`);
}

function placeCorrect(question, correctIndex) {
  const distractors = question.options.filter((option) => option !== question.correctAnswer);
  const ordered = shuffle(distractors, rng(hashSeed(question.id)));
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

const slopes = [
  { n: 1, d: 1 },
  { n: 2, d: 1 },
  { n: -1, d: 1 },
  { n: 1, d: 2 },
  { n: -1, d: 2 },
  { n: 3, d: 2 },
  { n: -2, d: 3 },
  { n: 4, d: 3 },
  { n: -3, d: 4 },
  { n: 5, d: 2 },
  { n: -4, d: 1 },
  { n: 2, d: 5 },
  { n: 0, d: 1 },
  { n: -5, d: 3 },
  { n: 3, d: 5 },
  { n: 7, d: 4 },
  { n: -7, d: 5 },
  { n: 5, d: 6 },
  { n: -3, d: 2 },
  { n: 6, d: 5 },
];

const intercepts = [3, -2, 5, -4, 0, 1, -6, 7, -1, 4, -5, 2, 6, -3, 8, -7, 9, -8, 10, -9];

function interceptOptions(b, m = { n: 1, d: 1 }) {
  return fourUniqueOptions(String(b), [
    String(-b),
    String(b + 1),
    String(b - 1),
    frac(m.n, m.d),
    String(b + 2),
    String(0),
    String(1),
    String(-1),
  ]);
}

function equationOptions(m, b) {
  return fourUniqueOptions(equation(m, b), [
    equation({ n: -m.n, d: m.d }, b),
    equation(m, -b),
    equation({ n: m.d, d: m.n || 1 }, b),
    equation(m, b + 1),
    equation({ n: m.n + m.d, d: m.d }, b),
    equation(m, 0),
    equation({ n: 0, d: 1 }, b),
  ]);
}

function graphDescription(m, b) {
  return `Start at ${b} on the y-axis, then use slope ${frac(m.n, m.d)}`;
}

function graphOptions(m, b) {
  return fourUniqueOptions(graphDescription(m, b), [
    `Start at ${-b} on the y-axis, then use slope ${frac(m.n, m.d)}`,
    `Start at ${b} on the y-axis, then use slope ${frac(-m.n, m.d)}`,
    `Start at ${frac(m.n, m.d)} on the y-axis, then use slope ${b}`,
    `Start at ${b + 1} on the y-axis, then use slope ${frac(m.n, m.d)}`,
    `Start at ${b} on the y-axis, then use slope ${frac(m.d, m.n || 1)}`,
  ]);
}

function yInterceptBuilders(kind) {
  const count = kind === "core" ? 50 : 20;
  return Array.from({ length: count }, (_, index) => (id) => {
    const m = slopes[(index * 3 + 2) % slopes.length];
    const b = intercepts[index % intercepts.length];
    const x = [1, 2, 3, 4, -1, -2][index % 6];
    const y = valueAt(m, b, x);
    const d = difficulty(index, kind);
    const template = index % 9;
    const correctAnswer = String(b);
    const options = interceptOptions(b, m);
    const questionText = [
      `A line crosses the y-axis at ${point(0, { n: b, d: 1 })}. What is the y-intercept?`,
      `In the equation ${equation(m, b)}, what is the y-intercept?`,
      `A table for a line includes ${point(0, { n: b, d: 1 })} and ${point(x, y)}. What is the y-intercept?`,
      `A line has slope ${frac(m.n, m.d)} and passes through ${point(0, { n: b, d: 1 })}. What is b in y = mx + b?`,
      `The graph of a line meets the y-axis at y = ${b}. Which value is the y-intercept?`,
      `A linear context starts with ${b} points before any rounds are played. What is the y-intercept of the graph?`,
      `A student identifies the y-intercept by setting x = 0. For ${equation(m, b)}, what value should they get?`,
      `The ordered pair ${point(0, { n: b, d: 1 })} is on a line. What does its y-coordinate represent?`,
      `A line goes through ${point(0, { n: b, d: 1 })}; another point is ${point(x, y)}. What is the starting value?`,
    ][template];
    return makeQuestion({
      id,
      questionText,
      options,
      correctAnswer,
      difficulty: d,
      skillTags: ["conceptual", "graph", "reasoning"],
      explanation: "The y-intercept is the y-value where x = 0. In y = mx + b, it is b.",
    });
  });
}

function yMxPlusBBuilders(kind) {
  const count = kind === "core" ? 50 : 20;
  return Array.from({ length: count }, (_, index) => (id) => {
    const m = slopes[(index * 5 + 1) % slopes.length];
    const b = intercepts[(index * 2 + 3) % intercepts.length];
    const x = [1, 2, 3, 4, 5, -1, -2][index % 7];
    const y = valueAt(m, b, x);
    const d = difficulty(index, kind);
    const template = index % 9;
    const correctAnswer = equation(m, b);
    const options = equationOptions(m, b);
    const questionText = [
      `A line has slope ${frac(m.n, m.d)} and y-intercept ${b}. Which equation represents it?`,
      `Which equation in the form y = mx + b has m = ${frac(m.n, m.d)} and b = ${b}?`,
      `A graph starts at ${b} on the y-axis and changes by ${frac(m.n, m.d)} for each 1 unit right. Which equation matches?`,
      `A linear table has y-intercept ${b} and includes the point ${point(x, y)}. Which equation fits?`,
      `A plant is ${b} cm tall at week 0 and changes by ${frac(m.n, m.d)} cm each week. Which equation gives y after x weeks?`,
      `A student writes y = mx + b. For slope ${frac(m.n, m.d)} and starting value ${b}, what equation should they write?`,
      `The line crosses the y-axis at ${b} and has slope ${frac(m.n, m.d)}. Which rule gives y from x?`,
      `Which equation contains ${point(0, { n: b, d: 1 })} and has rate of change ${frac(m.n, m.d)}?`,
      `A line has constant change ${frac(m.n, m.d)} and output ${b} when input is 0. Which equation models it?`,
    ][template];
    return makeQuestion({
      id,
      questionText,
      options,
      correctAnswer,
      difficulty: d,
      skillTags: ["computation", "conceptual", "application"],
      explanation: "In y = mx + b, m is the slope and b is the y-intercept or starting value.",
    });
  });
}

function graphLinearBuilders(kind) {
  const count = kind === "core" ? 50 : 20;
  return Array.from({ length: count }, (_, index) => (id) => {
    const m = slopes[(index * 7 + 4) % slopes.length];
    const b = intercepts[(index * 3 + 1) % intercepts.length];
    const run = [1, 2, 3, 4, 5][index % 5] * m.d;
    const start = point(0, { n: b, d: 1 });
    const next = point(run, valueAt(m, b, run));
    const d = difficulty(index, kind);
    const template = index % 9;
    const correctAnswer =
      template % 3 === 0 ? next : template % 3 === 1 ? graphDescription(m, b) : start;
    const options =
      template % 3 === 0
        ? fourUniqueOptions(next, [
            point(run, valueAt({ n: -m.n, d: m.d }, b, run)),
            point(run, valueAt(m, -b, run)),
            point(m.d, valueAt(m, b, m.d)),
            point(0, { n: b, d: 1 }),
            point(run + 1, valueAt(m, b, run + 1)),
          ])
        : template % 3 === 1
          ? graphOptions(m, b)
          : fourUniqueOptions(start, [
              point(0, { n: -b, d: 1 }),
              point(1, valueAt(m, b, 1)),
              point(m.d, valueAt(m, b, m.d)),
              point(0, { n: b + 1, d: 1 }),
              point(0, { n: b - 1, d: 1 }),
            ]);
    const questionText = [
      `To graph ${equation(m, b)}, start at the y-intercept and move right ${run} units. Which point do you reach?`,
      `Which graphing description matches ${equation(m, b)}?`,
      `What is the first point to plot when graphing ${equation(m, b)} from the y-intercept?`,
      `A line has equation ${equation(m, b)}. Starting at ${start}, move right ${run} units. Which point do you reach?`,
      `A student wants to graph ${equation(m, b)}. Which steps should they use?`,
      `For ${equation(m, b)}, which y-axis point belongs on the graph before using slope?`,
      `Use slope ${frac(m.n, m.d)} from y-intercept ${b}. Move right ${run} units. Which point do you reach?`,
      `Which description correctly graphs a line with slope ${frac(m.n, m.d)} and y-intercept ${b}?`,
      `When graphing ${equation(m, b)}, what point shows where the line crosses the y-axis?`,
    ][template];
    return makeQuestion({
      id,
      questionText,
      options,
      correctAnswer,
      difficulty: d,
      skillTags: ["graph", "visual", "reasoning"],
      explanation: "Graph a line by plotting the y-intercept first, then using slope as rise over run to find another point.",
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

async function writeTutorial(slug, title, body) {
  await writeFile(`${tutorialDir}/concept-${slug}.md`, body(title));
}

const packs = [
  {
    slug: "understand-y-intercept",
    conceptId: "concept-understand-y-intercept",
    title: "Understand the y-Intercept",
    description: "Interpret the y-intercept as the starting value and the point where a line crosses the y-axis.",
    builder: yInterceptBuilders,
    tutorial: (title) => `# ${title}

## Big Idea

The y-intercept is where a line crosses the y-axis. At that point, x is 0, so the y-intercept often means the starting value.

## What To Notice

- In \`y = mx + b\`, the y-intercept is \`b\`.
- On a graph, the y-intercept is the point \`(0, b)\`.
- In a table, look for the row where \`x = 0\`.
- In a context, the y-intercept is the amount before the repeated change begins.

## Worked Example

For \`y = 3x - 2\`, the y-intercept is \`-2\`, so the graph crosses the y-axis at \`(0, -2)\`.

## Common Mistake

Do not confuse slope with y-intercept. Slope tells how fast the line changes; the y-intercept tells where it starts.

## Quick Self-Check

Set \`x = 0\`. The y-value you get is the y-intercept.
`,
  },
  {
    slug: "equations-y-equals-mx-plus-b",
    conceptId: "concept-equations-y-equals-mx-plus-b",
    title: "Equations in the Form y = mx + b",
    description: "Write and interpret linear equations using slope and y-intercept.",
    builder: yMxPlusBBuilders,
    tutorial: (title) => `# ${title}

## Big Idea

The equation \`y = mx + b\` describes a line. The number \`m\` is the slope, and \`b\` is the y-intercept.

## What To Notice

- \`m\` tells the change in y for each 1-unit change in x.
- \`b\` tells the y-value when x is 0.
- Positive slopes rise from left to right.
- Negative slopes fall from left to right.
- A context may call the y-intercept a starting amount or initial value.

## Worked Example

A line has slope \`2\` and y-intercept \`-5\`. Its equation is \`y = 2x - 5\`.

## Common Mistake

Do not put slope and intercept in the wrong places. \`y = 4x + 7\` has slope \`4\` and y-intercept \`7\`.

## Quick Self-Check

Read the equation out loud: "start at b, then change by m each time x increases by 1."
`,
  },
  {
    slug: "graph-linear-equations",
    conceptId: "concept-graph-linear-equations",
    title: "Graph Linear Equations",
    description: "Graph lines by plotting the y-intercept and using slope as rise over run.",
    builder: graphLinearBuilders,
    tutorial: (title) => `# ${title}

## Big Idea

To graph a linear equation, start with the y-intercept and then use the slope to find another point.

## What To Notice

- The y-intercept gives the first point: \`(0, b)\`.
- Slope is rise over run.
- A slope of \`3/2\` means rise 3 and run 2.
- A negative slope means the line moves downward as you move right.
- Two correct points are enough to draw the line.

## Worked Example

For \`y = 2x + 1\`, start at \`(0, 1)\`. The slope is \`2\`, so move up 2 and right 1 to get \`(1, 3)\`.

## Common Mistake

Do not start at the slope. Start at the y-intercept, then use the slope.

## Quick Self-Check

After plotting two points, check that both points satisfy the equation.
`,
  },
];

for (const pack of packs) {
  // The illustrated graphing tutorial is maintained directly in public/content.
  if (pack.slug !== "graph-linear-equations") {
    await writeTutorial(pack.slug, pack.title, pack.tutorial);
  }
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

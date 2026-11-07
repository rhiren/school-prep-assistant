import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { positions } from './generate_course3_unit4_completion.mjs';

const q = (questionText, correctAnswer, distractors, explanation) => ({ questionText, correctAnswer: String(correctAnswer), distractors: distractors.map(String), explanation });
const number = (text, answer, explanation) => q(text, answer, [answer - 1, answer + 1, answer + 3], explanation);

export const packs = [
  {slug:'functions-on-graphs', title:'Functions on Graphs', standard:'8.F.1', forms:[
    [
      n=>number(`A plotted point on a function is (${n}, ${n+4}). What output belongs to this input?`,n+4,`The horizontal coordinate ${n} is the input. The vertical coordinate ${n+4} is the output.`),
      n=>q(`A graph consists only of the points (0, ${n}), (1, ${n}), (2, ${n}). Is y a function of x?`,'Yes; each x has exactly one y.',['No; repeated heights are forbidden.','No; functions must slope upward.','Yes; all point collections are functions.'],'A horizontal set of points may share a height. No input has conflicting outputs.'),
      n=>q(`Two plotted points are (${n}, 1) and (${n}, 4). Why can no function of x contain both?`,`The vertical line x = ${n} meets two different points.`,['The points have different y-values.','The graph must contain the origin.','A function can have only one point.'],'Different y-values only cause a conflict when their x-values agree. A vertical line holds the input fixed.'),
      n=>q(`The entire graph is the horizontal line y = ${n}. Does it pass the vertical-line test?`,'Yes; every vertical line meets it once.',['No; a horizontal line meets it infinitely often.','No; its slope is zero.','Yes; it has no output.'],'Use vertical, not horizontal, test lines. Each x gives the single output shown by the horizontal line.'),
      n=>q(`The entire graph is the vertical line x = ${n}. Is it a function of x?`,'No; one x has many y-values.',['Yes; it is a straight line.','Yes; x stays constant.','No; every straight line fails.'],'All points on a vertical line share one input while their outputs vary. Straightness alone does not establish a function.')
    ],
    [
      n=>number(`A function graph is a straight line through (0, ${n}) and (2, ${n+6}). What is its output at x = 1?`,n+3,`Halfway between x = 0 and x = 2, the height is halfway between ${n} and ${n+6}: ${n+3}. The stated straight line justifies interpolation.`),
      n=>q(`A graph has only the three solid points (1, ${n}), (3, ${n+1}), (5, ${n+2}). Are inputs between these points included?`,'No; only inputs 1, 3, and 5 are shown as part of this graph.',['Yes; automatically join every point.','Yes; all real inputs belong to every function.','No; isolated points cannot define a function.'],'A discrete graph contains only its plotted points unless connecting segments or a larger rule are specified.'),
      n=>q(`At x = ${n}, a graph has an open circle at y = 2 and a solid point at y = 5. Every other allowed x has one solid graph point. Does this graph define y as a function of x?`,'Yes; the open circle is excluded, leaving one output at that input.',['No; open circles count as outputs.','No; one missing point invalidates every function.','Yes; two included outputs would also be allowed.'],'An open circle marks an excluded endpoint. Only the solid point supplies an output at this input.'),
      n=>q(`A curved graph turns at (${n}, 0). Every vertical line meets it at most once, but some horizontal lines meet it twice. Is y a function of x?`,'Yes; the vertical-line test passes.',['No; any horizontal repeat breaks a function.','No; only straight graphs are functions.','Yes; every curve is a function.'],'A curve can assign one y per x. Horizontal repeats indicate shared outputs, which are allowed.'),
      n=>number(`A line segment has solid endpoints (${n}, 3) and (${n+4}, 7). What is the greatest allowed input on this graph?`,n+4,`Read the horizontal coordinates, not the heights. The right endpoint is included, so the greatest input is ${n+4}.`)
    ],
    [
      n=>q(`A graph contains only (0, 2), (${n}, 3), (${n}, 7), (${n+1}, 7). Which single removal makes it a function while keeping all original input values?`,`Remove (${n}, 3).`,['Remove (0, 2).',`Remove (${n+1}, 7).`,'No single removal can repair it.'],`Only input ${n} conflicts. Removing one of its two points resolves the conflict without losing that input.`),
      n=>q(`A function graph contains (1, ${n}) and (4, ${n}). After reflecting it across y = x, can the reflected relation be a function of x?`,'No; the reflected points share an input but have different outputs.',['Yes; every reflection preserves the function property.','Yes; both original points had different inputs.','No; reflections always destroy functions.'],`Reflection exchanges coordinates, producing (${n}, 1) and (${n}, 4). One vertical line now meets both.`),
      n=>q(`A graph includes y = x for x < ${n} and y = x + 2 for x >= ${n}. What happens at the join?`,`Only output ${n+2} is included at x = ${n}, so there is no conflict.`,[`Both ${n} and ${n+2} are included, so it fails.`,`Only output ${n} is included.`,`No output is included at x = ${n}.`],'The first condition excludes the boundary input; the second includes it. A jump does not prevent a graph from defining a function.'),
      n=>q(`A circle centered at (0, 0) has radius ${n}. A student tests only the vertical line x = ${n}, which touches once, and declares it a function. What disproves the claim?`,`At x = 0, the circle has outputs ${n} and -${n}.`,['One successful test line proves the claim.','The circle has no points at x = 0.','Only horizontal lines may be used.'],'Every vertical line must meet at most once. A single counterexample is enough to reject a graph, while one passing line is not enough to accept it.'),
      n=>q(`Two line segments have input intervals [0, ${n}] and [${n}, ${n+2}]. Both endpoints at x = ${n} are solid. Their union is a function. What must be true?`,'Their outputs at the shared input must be equal.',['The two segments must have equal slopes.','The segments must both pass through the origin.','The shared input must be deleted.'],'Only the shared input can receive assignments from both segments. Equal heights there represent the same point, not two distinct outputs.')
    ]
  ]},
  {slug:'compare-functions-representations',title:'Compare Functions in Different Representations',standard:'8.F.2',forms:[
    [
      n=>q(`Function A has equation y = ${n+1}x + 8. Function B adds ${n} to its output for every increase of 1 in x. Which has the greater rate of change?`,'A',['B','They have equal rates.','The starting value decides the rate.'],`A's rate is ${n+1}; B's rate is ${n}. Compare the rates, not the constant 8.`),
      n=>number(`A linear table contains (0, ${n}), (2, ${n+6}), (4, ${n+12}). What rate should you use to compare it with another function?`,3,'The output increases 6 while the input increases 2. Rate = 6 / 2 = 3, not 6.'),
      n=>q(`A graph crosses the y-axis at (0, ${n+5}). B has equation y = 2x + ${n}. Which has the greater initial value?`,'A',['B','They have equal initial values.','The rate must be known first.'],`At input zero, A gives ${n+5} and B gives ${n}. Initial values can be compared without knowing A's slope.`),
      n=>number(`A rental charges $${n+10} initially plus $4 per hour. Which number is its hourly rate when comparing it with a graph of cost against hours?`,4,'The hourly rate is the change in cost for one additional hour. The initial fee is a separate quantity.'),
      n=>q(`A is a straight graph through (0, ${n}) and (1, ${n+2}). B is a linear table with (0, ${n+3}) and (1, ${n+5}). How do their rates compare?`,'Equal; both rates are 2.',['A is faster because its initial value is lower.','B is faster because its outputs are larger.','Equal; both rates are 0.'],'Each output rises 2 for an input increase of 1. Different starting values do not imply different rates.')
    ],
    [
      n=>q(`A has equation y = 3x + ${n}. B is a straight graph through (2, ${n+8}) and (5, ${n+20}). Which has the greater rate?`,'B; its rate is 4, compared with 3 for A.',['A; its rate is 3, compared with 2 for B.','Equal; both rates are 3.','B; its rate is 12 per input unit.'],'B rises 12 across 3 input units, so its rate is 4. Divide by the entire horizontal change.'),
      n=>number(`A linear table has (2, ${n+6}) and (4, ${n+12}). What initial value should be compared with the constant term in another equation?`,n,`The rate is 6 / 2 = 3. Move back 2 input units from the first row: ${n+6} - 2(3) = ${n}.`),
      n=>q(`A starts with ${n+20} liters and loses 3 liters per minute. B is a linear table: (0, ${n+20}), (2, ${n+16}). Which has the greater signed rate of change?`,'B; -2 is greater than -3.',['A; losing 3 means a greater signed rate.','Equal; the initial amounts match.','B; its rate is positive 2.'],'B changes by -4 over 2 minutes, giving -2. On the number line, -2 is greater than -3 even though A loses water faster.'),
      n=>q(`A charges $${n} initially plus $5 per visit. B has cost equation y = 3x + ${n+8}. Which costs less for exactly 2 visits?`,'A; it costs $4 less.',['B; it costs $4 less.','They cost the same.','A; it costs $8 less.'],`A costs ${n+10}; B costs ${n+14}. Compare total costs at the requested input: A is 4 dollars cheaper even though its per-visit rate is greater.`),
      n=>q(`A is a straight line through (0, ${n}) and (2, ${n+6}). B has equation y = 3x + ${n}. Do they represent the same function for all real inputs?`,'Yes; both the rate and initial value match.',['No; a graph cannot represent an equation.','Yes; sharing any one point is enough.','No; the graph has rate 6.'],'A has rate 6 / 2 = 3 and initial value given at x = 0. Two linear functions with the same slope and intercept agree everywhere.')
    ],
    [
      n=>number(`Plan A costs ${n+2} dollars per visit with no initial fee. Plan B costs ${n} dollars per visit plus a $12 initial fee. At how many visits are their costs equal?`,6,`Set (${n+2})x = ${n}x + 12. The difference is 2x = 12, so x = 6.`),
      n=>q(`A has equation y = 2x + ${n+6}. B's straight graph passes through (0, ${n}) and (3, ${n+9}). For nonnegative inputs, when is B's output greater?`,'When x > 6.',['When x < 6.','At every input because B has a greater rate.','Only when x = 6.'],'B is y = 3x plus its starting value. Subtracting A from B gives x - 6. That difference is positive exactly after 6.'),
      n=>q(`A rises $${2*n} over 2 hours. B rises $${3*n} over 3 hours. The graphs use different axis scales. Which comparison is valid?`,`Equal rates of $${n} per hour.`,['A is faster because its horizontal interval is shorter.','B is faster because its total rise is larger.','The visually steeper line must be faster.'],'Divide each rise by its corresponding run in actual units. Apparent steepness is unreliable across different axis scales.'),
      n=>q(`A is y = 2x + ${n}. B's only known values are (0, ${n}) and (2, ${n+4}); B is not stated to be linear. What can be concluded?`,'They agree at the two listed inputs; agreement elsewhere is not guaranteed.',['They must agree at every input.','B must have constant rate 2 everywhere.','B cannot be a function because its rule is unknown.'],'Many nonlinear functions pass through the same two points. Comparing whole functions requires more than two matching values unless linearity is given.'),
      n=>number(`A bike rental costs $${n+10} initially plus $2 per hour. B costs $${n+4} initially plus $5 per hour. For whole-number rental hours, what is the first hour when A is cheaper?`,3,`Solve ${n+10} + 2h < ${n+4} + 5h: 6 < 3h, so h > 2. They tie at 2; the first whole hour with A cheaper is 3.`)
    ]
  ]}
];

export function buildBank(pack, review=false) {
  const testId=`course3-${pack.slug}-${review?'review':'core'}`;
  const counts=review?[8,12]:[10,25,15];
  const keys=positions(review?20:50,testId);
  const items=counts.flatMap((count,level)=>Array.from({length:count},(_,i)=>({
    ...pack.forms[level][i % pack.forms[level].length]((review?8:2)+Math.floor(i/pack.forms[level].length)),
    difficulty:['scaffold','standard','challenge'][level]
  })));
  return {testId,conceptId:`concept-${pack.slug}`,type:review?'review':'concept',title:`${pack.title} ${review?'Review':'Core'} Test`,description:'Interpret representations, explain misconceptions, and transfer reasoning to unfamiliar cases.',questions:items.map(({distractors,...item},i)=>{
    if(new Set([item.correctAnswer,...distractors]).size!==4) throw Error(`${testId}/${i}: duplicate options`);
    const options=[...distractors];options.splice(keys[i],0,item.correctAnswer);
    return {id:`${testId}-${String(i+1).padStart(3,'0')}`,type:'multiple_choice',answerType:'text',...item,options,skillTags:['graph','conceptual','reasoning']};
  })};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  for(const pack of packs) for(const review of [false,true]) {
    const bank=buildBank(pack,review);
    fs.writeFileSync(`public/content/math/course3/test-sets/${bank.testId}.json`,JSON.stringify(bank,null,2)+'\n');
    console.log(bank.testId,bank.questions.length);
  }
}

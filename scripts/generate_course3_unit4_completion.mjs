import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = 'public/content/math/course3';
const q = (questionText, correctAnswer, distractors, explanation) => ({ questionText, correctAnswer: String(correctAnswer), distractors: distractors.map(String), explanation });
const nums = (text, answer, explanation) => q(text, answer, [answer + 1, answer - 1, answer + 3], explanation);
const pair = (x, y) => `(${x}, ${y})`;
const solution = (text, x, y, explanation) => q(text, pair(x,y), [pair(x+1,y),pair(x,y+1),pair(x-1,y-1)], explanation);

export const packs = [
  { slug: 'systems-infinitely-many-solutions', title: 'Systems with Infinitely Many Solutions', standards: ['8.EE.8'], forms: [
    [
      n => q(`The equations y = ${n}x + 2 and 2y = ${2*n}x + 4 describe which graphs?`, 'The same line', ['Distinct parallel lines','Two lines crossing once','Two perpendicular lines'], 'Dividing the second equation by 2 gives the first equation, so every point on the line is shared.'),
      n => q(`Subtracting equivalent equations ${n}x + y = 8 and ${n}x + y = 8 gives 0 = 0. What does this mean?`, 'Infinitely many shared ordered pairs', ['Only the point (0, 0)','No shared ordered pairs','Exactly one shared ordered pair'], 'The identity shows that the two equations impose the same condition, not that both coordinates must be zero.'),
      n => nums(`Complete a copy of x + y = ${n+5}: 3x + 3y = __.`, 3*(n+5), 'Multiplying an equation by 3 requires multiplying both sides, including the constant, by 3.'),
      n => q(`Both equations of a system reduce to y = x + ${n}. Must (0, 0) solve the system?`, 'No; the line does not pass through (0, 0).', ['Yes; infinitely many solutions includes every point.','Yes; all lines pass through the origin.','No; the system has no solutions.'], `At x = 0 the shared line has y = ${n}, not zero. Infinite solutions are restricted to the shared line.`),
      n => q(`A system has two copies of y = ${n}x. Which describes its solution set?`, `All pairs (t, ${n}t) for real t`, ['Every point in the plane','Only (0, 0)','Only points with positive coordinates'], 'Choose any real x-value t; y must still equal the slope times t.')
    ],
    [
      n => nums(`For infinitely many solutions, what must k be in 2x + 3y = ${n+6} and 6x + 9y = k?`,3*(n+6),'The coefficients are tripled, so the right side must be tripled too.'),
      n => q(`Compare 2y = ${2*n}x + 6 with y = ${n}x + 4. Why are there not infinitely many solutions?`, 'Their slopes match but their intercepts differ.', ['The slopes differ.','Multiplying by 2 changes the solution set.','The two equations describe the same line.'], `The first equation is y = ${n}x + 3; the second has intercept 4. They are distinct parallel lines.`),
      n => solution(`The system is x + y = ${n+10} and 4x + 4y = ${4*(n+10)}. Which listed pair is a solution?`,n+2,8,`The pair sums to ${n+10}; multiplying that sum by 4 satisfies the second equation as well.`),
      n => q(`A student doubles x + ${n}y = 7 and writes 2x + ${2*n}y = 7. What is the error?`, 'The constant must also be doubled to 14.', ['Only x should be doubled.','Only y should be doubled.','There is no error.'], 'Equivalent equations require applying the nonzero multiplier to every term on both sides.'),
      n => nums(`A system has infinitely many solutions: y = 2x + ${n} and y = ax + ${n}. Find a.`,2,'Both slope and intercept must match. The shared intercept is already correct; the slope must be 2.')
    ],
    [
      n => q(`After simplifying 2(x + y) + ${n} = ${n+12} and 3x + 3y = 18, a student says any pair is a solution. Which correction is complete?`, 'There are infinitely many solutions, but only pairs with x + y = 6.', ['Only (0, 0) works.','There are no solutions because the constants differ.','Every pair really does work.'], 'The equations both reduce to x + y = 6. An identity after elimination leaves this original constraint in force.'),
      n => q(`For which (a, b) does the system ${n}x + 2y = 8 and ax + 6y = b have infinitely many solutions?`,pair(3*n,24),[pair(3*n,8),pair(n,24),pair(3*n+1,24)],'The y coefficient forces a scale factor of 3. Both the x coefficient and constant must use that factor.'),
      n => q(`The system x + y = ${n+10}, 2x + 2y = ${2*(n+10)} has infinitely many real solutions. If x and y count objects and must be nonnegative integers, how many pairs are possible?`,String(n+11),[String(n+10),'Infinitely many',String(n+9)],`Choose x from 0 through ${n+10}, inclusive; each gives one y. Context restricts the infinite real line to ${n+11} pairs.`),
      n => q(`A learner tests x = 0 in y = ${n}x + 5 and y = ${n+1}x + 5. Both give y = 5. Does this prove infinitely many solutions?`, 'No; their different slopes mean they share only (0, 5).', ['Yes; one matching point proves equivalent equations.','No; the system has no solutions.','Yes; equal intercepts always imply equal lines.'], 'A shared point alone is insufficient. Subtracting the two expressions gives x = 0, so the only shared point is (0, 5).'),
      n => q(`Two real variables satisfy y = ${n}x + 2. A second rule is y - 2 = ${n}x. Which additional rule would select exactly one of the existing solutions?`, 'x = 3', [`2y = ${2*n}x + 4`,`y = ${n}x + 2`,`3y - 6 = ${3*n}x`], `The original rules describe one line. Fixing x = 3 fixes y = ${3*n+2}; the other choices merely repeat the line.`)
    ]
  ]},
  { slug: 'choose-efficient-system-method', title: 'Choose an Efficient System-Solving Method', standards: ['8.EE.8'], forms: [
    [
      n => q(`In y = x + ${n} and 2x + y = 12, which step uses the already isolated variable?`, `Substitute x + ${n} for y in the second equation.`, ['Add 12 to both equations.','Replace x with y without changing anything else.','Set x equal to 12.'], 'The first equation supplies an expression equal to y, so substitution avoids rearranging either equation.'),
      n => q(`For ${n}x + 2y = 8 and -${n}x + 3y = 12, which operation eliminates x immediately?`, 'Add the equations.', ['Subtract the second from the first.','Multiply only the constants.','Set both constants to zero.'], 'Opposite coefficients add to zero; adding the entire equations leaves 5y = 20.'),
      n => q(`The system 2x + ${n}y = 9 and 5x + ${n}y = 15 has matching y coefficients. How can y be eliminated immediately?`, 'Subtract one equation from the other.', ['Add the equations.','Divide only the y terms by the coefficient.','Ignore the second equation.'], 'Subtracting equal y terms cancels them; all terms and both right sides must be subtracted.'),
      n => q(`A graph of two lines has an intersection near (${n}.4, 2.7). You need an exact solution. What should you do?`, 'Use substitution or elimination, then check both equations.', ['Round both coordinates and call them exact.','Use only the first line.','Assume the coordinates are integers.'], 'A graph can suggest a solution, but an approximate reading does not establish exact values.'),
      n => q(`Both equations isolate y: y = 2x + ${n} and y = 5x + 1. What one-variable equation follows?`, `2x + ${n} = 5x + 1`,[`2x + ${n} = 1`,`2x = 5x`,`2x + 5x = ${n+1}`], 'At a shared point, both expressions equal the same y-value, so they equal each other.')
    ],
    [
      n => q(`To eliminate y from 3x + 2y = ${n+8} and 5x + 4y = ${n+12}, what is a valid plan?`, 'Double the first equation, then subtract the second.', ['Double only the first constant, then subtract.','Add the original equations.','Subtract the original equations without scaling.'], 'Doubling every term in the first equation creates 4y, matching the second equation.'),
      n => q(`Use substitution for x = 2y + ${n} and 3x - y = 10. Which equation should you solve?`, `3(2y + ${n}) - y = 10`,[`3(2y) + ${n} - y = 10`,`3x - (2y + ${n}) = 10`,`2y + ${n} - y = 10`], 'Replace the entire x expression inside parentheses; the factor 3 multiplies both terms.'),
      n => q(`For y = 3x + ${n} and y = 3x + ${n+2}, which observation settles the solution count without plotting?`, 'Equal slopes and different intercepts imply no solution.', ['Equal slopes imply exactly one solution.','Different intercepts imply infinitely many solutions.','Positive slopes always intersect.'], 'The two lines stay a fixed vertical distance apart, so an exact algebraic observation is enough.'),
      n => nums(`Solve efficiently: x + y = ${n+9} and x - y = ${n+1}. What is x?`,n+5,`Adding eliminates y: 2x = ${2*n+10}, so x = ${n+5}.`),
      n => q(`A student multiplies 2x - 3y = ${n+4} by -2. Which equation is equivalent?`, `-4x + 6y = ${-2*(n+4)}`, [`-4x - 6y = ${-2*(n+4)}`,`-4x + 6y = ${n+4}`,`4x - 6y = ${-2*(n+4)}`], 'Every term changes by the factor -2; the negative y coefficient becomes positive.')
    ],
    [
      n => q(`To eliminate x from 2x + 3y = ${n+7} and 3x - 2y = ${n+1}, which plan uses the smallest positive integer multipliers?`, 'Multiply the first by 3 and the second by 2, then subtract.', ['Multiply the first by 2 and the second by 3, then subtract.','Multiply both by 2, then subtract.','Multiply the first by 3 and the second by 2, then add.'], 'The least common multiple of 2 and 3 is 6. Matching 6x terms cancel by subtraction, not addition.'),
      n => solution(`Choose a method and solve x = 2y + ${n} and 3x - y = ${3*n+20}. Which pair satisfies both original equations?`,n+8,4,`Substitution gives 5y + ${3*n} = ${3*n+20}, so y = 4 and x = ${n+8}. Check both equations.`),
      n => q(`A student adds 2x + 3y = ${n+5} and 4x + 6y = ${2*(n+5)} and obtains a third equation. What would reveal the solution type most directly?`, 'Double the first equation and subtract the second; the result is 0 = 0.', ['The sum proves there is one solution.','The different coefficients prove there is no solution.','Set x and y to zero because subtraction cancels them.'], 'A proportional pair is best classified by elimination to an identity. The original line still constrains the solutions.'),
      n => q(`You need the exact intersection of y = 0.5x + ${n} and y = -1.5x + ${n+3}. Which result and justification are correct?`, `x = 1.5, y = ${n+0.75}; equate the expressions for y.`, [`x = 2, y = ${n+1}; round x before checking.`,`x = 3, y = ${n+1.5}; ignore the negative slope.`,`x = 0, y = ${n}; use the first intercept.`], 'Equating gives 2x = 3, hence x = 1.5. Substitute into either equation to get the exact y-value.'),
      n => q(`A learner says substitution is impossible for 2x + 3y = ${n+6} and 4x - y = ${n}. Which response is accurate?`, `Substitution works using y = 4x - ${n}; elimination also works.`, ['Only graphing is mathematically valid.','No method can solve a system with negative coefficients.','Substitution is valid only when y is isolated at the start.'], 'Method choice concerns convenience, not validity. Rearranging the second equation isolates y without fractions.')
    ]
  ]},
  { slug: 'systems-equations-word-problems', title: 'Systems of Equations Word Problems', standards: ['8.EE.8'], forms: [
    [
      n => q(`A club sells ${n+12} tickets. Let a count adult tickets and c count child tickets. Which equation represents the ticket count?`, `a + c = ${n+12}`, [`ac = ${n+12}`,`a - c = ${n+12}`,`2a + c = ${n+12}`], 'Adding the counts of the two disjoint ticket types gives the total number sold.'),
      n => q(`Adult tickets cost $${n+4} and child tickets cost $3. With a adults and c children, which expression gives revenue?`, `${n+4}a + 3c`, [`3a + ${n+4}c`,`${n+7}(a + c)`,`a + c`], 'Multiply each ticket price by its own count, then add the two dollar amounts.'),
      n => q(`For x notebooks and y pens, the system is x + y = ${n+6}, 4x + 2y = ${4*n+16}. What does the second equation measure?`, 'Total cost in dollars', ['Total number of items','Difference between the item counts','Price of one notebook'], 'The coefficients are prices per item, so each product is a dollar cost.'),
      n => nums(`There are ${n+9} bicycles and tricycles altogether. If ${n+3} are bicycles, how many are tricycles?`,6,`Subtract the bicycle count: ${n+9} - ${n+3} = 6.`),
      n => q(`A model uses x for hours and y for dollars. The solution is (${n}, ${4*n+8}). How should it be read?`, `At ${n} hours, both modeled costs are $${4*n+8}.`, [`At ${4*n+8} hours, both costs are $${n}.`,`The hourly rate is $${4*n+8}.`,`There is no shared cost.`], 'An ordered pair must be interpreted using the defined variables and units.')
    ],
    [
      n => nums(`A show sells ${n+10} tickets: adults pay $8 and children pay $5. Revenue is $${8*n+50}. How many adult tickets were sold?`,n,`Let a + c = ${n+10}. Subtract 5(a + c) from 8a + 5c = ${8*n+50}: 3a = ${3*n}, so a = ${n}.`),
      n => nums(`A rack holds ${n+8} bicycles and tricycles with ${2*n+20} wheels in total. How many tricycles are there?`,4,`If all were bicycles there would be ${2*(n+8)} wheels. Each tricycle adds one extra wheel, so there are 4.`),
      n => nums(`Plan A costs $${3*n} plus $2 per visit. Plan B costs $5 per visit. After how many visits are the costs equal?`,n,`Set ${3*n} + 2v = 5v. Then 3v = ${3*n}, so v = ${n}.`),
      n => nums(`Two numbers sum to ${2*n+8}. The larger exceeds the smaller by 6. What is the smaller number?`,n+1,`If s is smaller, s + (s + 6) = ${2*n+8}. Thus 2s = ${2*n+2} and s = ${n+1}.`),
      n => q(`A student models ${n+10} tickets at $7 for adults and $4 for children using a + c = ${n+10} and 4a + 7c = ${7*n+40}. What must be corrected?`, 'Use 7a + 4c for the revenue expression.', ['Replace the count equation with ac.','Use 7 + 4 for all ticket revenue.','There is no error.'], 'The ticket-price coefficients must correspond to the variables defined for adult and child counts.')
    ],
    [
      n => q(`A club reports ${n+10} tickets at $8 and $5, with revenue $${5*(n+10)+1}. What does the real-number solution imply about the report?`, 'It is impossible with whole tickets: the adult count would be 1/3.', ['It is valid because fractional tickets are allowed by default.','All tickets were adult tickets.','The equations have infinitely many solutions.'], `Revenue above the all-child baseline is $1. Each adult adds $3, so 3a = 1; a ticket count cannot be 1/3.`),
      n => nums(`A school needs ${n+12} kg of a $6/kg snack mix. Nuts cost $9/kg and cereal $3/kg. How many kg of nuts are needed?`,(n+12)/2,`Let u + c = ${n+12} and 9u + 3c = ${6*(n+12)}. Subtract 3 times the mass equation to get 6u = ${3*(n+12)}.`),
      n => q(`Plan A is $${4*n} plus $3 per hour; Plan B is $5 per hour. For whole hours greater than ${2*n}, which is cheaper and why?`, 'Plan A; after equality its cost grows $2 less per additional hour.', ['Plan B; it has no initial fee.','They remain equal for all later hours.','Plan A only before the equality time.'], `The equality time is ${2*n} hours. Beyond that point Plan B's larger hourly rate makes it more expensive.`),
      n => q(`A receipt says ${n+8} items cost $${4*(n+8)}. Every item costs $4, but labels distinguish pens and cards. Can you find the number of each from these totals alone?`, 'No; both equations provide the same constraint.', ['Yes; exactly half must be pens.','No; the two totals are contradictory.','Yes; all must be cards.'], 'p + c = total and 4p + 4c = 4 times total are dependent. More independent information is needed.'),
      n => solution(`A fundraiser has x $6 tickets and y $2 tickets. Total sales are ${n+9} tickets and $${6*n+26}. Find (x, y) and check the revenue.`,n+2,7,`Subtracting 2(x+y) from the revenue equation gives 4x = ${4*n+8}. Thus x = ${n+2}, y = 7, and the revenue is $${6*(n+2)+14}.`)
    ]
  ]},
  { slug: 'unit4-equations-systems-mixed-review', title: 'Unit 4 Mixed Review', standards: ['8.EE.7','8.EE.8'], forms: [
    [
      n => nums(`Solve 3x + 5 = ${3*n+5}.`,n,`Subtract 5 from both sides, then divide ${3*n} by 3.`),
      n => q(`Which expression is equivalent to 2(x + ${n}) + x?`, `3x + ${2*n}`, [`3x + ${n}`,`2x + ${2*n}`,`3x + ${2*n+1}`], 'Distribute 2 to both terms, then combine 2x and x.'),
      n => q(`Check (${n}, ${n+2}) in y = x + 2 and x + y = ${2*n+2}. Which statement is true?`, 'The pair satisfies both equations.', ['The pair satisfies only the first equation.','The pair satisfies only the second equation.','The pair satisfies neither equation.'], `The first gives ${n+2}; the sum in the second is ${2*n+2}. Both checks work.`),
      n => q(`The equation 2x + ${n} = 2x + ${n+1} has how many solutions?`, 'No solutions', ['Exactly one solution','Infinitely many solutions','Exactly two solutions'], `Subtracting 2x gives ${n} = ${n+1}, a false statement.`),
      n => q(`What does the intersection (${n}, 4) of two line graphs represent?`, 'An ordered pair satisfying both equations', ['Only the slope of the first line','Only the intercept of the second line','A point satisfying neither equation'], 'At the intersection the same x and y coordinates lie on both lines simultaneously.')
    ],
    [
      n => nums(`Solve 3(x + 2) = x + ${2*n+6}.`,n,`Distribute, subtract x and subtract 6 to get 2x = ${2*n}.`),
      n => nums(`Solve x/2 + 3 = x/4 + ${n+3}.`,4*n,`Multiply every term by 4: 2x + 12 = x + ${4*n+12}. Subtract x and 12.`),
      n => solution(`Solve y = 2x + 1 and x + y = ${3*n+1}.`,n,2*n+1,`Substitute to get 3x + 1 = ${3*n+1}; then x = ${n} and y = ${2*n+1}.`),
      n => q(`Classify y = 3x + ${n} and 2y = 6x + ${2*n}.`, 'Infinitely many solutions on the same line', ['No solutions on parallel lines','Exactly one solution at the origin','Exactly two solutions'], 'Dividing every term of the second equation by 2 produces the first equation.'),
      n => nums(`A museum charges $${n+4} admission plus $3 per activity. A visitor spends $${n+19}. How many activities did they pay for?`,5,`Write ${n+4} + 3a = ${n+19}. Subtract admission to get 3a = 15.`)
    ],
    [
      n => q(`A student expands -2(x - ${n}) as -2x - ${2*n}, then solves -2(x - ${n}) = 6. Which correction and solution are right?`, `The constant should be +${2*n}; x = ${n-3}.`, [`The expansion is correct; x = ${-n-3}.`,`Only the x sign should change; x = ${n+3}.`,`The equation has no solution.`], `The product of two negatives is positive. Then -2x + ${2*n} = 6 gives x = ${n-3}.`),
      n => q(`For which k does 3(x + ${n}) = 3x + k have infinitely many solutions, and what happens if k is one greater?`, `k = ${3*n}; one greater gives no solution.`, [`k = ${n}; one greater gives one solution.`,`k = ${3*n}; one greater gives one solution.`,`k = ${3*n+1}; one greater gives infinitely many solutions.`], `Expansion gives 3x + ${3*n} = 3x + k. Equal constants give an identity; unequal constants give a contradiction.`),
      n => solution(`Solve 2x + 3y = ${2*n+16} and 3x - 2y = ${3*n-2}. Verify your pair in both equations.`,n+2,4,`Multiply the equations by 2 and 3 and add: 13x = ${13*n+26}. Then x = ${n+2} and y = 4; both original totals match.`),
      n => q(`Two taxi fares are A = ${3*n} + 2d and B = 5d. A learner says equality occurs at d = ${3*n}. What is the correct distance and a check?`, `d = ${n}; both fares are $${5*n}.`, [`d = ${3*n}; both fares are $${3*n}.`,`d = 0; both fares are zero.`,`The fares never agree.`], `Set ${3*n} + 2d = 5d, so 3d = ${3*n}. Substitution gives equal fares at d = ${n}.`),
      n => q(`A system is x + y = ${n+9}, 2x + 2y = ${2*(n+9)+2}. A learner divides the second equation by 2 and claims infinitely many solutions. What was missed?`, `Its right side becomes ${n+10}, contradicting x + y = ${n+9}.`, ['The equations actually have exactly one solution.','Dividing an equation by 2 is never allowed.','Only the origin solves the system.'], 'Matching variable coefficients are not enough. The right sides must match too; these equations give distinct parallel lines.')
    ]
  ]}
];

// Seeded backtracking keeps regeneration reproducible without sharing one key across packs.
export function positions(total, seed) {
  let state = [...seed].reduce((s,c) => Math.imul(s,31) + c.charCodeAt(0), 1) >>> 0;
  const random = () => ((state = (Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const remaining = [0,1,2,3].map(i => Math.floor(total/4)+(i<total%4?1:0));
  const seq = [];
  function fill() {
    if(seq.length===total) return true;
    const choices = [0,1,2,3].map(i=>({i,t:random()})).sort((a,b)=>remaining[b.i]-remaining[a.i]||a.t-b.t);
    for(const {i} of choices) {
      if(!remaining[i]) continue;
      const a=[...seq,i], n=a.length;
      if(n>=3 && ((a[n-3]===i&&a[n-2]===i) || (a[n-2]===(a[n-3]+1)%4&&i===(a[n-2]+1)%4))) continue;
      if(a.slice(-8).filter(x=>x===i).length>4) continue;
      if([2,3,4].some(k=>n>=2*k&&a.slice(-k).every((v,j)=>v===a[n-2*k+j]))) continue;
      seq.push(i);remaining[i]--;
      if(fill()) return true;
      remaining[i]++;seq.pop();
    }
    return false;
  }
  if(!fill()) throw new Error('No answer sequence');
  return seq;
}

export function buildBank(pack, review=false) {
  const testId=`course3-${pack.slug}-${review?'review':'core'}`;
  const counts=review?[8,12]:[10,25,15];
  const items=counts.flatMap((count,level)=>Array.from({length:count},(_,i)=>{
    const form=i%5;
    const n=(review?11:2)+Math.floor(i/5);
    return {...pack.forms[level][form](n), difficulty:['scaffold','standard','challenge'][level], skillTags:['reasoning','linear-equations',level===2?'transfer':'practice']};
  }));
  const key=positions(items.length,testId);
  return {testId, conceptId:`concept-${pack.slug}`,type:review?'review':'concept',title:`${pack.title} ${review?'Review':'Core'} Test`,description:`Practice and explain ${pack.title.toLowerCase()}.`,questions:items.map((item,i)=>{
    const {distractors,...rest}=item;
    if(new Set([item.correctAnswer,...distractors]).size!==4) throw new Error(`Duplicate options: ${testId} ${i}`);
    const options=[...distractors];options.splice(key[i],0,item.correctAnswer);
    return {id:`${testId}-${String(i+1).padStart(3,'0')}`,type:'multiple_choice',answerType:'text',...rest,options};
  })};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  for(const pack of packs) for(const review of [false,true]) {
    const bank=buildBank(pack,review);
    fs.writeFileSync(`${root}/test-sets/${bank.testId}.json`,JSON.stringify(bank,null,2)+'\n');
    console.log(`${bank.testId}: ${bank.questions.length} questions`);
  }
}

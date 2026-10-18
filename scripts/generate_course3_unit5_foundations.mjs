import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { positions } from './generate_course3_unit4_completion.mjs';

const q = (questionText, correctAnswer, distractors, explanation) => ({questionText,correctAnswer:String(correctAnswer),distractors:distractors.map(String),explanation});
const numeric = (text, value, explanation) => q(text,value,[value-1,value+1,value+3],explanation);

export const packs = [
  { slug:'understand-functions', title:'Understand Functions', standards:['8.F.1'], forms:[
    [
      n=>q(`A machine assigns input ${n} to output ${n+4}. Under the same rule, can that same input also have output ${n+5}?`,'No; one input cannot have two different outputs.',['Yes; functions allow any number of outputs per input.','Yes; both outputs are positive.','No; outputs must equal inputs.'],'A function assigns exactly one output to each input in its domain. Changing the output for the same input would violate that rule.'),
      n=>q(`The complete relation is (${n}, 7), (${n+1}, 7), (${n+2}, 7). Is it a function of the first coordinate?`,'Yes; each input has one output.',['No; the output 7 repeats.','No; a function must increase.','Yes; any three pairs form a function.'],'Different inputs may share an output. Check each first coordinate separately; none has conflicting outputs.'),
      n=>numeric(`The function rule is: add 5 to the input. What is the output for input ${n}?`,n+5,`Apply the rule to the input: ${n} + 5 = ${n+5}. The result is the output.`),
      n=>q(`A rule sends ${n} to ${n+9}. Which number is the input?`,n,[n+9,n+1,9],'In an input-to-output statement, the starting number is the input. The number it is sent to is the output.'),
      n=>q(`The complete list is (${n}, 3), (${n}, 8). Which fact prevents it from being a function of x?`, `Input ${n} has outputs 3 and 8.`,['There are only two pairs.','The outputs are different numbers.','The numbers are all positive.'],'The conflict is two different outputs for one input. Different outputs at different inputs would be allowed.')
    ],
    [
      n=>q(`A function already contains (${n}, 4) and (${n+1}, 6). Which new pair would create a conflict?`,`(${n}, 9)`,[`(${n+2}, 4)`,`(${n+3}, 6)`,`(${n+4}, 9)`],`The existing input ${n} already has output 4. Assigning it 9 would give two outputs; the other options introduce new inputs.`),
      n=>q(`A relation records (${n}, 5), (${n}, 5), (${n+1}, 8). Does the repeated identical record break the function rule?`,'No; the repeated input still has only one distinct output.',['Yes; an input may never be recorded twice.','Yes; outputs must be unique.','No; duplicate inputs can have any outputs.'],'Recording the same pair twice adds no new assignment. A repeated input breaks the rule only when its outputs disagree.'),
      n=>numeric(`A function doubles its input, then subtracts 3. Which input produces output ${2*n+1}?`,n+2,`Work backward: add 3 to ${2*n+1}, then divide by 2. Check: 2(${n+2}) - 3 = ${2*n+1}.`),
      n=>q(`At a school with ${n+10} students, each student is assigned exactly one homeroom. Several students share a room. Is student-to-homeroom a function?`,'Yes; each student has exactly one assigned room.',['No; a room cannot be shared.','No; the inputs are not numbers.','Yes; every relation involving students is a function.'],'Inputs and outputs need not be numbers. Shared outputs are allowed; the unique room assigned to each student is what matters.'),
      n=>q(`Only inputs ${n} and ${n+1} are allowed. Both are assigned output 0. How many distinct output values does this function have?`,'1',['0','2','It is not a function.'],'There are two inputs but only one distinct output value, zero. A constant function is still a function.')
    ],
    [
      n=>q(`A machine is tested at inputs ${n}, ${n+1}, and ${n+2}, with one output observed each time. What can you conclude about untested inputs?`,'The observations show no conflict, but do not prove the machine follows a function rule for every allowed input.',['Every untested input must give the same output.','Three tests prove the entire machine is a function.','The machine cannot be a function unless every output differs.'],'A finite sample can reveal a violation, but cannot establish unspecified behavior outside that sample. A complete rule or specification is needed.'),
      n=>q(`A function sends ${n} to 4 and ${n+1} to 4. Reverse these assignments. Is the reverse relation a function of its input?`,'No; input 4 now has two different outputs.', ['Yes; reversing any function preserves the function rule.','No; reversing a relation removes all inputs.','Yes; the original inputs were different.'],`Reversing produces (4, ${n}) and (4, ${n+1}). The shared original output becomes one input with two outputs.`),
      n=>q(`For each real input x, a relation allows every y with y squared = x squared. At x = ${n}, what shows this is not a function of x?`,`Both y = ${n} and y = -${n} are allowed.`,[`Only y = ${n} is allowed.`,`Only y = 0 is allowed.`,`There are no allowed outputs.`],`Both ${n} and -${n} have square ${n*n}. Since this nonzero input has two allowed outputs, the relation fails the function rule.`),
      n=>q(`For whole-number inputs, a rule outputs x + 2 when x is even, and x - 1 when x is odd. Is this a function, and what is its output at ${2*n+1}?`,`Yes; the output is ${2*n}, using the odd-input rule.`,[`No; having two instructions always makes two outputs.`,`Yes; the output is ${2*n+3}, using the even-input rule.`,`No; odd inputs cannot belong to functions.`],'Every whole number is either even or odd, never both. Exactly one instruction applies to each input, so the rule assigns one output.'),
      n=>q(`A temperature app uses only the day number as input. On day ${n}, it reports 12 degrees at noon and 17 degrees at 3 p.m. Which change makes the input specific enough for one recorded output?`,'Use the pair (day, time) as the input, with one reading for each pair.',['Keep only the day as input and assign both outputs.','Replace both readings with their sum without changing the task.','Require different days to have different temperatures.'],'The day alone does not distinguish the two readings. Including time makes the input identify the particular measurement.')
    ]
  ]},
  { slug:'functions-tables-mapping-diagrams', title:'Functions in Tables and Mapping Diagrams', standards:['8.F.1'], forms:[
    [
      n=>q(`A table lists x -> y as ${n} -> 2, ${n+1} -> 4, ${n+2} -> 6. Is the displayed relation a function?`,'Yes; every listed x has one y.',['No; the y-values are different.','No; x does not start at zero.','Yes; every table is a function.'],'Read the input column first. Each listed input has one assignment, so these rows define a function on the listed inputs.'),
      n=>q(`A mapping shows arrows ${n} -> 5 and ${n} -> 9. Which input has conflicting outputs?`,n,[5,9,n+1],`Follow the arrows from ${n}: one goes to 5 and one to 9. One input with two different outputs fails the test.`),
      n=>q(`Three arrows are ${n} -> 8, ${n+1} -> 8, ${n+2} -> 8. Do converging arrows break the function rule?`,'No; each input still has just one outgoing assignment.',['Yes; an output can receive only one arrow.','Yes; the output must increase.','No; every arrow diagram is a function.'],'Several arrows may end at the same output. The test concerns arrows leaving each input, not arriving at each output.'),
      n=>numeric(`Read the table: input ${n} gives 3; input ${n+1} gives 6; input ${n+2} gives 9. What is the output for input ${n+1}?`,6,'Find the specified input row and read its paired output. Do not use the input number itself as the answer.'),
      n=>q(`The stated input set is {${n}, ${n+1}, ${n+2}}. Arrows are shown only from ${n} and ${n+1}. What is missing for a function on that entire input set?`, `One output assignment for ${n+2}.`,['A different output for every input.','A second arrow from every input.','An arrow from every output back to an input.'],'A function must assign an output to every input in its stated domain, as well as avoiding conflicting outputs.')
    ],
    [
      n=>q(`A table contains (${n}, 2), (${n+1}, 5), (${n}, 2). A student rejects it because x repeats. What is the correction?`,'The repeated x has the same y both times, so the displayed relation is a function.',['The repeated x must be deleted even when its output agrees.','It is not a function because every y must be different.','It is a function only if the inputs are sorted.'],'Identical rows repeat the same assignment. Only different outputs for the same input create a conflict.'),
      n=>q(`A function table has (${n}, 3), (${n+1}, 7), (${n}, k). What value of k avoids a conflict?`,3,[7,0,4],`Input ${n} already gives 3. Its second row must agree with that output.`),
      n=>q(`A mapping has ${n} -> 4 and ${n+1} -> 6. Which additional arrow would make the relation fail the function test?`,`${n+1} -> 9`,[`${n+2} -> 4`,`${n+3} -> 6`,`${n+4} -> 9`],`Input ${n+1} would have outputs 6 and 9. The other arrows have new inputs and create no conflict.`),
      n=>q(`A table is shown in this order: (${n+2}, 8), (${n}, 4), (${n+1}, 6). Which mapping represents exactly the same relation?`,`${n} -> 4; ${n+1} -> 6; ${n+2} -> 8`,[`${n} -> 8; ${n+1} -> 6; ${n+2} -> 4`,`4 -> ${n}; 6 -> ${n+1}; 8 -> ${n+2}`,`${n} -> 4; ${n+1} -> 8; ${n+2} -> 6`],'The order of rows can change, but each input-output pairing must stay intact. Reversing arrows changes the relation.'),
      n=>numeric(`The table follows the stated rule y = 2x + 1. Its rows include (${n}, ${2*n+1}) and (${n+2}, ?). What fills the missing output?`,2*n+5,`Use the supplied rule, not a guessed pattern: 2(${n+2}) + 1 = ${2*n+5}.`)
    ],
    [
      n=>q(`A table has rows (${n}, 4), (${n}, 9), (${n+1}, 9), (${n+2}, 7). Which single deletion leaves a function on all three original inputs?`,`Delete (${n}, 9).`,[`Delete (${n+1}, 9).`,`Delete (${n+2}, 7).`,'No deletion can repair it.'],`Deleting the conflicting row for ${n} leaves one assignment for each original input. Removing a different input would not resolve the conflict.`),
      n=>q(`A table contains (${n}, 2), (${n+1}, 2), (${n+2}, 5). What happens if the input and output columns are exchanged?`,'The reverse is not a function because input 2 has two different outputs.',['The reverse must be a function because the original was.','The reverse is not a function because it has three rows.','Both directions are functions because all entries are numbers.'],`After exchange, (2, ${n}) and (2, ${n+1}) conflict. The original relation allows a shared output; the reverse does not allow conflicting outputs.`),
      n=>q(`Only the rows (${n}, 4) and (${n+1}, 6) are given, with no formula. Can you determine the output for input ${n+2} uniquely?`,'No; many function rules can agree with the shown rows and differ at the new input.',['Yes; it must be 8 because the previous increase was 2.','Yes; it must be 6 because outputs cannot change.','No; two-row tables can never represent functions.'],'The displayed rows define a function on their listed inputs. Extending beyond them requires a stated rule; a plausible pattern is not uniquely determined.'),
      n=>q(`A table contains (k, 3), (${n}, 8), (${n+1}, 3). Which listed k makes it fail to be a function?`,n,[n+1,n+2,n+3],`If k = ${n}, that input receives both 3 and 8. If k = ${n+1}, the duplicate has the same output 3 and remains valid.`),
      n=>q(`A complete relation pairs each of ${n+4} inputs with one output. Exactly two inputs share an output; all other outputs are distinct. How many distinct outputs are there, and is it a function?`,`${n+3} distinct outputs; yes.`,[`${n+4} distinct outputs; yes.`,`${n+3} distinct outputs; no.`,`${n+2} distinct outputs; no.`],'One shared pair reduces the number of distinct outputs by one. Every input still has exactly one output, so the relation is a function.')
    ]
  ]}
];

export function buildBank(pack, review=false) {
  const testId=`course3-${pack.slug}-${review?'review':'core'}`;
  const counts=review?[8,12]:[10,25,15];
  const key=positions(review?20:50,testId);
  const items=counts.flatMap((count,level)=>Array.from({length:count},(_,i)=>{
    const n=(review?21:11)+Math.floor(i/5);
    return {...pack.forms[level][i%5](n),difficulty:['scaffold','standard','challenge'][level]};
  }));
  return {testId,conceptId:`concept-${pack.slug}`,type:review?'review':'concept',title:`${pack.title} ${review?'Review':'Core'} Test`,description:'Identify inputs, reason about unique outputs, and explain representations and counterexamples.',questions:items.map((item,i)=>{
    const {distractors,...rest}=item;
    if(new Set([item.correctAnswer,...distractors]).size!==4) throw Error(`${testId}/${i}: duplicate options`);
    const options=[...distractors];options.splice(key[i],0,item.correctAnswer);
    return {id:`${testId}-${String(i+1).padStart(3,'0')}`,type:'multiple_choice',answerType:'text',...rest,options,skillTags:['functions','reasoning',item.difficulty==='challenge'?'transfer':'conceptual']};
  })};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  for(const pack of packs) for(const review of [false,true]) {
    const bank=buildBank(pack,review);
    fs.writeFileSync(`public/content/math/course3/test-sets/${bank.testId}.json`,JSON.stringify(bank,null,2)+'\n');
    console.log(bank.testId,bank.questions.length);
  }
}

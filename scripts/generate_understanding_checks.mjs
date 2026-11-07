import fs from 'node:fs';

const numeric = (questionText, correctAnswer, explanation, answerType='number') => ({type:'numeric',questionText,correctAnswer:String(correctAnswer),answerType,explanation});
const choice = (questionText, correctAnswer, distractors, explanation) => ({type:'multiple_choice',questionText,correctAnswer,options:[correctAnswer,...distractors],explanation});
const packs = [
  ['operations-with-scientific-notation', 'Operations with Scientific Notation', [
    numeric('Calculate (3 x 10^4)(2 x 10^2). Enter the result as an ordinary number.',6000000,'Multiply 3 by 2 and add exponents: 6 x 10^6 = 6000000.'),
    choice('Which expression equals (8.4 x 10^6) / (2 x 10^3)?','4.2 x 10^3',['4.2 x 10^9','6.4 x 10^3','4.2 x 10^2'],'Divide coefficients and subtract exponents: 8.4 / 2 = 4.2 and 6 - 3 = 3.'),
    numeric('A sensor records 2400 bytes each second for 300 seconds. How many bytes are recorded?',720000,'Multiply rate by time: 2400 x 300 = 720000 bytes.'),
    choice('One archive is 3.7 x 10^5 bytes and another is 8 x 10^4 bytes. What is their combined size?','4.5 x 10^5 bytes',['1.17 x 10^6 bytes','1.17 x 10^9 bytes','4.5 x 10^4 bytes'],'Rewrite the second size as 0.8 x 10^5, then add coefficients: 3.7 + 0.8 = 4.5.'),
    numeric('A sample contains 9 x 10^7 cells. Each tray holds 3 x 10^4 cells. How many full trays are needed?',3000,'Divide 9 by 3 and subtract exponents: 3 x 10^3 = 3000 trays.'),
    choice('A student adds 2 x 10^3 and 5 x 10^4 and reports 7 x 10^7. Which correction identifies the mistake?','Use a common power before adding: the result is 5.2 x 10^4.',['Add coefficients but keep 10^3: 7 x 10^3.','Multiply coefficients: 1 x 10^8.','Only subtract the exponents: 7 x 10^1.'],'Exponent addition applies to multiplication, not addition. 2000 + 50000 = 52000.'),
    choice('A calculation gives 18 x 10^-5. Which normalized scientific notation preserves its value?','1.8 x 10^-4',['1.8 x 10^-6','18 x 10^-4','0.18 x 10^-4'],'Dividing the coefficient by 10 requires multiplying the power of ten by 10. Increase the exponent from -5 to -4.'),
    numeric('A transmitter sends 6 x 10^6 bytes per minute for 4 minutes. After removing 8 x 10^6 duplicate bytes, the remaining data is split equally among 8 files. How many bytes are in each file?',2000000,'Total 24 x 10^6; subtract 8 x 10^6 to leave 16 x 10^6; divide by 8 to get 2 x 10^6 bytes.')
  ]],
  ['repeating-decimals-fractions','Repeating Decimals as Fractions',[
    numeric('Write 0.777... as a fraction. Only the digit 7 repeats.','7/9','Let x = 0.777... . Then 10x - x = 7, so x = 7/9.','fraction'),
    choice('For x = 0.454545..., which subtraction cancels the repeating tail?','100x - x',['10x - x','100x - 10x','x - 1000x'],'The repeating block has two digits, so shift by two places: 100x = 45.454545... .'),
    numeric('A repeating pattern colors exactly 0.363636... of a strip. What fraction of the strip is colored?','4/11','99x = 36, giving 36/99 = 4/11.','fraction'),
    choice('One machine completes exactly 0.666... of a job each hour; another completes 0.67. Which rate is greater?','The second rate, by 1/300 of a job per hour.',['The rates are equal.','The first rate, by 1/300.','The second rate, by 1/3.'],'0.666... = 2/3. Subtract: 67/100 - 2/3 = 1/300.'),
    numeric('A tank is exactly 0.1666... full, with only the 6 repeating. What fraction is full?','1/6','10x = 1.666... and 100x = 16.666... . Subtract to get 90x = 15, so x = 1/6.','fraction'),
    choice('A student says 0.272727... = 27/100 because two digits repeat. What is the correct repair?','Use 27/99 because 100x - x = 27.',['Keep 27/100; it is exact.','Use 27/9 because every repeating decimal has denominator 9.','Use 2/7 because the digits are 2 and 7.'],'27/100 terminates. Cancelling the infinite tail gives 99x, not 100x.'),
    choice('A display rounds 2/9 to 0.222. Is the displayed decimal exactly equal to 2/9?','No; 2/9 exceeds 0.222 by 1/4500.',['Yes; three matching digits prove equality.','No; 0.222 exceeds 2/9 by 1/4500.','No; the difference is 2/9.'],'2/9 - 222/1000 = 2/9 - 111/500 = 1/4500. A finite display is not the infinite decimal.'),
    numeric('A ribbon is exactly 1.2333... meters long, with only the 3 repeating. After cutting off 0.4 meter, what fraction of a meter remains?','5/6','The original is 37/30. Subtract 2/5 = 12/30 to get 25/30 = 5/6.','fraction')
  ]],
  ['approximate-irrational-numbers','Approximate Irrational Numbers',[
    numeric('What is the greatest whole number less than the square root of 58?',7,'7 squared is 49 and 8 squared is 64. Therefore 7 < sqrt(58) < 8.'),
    choice('Which pair of consecutive integers encloses the square root of 115?','10 and 11',['11 and 12','9 and 10','57 and 58'],'100 < 115 < 121, so 10 < sqrt(115) < 11.'),
    numeric('A square patio has area 38 square meters. Estimate its side length to the nearest tenth of a meter.',6.2,'6.15 squared = 37.8225, so sqrt(38) is above the rounding midpoint 6.15 and below 6.25; it rounds to 6.2.','decimal'),
    choice('A rod has length sqrt(67) meters. Which interval gives a justified bound?','8.1 < length < 8.2',['8.2 < length < 8.3','6.7 < length < 6.8','8.0 < length < 8.1'],'8.1 squared = 65.61 and 8.2 squared = 67.24. The area 67 lies between these squares.'),
    numeric('A square tile has area 21 square centimeters. Its side length is sqrt(21). What is the smallest whole-centimeter width of a box that can fit this side?',5,'4 squared < 21 < 5 squared. The side is greater than 4, so a whole-centimeter width must be at least 5.'),
    choice('A student rounds sqrt(30) to 5.4 because 5.4 squared is below 30. Which reasoning corrects the rounding?','5.45 squared is 29.7025, so sqrt(30) rounds to 5.5.',['Always round down when a square is below the target.','sqrt(30) is exactly 5.4.','Compare 30 with 5.4 instead of squaring.'],'Use the midpoint between 5.4 and 5.5. Since sqrt(30) exceeds 5.45, round up to 5.5.'),
    choice('Given 7.2 squared = 51.84 and 7.3 squared = 53.29, can these facts alone decide whether sqrt(52) rounds to 7.2 or 7.3?','No; also compare 52 with the square of the midpoint 7.25.',['Yes; always choose the lower bound.','Yes; always choose the upper bound.','No; square roots cannot be rounded.'],'The bounds locate the root, but the midpoint square determines nearest-tenth rounding. Here 7.25 squared = 52.5625, so the result is 7.2.'),
    numeric('Two square gardens have areas 13 and 29 square meters. A straight path has length equal to the sum of their side lengths. Estimate the path length to the nearest tenth of a meter. Keep extra digits until the final rounding.',9,'sqrt(13) is about 3.60555 and sqrt(29) about 5.38516. Their sum is about 8.99071, which rounds to 9.0.','decimal')
  ]]
];
for (const [slug,title,items] of packs) {
  let mc = 0;
  const positions = [2,0,3,1];
  const testId = `course3-${slug}-understanding-check`;
  const questions = items.map((q,i) => {
    if(q.options){const [correct,...other]=q.options;other.splice(positions[mc++],0,correct);q.options=other;}
    return {id:`${testId}-${String(i+1).padStart(3,'0')}`,...q,
      difficulty:i<2?'scaffold':i<7?'standard':'challenge',
      tags:[i<2?'check-foundation':i===5||i===6?'check-misconception':i===7?'check-challenge':'check-transfer'],
      skillTags:['reasoning',i<2?'computation':'application'],eligibleForMixed:false};
  });
  fs.writeFileSync(`public/content/math/course3/test-sets/${testId}.json`,JSON.stringify({testId,conceptId:`concept-${slug}`,type:'understanding-check',title:`${title}: Understanding Check`,description:'8 questions',questions},null,2)+'\n');
}

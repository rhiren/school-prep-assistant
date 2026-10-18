# Functions in Tables and Mapping Diagrams

## Follow the pair, not the row order

A table records input-output pairs. A mapping diagram shows the same assignments with arrows. To translate between them, keep each pair together: the arrow begins at the input and ends at its paired output.

| Input x | Output y |
| --- | --- |
| 5 | 9 |
| 2 | 7 |
| 5 | 7 |

Start with input 5. One row gives 9, and another gives 7. Those are different outputs for the same input, so this table is not a function of x. Sorting the rows would not fix that conflict.

![Input 5 has arrows to both 7 and 9, so this mapping is not a function.](content/math/course3/images/function-conflicting-output.svg)

## A reliable table check

1. Read the input column, not the output column.
2. Group records that have the same input.
3. Compare outputs within each group. Different outputs mean a conflict; identical rows do not.
4. If a complete input set is specified, check that every input has an assignment.

For example, (3, 8), (6, 8), (3, 8) defines a function on inputs 3 and 6. The duplicate row repeats an existing assignment. The shared output 8 is also allowed.

## Read arrows in the right direction

Count distinct destinations from each input. One destination is correct; two different destinations fail. Several arrows arriving at the same output are fine. An unused output label causes no problem, but an unassigned input in the stated domain does.

If the stated input set is {2, 5, 8} and arrows only leave 2 and 5, the diagram is incomplete for that domain. Assign exactly one output to 8. Without a stated larger domain, a table describes a relation on its listed inputs.

## Fill missing entries carefully

Suppose the rows are (4, 6), (9, 2), (4, k). To remain a function, k must equal 6. The repeated input forces agreement.

Now suppose the stated rule is y = 3x - 2. At input 5, calculate 3 times 5 - 2 = 13. Here a rule determines a new output.

But two rows alone do not determine a unique rule. From (1, 4) and (2, 6), output 8 at input 3 is a reasonable linear extension, not a guaranteed answer unless a linear rule is specified. Many functions fit the first two rows.

## Repair and reverse

In the first table, deleting (5, 9) leaves (2, 7) and (5, 7), a function on both original inputs. Deleting (2, 7) instead leaves the conflict at 5 unresolved.

Reversing the repaired table gives (7, 2) and (7, 5). That reverse is not a function because input 7 now has two destinations. Always check the new input column after reversing.

## Try these checks

1. Translate (8, 3), (2, 6) into arrows.
2. What k makes (8, 3), (2, 6), (8, k) a function?
3. Can you deduce the output at input 10 from those rows alone?
4. Four inputs each have one output. Exactly two share an output; the others have distinct outputs. How many distinct outputs are there?

## Reasoning to compare

1. The arrows are 8 to 3 and 2 to 6. Do not reverse their direction.
2. k = 3, so the assignments for input 8 agree.
3. No. No rule for extending to input 10 was supplied.
4. Three distinct outputs. Sharing reduces the count by one without breaking the function rule.

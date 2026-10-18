# Graph Linear Equations

## What does a graph show?

An equation is a rule for which points belong on a line. A point `(x, y)` belongs if its coordinates make the equation true. To plot `(2, -3)`, move horizontally right 2 from the origin, then vertically down 3.

**Start with two points, not a whole line.** Once you have two different correct points, draw a straight line through them and extend it in both directions.

## Two clues in y = mx + b

| Part | Meaning | What you do |
| --- | --- | --- |
| b, the y-intercept | y when x is zero | Plot `(0, b)` on the vertical axis |
| m, the slope | Change in y divided by change in x | Use rise/run to move to another point |

In `y = 2x + 1`, **start at 1; change by 2**. The intercept is a starting point; the slope is a movement.

## First example: a whole-number slope

Graph `y = 2x + 1`.

1. Set `x = 0`: `y = 2(0) + 1 = 1`. Plot `(0, 1)`.
2. Read slope `2` as `2/1`: move right 1 and up 2 from `(0, 1)`. Plot `(1, 3)`.
3. Repeat to reach `(2, 5)`, then draw a straight line through the points.

Check `(1, 3)`: `2(1) + 1 = 3`. We added 2 to the starting y-value of 1; we did not reset y to 2.

## Fractional slope: right 2, up 3

Graph `y = (3/2)x - 2`. The intercept is **negative 2**, so start below the origin at `(0, -2)`. The positive slope `3/2` means right 2 and up 3.

| Step | x-coordinate | y-coordinate | Point |
| --- | --- | --- | --- |
| Start | 0 | -2 | `(0, -2)` |
| Right 2, up 3 | 0 + 2 = 2 | -2 + 3 = 1 | `(2, 1)` |
| Repeat | 2 + 2 = 4 | 1 + 3 = 4 | `(4, 4)` |

![Graph of y = (3/2)x - 2 through (0, -2), (2, 1), and (4, 4). The dashed step goes right 2 then up 3. Each grid square is one unit.](content/math/course3/images/graph-linear-positive.svg)

**The denominator is the horizontal movement; the numerator is the vertical change.** Here `(2, 3)` describes the movement, not the next point. The next point is `(2, 1)` because we started at y = -2.

Check: `(3/2)(2) - 2 = 1`. A negative intercept does not make the slope negative. This line rises from left to right.

## Negative slope: right 2, down 1

Graph `y = (-1/2)x - 2`.

1. The intercept is still -2. Plot `(0, -2)`.
2. Read slope `-1/2` as right 2 and down 1.
3. Add those changes: `x = 0 + 2`, `y = -2 - 1`. Plot `(2, -3)`.
4. Repeat to reach `(4, -4)`, then draw the line.

![Graph of y = (-1/2)x - 2 through (0, -2), (2, -3), and (4, -4). The dashed step goes right 2 then down 1. Each grid square is one unit.](content/math/course3/images/graph-linear-negative.svg)

Check: `(-1/2)(2) - 2 = -3`. Going up 1 instead gives `(2, -1)`, which fails the check.

You can also move left 2 and up 1 to reach `(-2, -1)`. Both changes reverse, so `1/(-2)` is still `-1/2`. Moving right first is a consistent way to track the sign while learning.

## When you are unsure, make a table

Substitute convenient x-values into the equation. For fractional slopes, multiples of the denominator often keep arithmetic simple. For `y = (-1/2)x - 2`:

| x | Substitute | y | Point |
| --- | --- | --- | --- |
| 0 | `(-1/2)(0) - 2` | -2 | `(0, -2)` |
| 2 | `(-1/2)(2) - 2` | -3 | `(2, -3)` |
| 4 | `(-1/2)(4) - 2` | -4 | `(4, -4)` |

The table and slope steps produce the same points. Check axis labels before counting squares: if one square represents 2 units, a run of 2 is only one square.

## Choosing an answer in practice

- **First point or y-intercept?** Look for x = 0 and the signed value of b as y.
- **Move right a specified amount?** Calculate `change in y = slope * change in x`, then add it to the starting y-value.
- **Which graphing description?** Check the starting intercept and slope separately. Both must match.
- **Does this point belong?** Substitute its x into the equation and compare with its y.

For `y = (3/2)x - 2`, moving right 4 from `(0, -2)` means up 6, ending at `(4, 4)`. That is two slope steps at once.

## Special cases and quick corrections

| If you see or do this | Remember |
| --- | --- |
| `y = -3x` | No added constant means b = 0; start at the origin |
| `y = 4` | Slope is zero; draw a horizontal line through `(0, 4)` |
| `x = 4` | This is a vertical line, not of the form `y = mx + b` |
| Start at `(b, 0)` | That is on the x-axis; the y-intercept is `(0, b)` |
| Swap rise and run | `3/2` means right 2 and up 3 |

## Your turn: try before reading the check

1. For `y = 3x - 1`, find the first point, then the point after moving right 1.
2. For `y = (-2/3)x + 4`, move right 3 from the intercept. Where do you land?
3. A student plots `(2, 3)` on `y = (3/2)x - 2`. Explain and correct the mistake.

### Check your reasoning

1. Start at `(0, -1)`. Right 1 and up 3 gives `(1, 2)`. Check: `3(1) - 1 = 2`.
2. Start at `(0, 4)`. Right 3 and down 2 gives `(3, 2)`. Check: `(-2/3)(3) + 4 = 2`.
3. The student used the rise as the final y-coordinate. Add it to the intercept: `-2 + 3 = 1`, so the correct point at x = 2 is `(2, 1)`.

**Find the starting point, make one slope move, and check in the equation.** Getting these steps clear matters more than doing them quickly.

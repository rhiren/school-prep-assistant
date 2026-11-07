# Functions on Graphs

## A point is an input-output pair

In a graph of y as a function of x, read the horizontal axis for the input and the vertical axis for the output. The point (2, 3) means input 2 gives output 3. To find an output, start at the requested x, move vertically to the graph, and read the height.

![The line y = x + 1 has one point at each input. At input 2, the dashed vertical line meets the graph only at output 3.](content/math/course3/images/functions-graph-pass.svg)

## Why the vertical-line test works

A vertical line holds x fixed. If it hits two different graph points, that one input has two outputs, so y is not a function of x. A graph passes when every vertical line meets it at most once. A line outside the graph's domain can meet it zero times.

In the example above, x = 2 leads only to y = 3. Try other x-values: each still gives exactly one height. It is a function.

![Two solid points at input 2 have heights 1 and 3. The dashed vertical line meets both, so these points cannot both belong to a function of x.](content/math/course3/images/functions-graph-fail.svg)

In this second example, input 2 gives both 1 and 3. That single counterexample is enough to reject the graph. Checking one other input that works would not repair the conflict.

## Do not use a horizontal test line

The horizontal line y = 4 is a function: any input gives output 4. Repeated outputs are allowed. By contrast, the vertical line x = 4 contains many outputs for input 4 and fails.

A curved graph can also be a function. Imagine a U-shaped curve with one height at each x. A horizontal line might meet both sides, but that only shows two different inputs sharing an output. The vertical test still passes.

## Solid points, open circles, and gaps

A solid point is included. An open circle marks a location excluded from that piece of graph. At x = 3, an open circle at height 2 and a solid point at height 5 give only one included output: 5.

If both points were solid, the graph would fail. If neither were included and no other point existed at that x, then 3 would be outside the graph's domain. A function need not accept every real number.

When a graph shows only isolated points, do not draw imaginary segments between them. The points (1, 2) and (3, 6) alone do not supply an output at x = 2. If a straight segment explicitly connects them, its midpoint does give (2, 4).

## A harder boundary check

Suppose one piece follows y = x for x < 2 and another follows y = x + 2 for x >= 2. At input 2, the first piece is excluded and the second gives 4. Each input has one output, even though there is a jump.

If two included pieces share an input, compare their heights there. They must agree. Two pieces meeting at the same point do not create two distinct outputs.

## Try before checking

1. A graph contains (4, 9). What is the output at input 4?
2. Does the horizontal line y = -2 define a function of x?
3. Only (1, 3) and (3, 7) are plotted. Is the output at 2 necessarily 5?
4. A circle centered at the origin has radius 3. Which outputs occur at x = 0, and does it pass the test?

## Check your explanation

1. Output 9 is the vertical coordinate.
2. Yes. Every input gives exactly -2.
3. No. No connecting segment or rule was given.
4. Both 3 and -3 occur at input 0. The vertical line meets twice, so the circle is not a graph of y as a function of x.

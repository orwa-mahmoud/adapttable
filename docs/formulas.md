# React table formulas — spreadsheet columns computed from your rows

▶ **See it working:** [type a formula and watch the column appear in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/formulas/) — a real table you can click, not a recording.

A column whose value is `=[Unit Price] * Quantity`, typed by the user rather
than written by you.

`@adapttable/core/formula` is a separate entry, so a table with no computed
columns never downloads a parser. It costs 2.8 KB gzipped to the tables that
import it and nothing to the rest, which the bundle budget checks on every
build.

## The shape

```tsx
import { buildFormulaColumns } from "@adapttable/react/formula";

const {
  columns: computed,
  errors,
  cycles,
} = buildFormulaColumns<Row>([
  { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
  { key: "withTax", header: "With tax", formula: "=total * 1.2" },
]);

<DataTable
  data={rows}
  columns={[...columns, ...computed]}
  rowKey={(r) => r.id}
/>;
```

`@adapttable/react/formula` returns kit-ready `ColumnDef`s. The same builder
on `@adapttable/core/formula` returns `ColumnMetadata` for React-free code.
Each spec may also carry `format: (value: FormulaValue) => string` to turn a
value into display text.

A formula may reference a data field or another formula column by name.
Bracket a name that contains spaces — `[Unit Price]` — which is why the
brackets exist rather than an escaping rule.

`errors` names the formulas that would not parse, with the parser's message;
`cycles` names the keys that reference each other in a loop. Both are reported
rather than thrown, because a formula bar has to show something useful while
someone is still typing, and half a formula is the normal state of one being
written.

## A formula is parsed, never evaluated

The rule the parser exists to keep: **a formula is text, and it is parsed.**
It never reaches `eval`, `new Function`, or anything else that would run it as
JavaScript.

A user-typed formula is untrusted input in exactly the way a URL is. A table
that evaluates one has handed the page to whoever typed it — and in a
[saved view](./saved-views.md) that can be shared, to whoever sent the link.

The grammar is deliberately small, because a formula language grows one "just
add" at a time until it is a programming language nobody can secure:

```
expression → comparison
comparison → concat ( ("=" | "<>" | "<" | "<=" | ">" | ">=") concat )?
concat     → sum ( "&" sum )*
sum        → product ( ("+" | "-") product )*
product    → unary ( ("*" | "/") unary )*
unary      → "-" unary | primary
primary    → number | string | reference | call | "(" expression ")"
```

`&` concatenates, as it does in a spreadsheet, and it binds **below** `+` and
`-`: `="a" & 2 + 3` is `"a5"`, because the arithmetic finishes before the join.
Comparisons bind loosest of all, so `="a" & "b" = "ab"` compares two whole
strings and is `TRUE`.

## Not supported, knowingly

`^` (exponent) and scientific notation (`1e5`) are outside the grammar. Both
are **reported**, never reinterpreted: `parseFormula` answers `ok: false` with
the character it stopped on, `buildFormulaColumns` names the column in
`errors`, and that column's cells read `#ERROR!`. Write `x * x` for a square.

The absence is deliberate — a formula language grows one "just add" at a time —
and an absence that says so beats one that quietly reads `1e5` as `1`.

## Values are tagged, and errors are values

A value is `{ kind: "number" | "text" | "boolean" | "blank" | "error" }`
rather than a bare union of primitives. That costs a `.kind` at every use and
buys two things.

An error stops being a string. With sentinel strings, data that genuinely
contains the text `#REF!` is indistinguishable from a cell that failed —
`isFormulaError` can tell them apart because one is tagged and the other is
not.

And a formula that cannot produce a number produces an error value rather than
throwing: `#DIV/0!`, `#VALUE!`, `#NAME?`, `#CYCLE!`, `#ERROR!`. They propagate
the way a spreadsheet's do — an error inside `SUM(a, b)` comes out of the
`SUM` instead of being counted as zero, so a wrong number never gets quietly
totalled. `COALESCE` is the one function that deliberately does not propagate,
because answering "what should I use when this is missing" is its whole job.

A field the engine has no kind for — an object, a function — is `#VALUE!`
rather than its stringification. `[object Object]` in a cell is not a
rendering of the data; it is a rendering of nobody having decided.

## Functions

| Function                                      | Result                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `SUM(values…)`                                | Sum after numeric coercion; non-numeric text is skipped.                        |
| `AVG(values…)`                                | Mean after numeric coercion; no numbers returns `#DIV/0!`.                      |
| `MIN(values…)` / `MAX(values…)`               | Smallest or largest value after numeric coercion; no numbers returns `0`.       |
| `ABS(value)`                                  | Absolute numeric value.                                                         |
| `ROUND(value, places)`                        | Number rounded to the requested decimal places.                                 |
| `POWER(base, exponent)`                       | `base` raised to `exponent`; a non-real or non-finite result returns `#VALUE!`. |
| `SQRT(value)`                                 | Square root; a negative value returns `#VALUE!`.                                |
| `IF(test, yes, no)`                           | One branch selected by spreadsheet truthiness.                                  |
| `AND(values…)` / `OR(values…)` / `NOT(value)` | Boolean logic.                                                                  |
| `CONCAT(values…)`                             | Values joined as text.                                                          |
| `LEN(value)`                                  | Length of the displayed text.                                                   |
| `UPPER(value)` / `LOWER(value)`               | Text converted to upper or lower case.                                          |
| `COALESCE(values…)`                           | First value that is neither blank nor an error.                                 |

For compound growth, write `=POWER(1 + rate, years)`. `POWER` and `SQRT` are
functions only: they do not expand the grammar or reinterpret the unsupported
`^` operator.

## Sorting and export

A formula column sorts by its **value**, never by the text in the cell. A
number orders numerically however it is formatted, so `$1,240.00` cannot land
before `$90.00`; `=UPPER(name)` orders alphabetically; a boolean puts `FALSE`
before `TRUE`.

A blank and an error have no place in an ordering, so both group at the **end**
of the column — in either direction, the way a spreadsheet leaves an error —
and rows tied there keep the order they already had. What matters is not the
order among broken cells but that they collect somewhere predictable instead of
being counted as zero and scattered among real values.

Export receives the same value a spreadsheet would. Formatting is never applied
to an error: showing `#DIV/0!` as `$#DIV/0!` would hide which cell went wrong.

## Share and save formulas

A typed formula is the one piece of table state nobody can rebuild from memory,
because the table never offered it — someone wrote it. So it travels in the URL
with sort, filters and the pivot:

```tsx
import {
  buildFormulaColumns,
  useFormulaUrlState,
} from "@adapttable/react/formula";

const { formulas, onFormulasChange } = useFormulaUrlState({
  urlKey: "people",
  defaultFormulas: [
    { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
  ],
});
const {
  columns: computed,
  errors,
  cycles,
} = buildFormulaColumns<Row>(formulas);
```

The parameter is `formula=total:%3D%5BUnit%20Price%5D%20*%20Quantity:Total`
(`people.formula=` with the `urlKey` above) — one `key:formula[:header]` entry
per column, `;`-separated, every field percent-encoded so a formula may contain
the delimiters. One URL carries at most 24 formula columns, and a `format`
function stays in memory rather than in the link. Writes are debounced
(`FORMULA_URL_WRITE_DEBOUNCE_MS`, on `@adapttable/react/formula`), so a bar that writes while someone types
does not out-run Safari's `replaceState` limit; reads stay instant.

[Saved views](./saved-views.md) capture the parameter with the rest of the
table's state, so "Margin analysis" is a view like any other. A view saved
before formula columns existed carries none, and applying it clears them — the
same thing a pre-pivot view does to a live pivot.

`serializeFormulaColumns` and `deserializeFormulaColumns` are the encoding on
its own, exported from `@adapttable/core/formula` and from the React-free
`@adapttable/core/query` — the entry a route handler, loader or plain Node
service imports to read a shared link. **Reading never evaluates.** The codec
hands back the text; a hand-edited entry it cannot make sense of is dropped,
and a formula that will not parse arrives as the text it is, because half a
formula is the normal state of one being written.

## Building a formula bar

`FORMULA_FUNCTIONS` lists the function names the engine knows, for an
autocomplete. `parseFormula` returns a tree or the reason it could not, and
`formulaRefs` names the columns a formula depends on. `evaluateFormula`,
`toFormulaValue`, `formulaDisplay`, `formulaSortValue`, `isFormulaError`,
`FORMULA_ERRORS`, `FORMULA_BLANK` and the `formulaNumber` / `formulaText` /
`formulaBoolean` / `formulaError` constructors are the engine's pieces on their
own.

Related: [pivot tables](./pivot.md) · [row grouping](./row-grouping.md) ·
[API reference](./api.md)

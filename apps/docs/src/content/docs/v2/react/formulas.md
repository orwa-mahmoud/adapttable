---
title: "React table formulas — spreadsheet computed columns (v2)"
description: Add spreadsheet-style formulas to a React table — computed columns
  typed at runtime, with functions, references and live recalculation.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table formulas — spreadsheet computed
      columns","item":"https://adapttable.orwamahmoud.com/v2/react/formulas/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/formulas.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/formulas.png
slug: v2/react/formulas
---

▶ **See it working:** [type a formula and watch the column appear in the live demo](https://adapttable.orwamahmoud.com/react/demo/mantine/formulas/) — a real table you can click, not a recording.

A column whose value is `=[Unit Price] * Quantity`, typed by the user rather
than written by you.

`@adapttable/core/formula` is a separate entry, so a table with no computed
columns never downloads a parser. It costs 2.7 KB gzipped to the tables that
import it and nothing to the rest, which the bundle budget checks on every
build.

## The shape

```tsx
import { buildFormulaColumns } from "@adapttable/core/formula";

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

A formula may reference a data field or another formula column by name.
Bracket a name that contains spaces — `[Unit Price]` — which is why the
brackets exist rather than an escaping rule.

`header` defaults to the key. `format(value)` turns a column's `FormulaValue`
into the text its cells show; the value underneath still sorts.

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
[saved view](/v2/react/saved-views/) that can be shared, to whoever sent the link.

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
} from "@adapttable/core/formula";

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
(`people.formula` with the `urlKey` above) — one `key:formula[:header]` entry
per column, `;`-separated, every field
percent-encoded so a formula may contain the delimiters. Writes are debounced
(`FORMULA_URL_WRITE_DEBOUNCE_MS`), so a bar that writes while someone types
does not out-run Safari's `replaceState` limit; reads stay instant.

[Saved views](/v2/react/saved-views/) capture the parameter with the rest of the
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
autocomplete: `SUM`, `MIN`, `MAX`, `AVG`, `ABS`, `ROUND`, `IF`, `AND`, `OR`,
`NOT`, `CONCAT`, `LEN`, `UPPER`, `LOWER` and `COALESCE`. Any other name is
`#NAME?`. `parseFormula` returns a tree or the reason it could not, and
`formulaRefs` names the columns a formula depends on.

Related: [pivot tables](/v2/react/pivot/) · [row grouping](/v2/react/row-grouping/) ·
[API reference](/v2/react/api/)

---
"@adapttable/radix": patch
"@adapttable/base-ui": patch
---

Put the table's grid semantics on the `<table>` element in the Radix Themes and Base UI adapters.
Both kits' `Table.Root` spreads unrecognised props onto its own scroll wrapper, so `role="grid"`,
`aria-rowcount`, `aria-colcount` and `aria-label` applied to a `<div>` with no role. A windowed
table in these two adapters now states its real dataset size to assistive technology, and the table
carries its accessible name — matching the other seven adapters.

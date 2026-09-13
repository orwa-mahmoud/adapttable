---
"@adapttable/ai": minor
---

The `compact` context profile now budgets the whole payload rather than the
capability guides alone. On a 220-column table it produces about 7,500
estimated tokens where `full` produces about 13,300; previously the two were
identical, because the column list — the entire cost at that width — was never
counted.

Column descriptions that do not fit are named in `selection.deferredColumns`
and fetched with `columns.describe`. Nothing is truncated and no capability is
withdrawn: the common operations keep their guidance whatever the budget says,
and so does any guide the backend has already asked about.

A `tokenBudget` that nothing can satisfy now throws `ContextBudgetError` naming
the floor, instead of silently returning a context that misses it.

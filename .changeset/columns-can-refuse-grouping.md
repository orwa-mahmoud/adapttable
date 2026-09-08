---
"@adapttable/core": minor
"@adapttable/react": patch
---

A column can refuse grouping: `groupable: false` takes its header out of the
drag and the column out of the grouping panel's list, the same opt-out shape
`sortable` already has. Grouping stays on by default, because any column can
be grouped by.

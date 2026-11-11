---
"@adapttable/core": minor
"@adapttable/react": patch
"@adapttable/angular": patch
"@adapttable/vue": patch
---

Tree rows name their depth, whether they are open and their place among their siblings (`aria-level`, `aria-expanded`, `aria-posinset`) in React and Angular, as they already did in Vue. A table whose rows are a tree is a `treegrid` with its `aria-rowcount`, so those row attributes are read; `treeTableAria(entryCount)` returns the pair.

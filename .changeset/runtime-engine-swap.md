---
"@adapttable/core": patch
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": patch
---

When a table's source is replaced, the runtime view and the agent read the new source's rows and columns at once, on every scope, instead of reading page rows from the old one in React. The released reader keeps answering from its own last render, and an ordinary update keeps the same handle.

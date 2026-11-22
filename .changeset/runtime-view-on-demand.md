---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/vue": patch
"@adapttable/angular": patch
---

The runtime view a feature above the table reads is built the first time it is read and kept until the next render, so a table nobody reads never builds it, and reading a rendered row no longer builds it. `TableRuntimePublisher` stages each render with `stage(chrome, actions)` and serves `view()` and `visibleRows()`; React's `usePublishTableRuntime(reader)` takes a `TableRuntimeReader` of `rows()`, `labels()` and `view()`.

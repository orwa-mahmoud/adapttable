---
"@adapttable/core": patch
---

`renderedRowsOf` again accepts a tree entry that only carries its row, which is all it reads. A full tree entry still works. The binding entry also names `FrontendEngineFactory` and `CreateTableEngineOptions`, the types its row-model helpers already return.

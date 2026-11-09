---
"@adapttable/core": patch
---

A table engine shows every reader one committed state. A staged row identity, filter or callback stays private until the candidate commits, and the commit tells subscribers about every axis it changed, including rows a callback refresh filtered. A search, filter or patch that throws leaves the committed table, its search term and its revisions as they were. Switching a frontend source between the basic and full evaluators keeps the same engine, table id, selection and subscribers: the new evaluator is staged with the next update and published with its commit. On the basic evaluator a one-row patch evaluates only that row, and a page-only change reuses the derived rows.

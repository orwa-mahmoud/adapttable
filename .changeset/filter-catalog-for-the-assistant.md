---
"@adapttable/core": minor
"@adapttable/ai": minor
"@adapttable/react": minor
---

Publish the live filter catalog to the assistant.

`view.setFilters` now describes each visible filter's type, operators and
(when the static list is short enough) options, and validates the extra bag
against that catalog. `FilterDef.ai` hides a filter or omits a large option
list rather than dumping it into the prompt.

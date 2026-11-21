---
"@adapttable/core": minor
---

`parseStrictFilterTree`, on `@adapttable/core/query`, reads a stored filter tree the way a server must: it answers `undefined` unless every node is a well-formed group or condition, where `parseFilterTree` drops a malformed node and keeps the rest.

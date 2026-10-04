---
"@adapttable/core": patch
---

Reuse the shared last-call memo cache for table sources, preserving identity
semantics and checking argument counts before returning a cached result.

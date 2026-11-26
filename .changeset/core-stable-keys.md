---
"@adapttable/core": patch
---

`stableKey` reads a `Date` the way `JSON.stringify` does, so two different dates no longer give the same cache key, and it sorts property names by code unit, so the same properties always give the same key whatever order they arrive in.

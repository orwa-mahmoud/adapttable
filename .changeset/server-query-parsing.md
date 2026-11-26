---
"@adapttable/server": patch
---

`parseTableQuery` reads a page or page size only when it is a whole decimal number, so `12abc` and `1.5` fall back to the default instead of reading as 12 and 1. A page whose offset would pass the largest safe integer is refused and reported, keeping `offset` exact. Dates the calendar does not have, such as February 30, are refused as not an ISO date. A filter tree with a malformed condition is refused whole and reported, instead of reaching the route with that condition pruned out of it.

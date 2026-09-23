---
"@adapttable/core": patch
"@adapttable/react": patch
---

`groupFilter` receives a typed `GroupNode` — its `key`, `count` and `leafRows` — and an `AggregateSpec` accepts a name registered with `registerAggregator` without a cast.

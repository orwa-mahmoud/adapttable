---
"@adapttable/core": minor
"@adapttable/react": patch
---

Picking a different group aggregation now changes the group rows as soon as it
is picked. The choice was stored and serialized, but the cached groups were
kept: a host rebuilds its aggregate mapper on every render, so the incremental
view ignores its identity on purpose and had no other way to tell one choice
from another. `IncrementalViewConfig.derivedKey` is that value, and the React
binding sets it from the reader's own choices.

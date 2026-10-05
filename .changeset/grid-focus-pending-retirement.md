---
"@adapttable/core": patch
---

Retire a deferred grid focus request when the user focuses another cell, while preserving a new request issued by a focus-state subscriber. This prevents a previously missing cell from stealing focus when it later mounts.

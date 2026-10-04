---
"@adapttable/core": patch
---

Release all registered feature resources even when an individual cleanup fails,
and roll back completed or partial feature setup when a later setup throws.
Preserve the original failure and run each registered cleanup only once.

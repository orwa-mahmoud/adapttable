---
"@adapttable/vue": minor
---

Add a scoped element-ref bridge for adapter components whose native target or
ref callback can change. Release the previous callback before publishing its
replacement and clean up the current target when the owning scope ends.

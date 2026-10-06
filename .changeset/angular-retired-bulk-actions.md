---
"@adapttable/angular": patch
---

Prevent retired bulk controls and delayed confirmations from starting host writes. Preserve completion outcomes for writes already underway, without clearing a replacement selection after the original bulk bar is destroyed.

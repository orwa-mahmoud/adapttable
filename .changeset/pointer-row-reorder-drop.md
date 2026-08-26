---
"@adapttable/core": patch
---

Pointer row-reorder now completes on every kit: memoized rows repaint once when a drag starts and once when it ends, so each row holds a live drop target instead of a stale closure that Chromium treats as a cancelled drag.

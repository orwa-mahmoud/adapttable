---
"@adapttable/core": minor
"@adapttable/react": patch
---

Add `FindController.flush()` so captured views include queries waiting for the
URL debounce. Pending writes stay with the adapter/namespace that accepted them;
React synchronizes source changes after render.

Find and grid announcements use supported primitive/Date accessor values before
sort/backing fields, preserving explicit format/export projections and avoiding
object stringification. Retire clipboard results when row/column context changes
and deferred focus when another cell receives focus, while preserving newly
issued requests.

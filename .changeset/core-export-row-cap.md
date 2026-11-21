---
"@adapttable/core": patch
---

An export that fetches every row stops at its row cap even when the last page is short: 100 then 50 rows against a cap of 120 now export 120 and call `onCapped`, instead of exporting all 150 without a word.

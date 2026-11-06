---
"@adapttable/angular-material": patch
---

Angular Material tables follow CDK `Directionality`, including a parent `dir` and the document direction. An explicit `dir` still wins. Material has no runtime locale, size, or motion setting for the table's chrome.

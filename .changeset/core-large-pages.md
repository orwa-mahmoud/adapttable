---
"@adapttable/core": patch
---

An infinite query-library table holds a page of any size: a response of hundreds of thousands of rows no longer throws `RangeError` when pages accumulate, and export's fetch-all accepts a page that large too.

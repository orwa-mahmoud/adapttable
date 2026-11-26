---
"@adapttable/core": minor
---

Excel exports from the table are deflated where the browser supports `CompressionStream`: a 15,000-row, 12-column workbook downloads at about 1 MB instead of 10 MB, for roughly 60 ms more build time in Chromium. A writer can offer `buildAsync`, which the table's export prefers; `build()` and `buildTableXlsx` stay synchronous and store the archive, as does a browser without raw deflate.

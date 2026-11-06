---
"@adapttable/base-ui": patch
---

Base UI tables follow `DirectionProvider`, including an explicit left-to-right provider, on the server and in the browser. An explicit `dir` still wins. Without that provider the table keeps the page direction. Base UI has no app-wide locale, size or motion switch.

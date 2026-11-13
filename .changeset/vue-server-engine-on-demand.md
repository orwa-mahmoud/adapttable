---
"@adapttable/vue": patch
---

A table loads the server tier's engine only when it uses it, and `mode="server"` and `onQueryChange` work as before: the first query goes out on mount while the engine loads beside it, and a table whose query asks for aggregates sends it once the engine is in place. A failed engine load reaches the app's error handler. Every plain table is about 2.4 KiB gzip smaller.

---
"@adapttable/core": minor
---

The server tier's engine ships as its own file and loads on demand. `createLazyServerSource()` on `@adapttable/core/binding`, with the server-source types its signature uses, is the server tier a binding holds for every table: it fetches the engine the first time a table is on the server tier and sends the first query while the engine travels (a query that asks for aggregates follows the engine). Every plain table is about 2.4 KiB gzip smaller.

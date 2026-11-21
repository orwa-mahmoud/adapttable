---
"@adapttable/core": major
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": patch
---

The editing, pivot, formula, grouping, stream and selection names come from their own entries: `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream` and `/selection`. Sixty-five values leave the main entry, which drops importing every core export from 107.2 to 98.2 KiB. The query codecs and engine constructors stay on the main entry.

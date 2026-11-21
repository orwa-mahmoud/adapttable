---
"@adapttable/ai": patch
---

The agent never reads a column it is not allowed to read. Column discovery applies each column's permission and declared type before sampling a value, so a column marked unreadable is never invoked and a typed one needs no sample. Row reads prepare the requested columns once per read: 50 rows × 100 of 300 columns go from 2.2 ms to 1.6 ms with identical output.

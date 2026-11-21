---
"@adapttable/core": patch
"@adapttable/react": patch
"@adapttable/angular": patch
---

A React table clears its selection when only the advanced filter tree changes, so a row the new filter hides no longer stays selected; React and Angular reset on one shared key, which reads the filter tree without serializing its values. A React table with selection off reads no row ids for it.

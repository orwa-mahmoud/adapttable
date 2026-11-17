---
"@adapttable/core": patch
---

`applyRowPatches` and `applyRowPatchesWithLog` read each row's id at most twice per batch instead of once per patch. 200 updates at the end of 20,000 rows take about 2 ms instead of 44 ms; single-row patches cost the same as before.

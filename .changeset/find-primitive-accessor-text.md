---
"@adapttable/core": patch
---

Find and grid announcements now read supported primitive or Date values from a column's accessor. An accessor's displayed value takes precedence over a different sort value or backing data field, so derived cells can be found by their visible text.

Explicit `formatValue` and supported `exportValue` projections retain priority. Renderer objects are not stringified; unsupported accessor results still fall through to the existing sort value and data path.

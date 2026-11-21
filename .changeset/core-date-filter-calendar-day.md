---
"@adapttable/core": patch
---

Date-only filters and relative date ranges end at the next local midnight. On a daylight-saving day, which lasts 23 or 25 hours, "on", "between", "after" and tokens such as `today` or `last:7` now cover exactly that calendar day: filtering on 2026-03-08 in New York no longer matches 00:30 the next morning, and filtering on 2026-11-01 matches 23:45 that night.

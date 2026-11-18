---
"@adapttable/core": patch
---

Frontend search releases the text of rows a patch removes, so a long-lived table no longer keeps every removed row in memory, and it searches again when `getSearchText` changes on the same rows, keeping the page, total and facet rows in step with the new field.

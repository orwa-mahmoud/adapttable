---
"@adapttable/base-ui": patch
---

Keep the value the user chose in a select whose option list depends on that value. Choosing a new
rows-per-page size reverted to the size the select mounted with, because the select offers the current
size alongside the standard ones and so changing it changes the length of the list.

Verified against `@base-ui/react` 1.7.0; the supported peer range is unchanged.

---
"@adapttable/core": patch
---

Plugin registrations resolve on the table that owns them. Sibling and nested tables no longer share a module-level host stack, so an export, menu, or aggregator click cannot pick up another table's plugins.

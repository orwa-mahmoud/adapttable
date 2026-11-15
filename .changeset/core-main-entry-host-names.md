---
"@adapttable/core": minor
---

The main entry of `@adapttable/core` now advertises only the names a table reaches for. 651 names that only the framework bindings use, or that no table, guide or example uses, are exported from `@adapttable/core/binding` (the entry internal to AdaptTable packages) and stay on the main entry as deprecated aliases of the same value or type, so existing imports keep working and compare equal. Your editor marks them with the replacement import; they leave the main entry in the next major. The main entry's undeprecated names drop from 1,494 to 845.

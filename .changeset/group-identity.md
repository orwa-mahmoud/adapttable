---
"@adapttable/core": patch
---

Grouping gives two different nested paths two different ids even when their values contain the id's separators, so each collapses and pages on its own; ids of ordinary values are unchanged. An invalid date groups into one "Invalid Date" bucket instead of throwing, and a BigInt is labelled by its digits and bucketed apart from the equal number.

---
"@adapttable/core": patch
---

The default search no longer throws on a row that contains itself or holds a BigInt inside a nested value: a circular reference is left out of the search text and a BigInt is written as its digits.

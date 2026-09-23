---
"@adapttable/core": patch
---

A formula's answer is always a finite number or an error: a field that is `NaN`, `Infinity` or an invalid date reads as `#VALUE!` instead of `0`, and a result too large to be a number — an overflowing product, sum, average or `ROUND` — is `#VALUE!` instead of `Infinity` or `NaN`.

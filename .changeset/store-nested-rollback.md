---
"@adapttable/core": patch
---

A store action or batch that throws inside another batch undoes only its own writes: the outer batch keeps what it staged, and a slice the failed action alone touched keeps its value and notifies no one.

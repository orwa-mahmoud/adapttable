---
"@adapttable/angular": patch
---

Row, cell and control attributes are written only when their value changes. Selecting one row or editing one cell now touches that row's DOM alone, and a controlled `checked` or `value` the element changed is still put back.

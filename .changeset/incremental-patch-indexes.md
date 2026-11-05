---
"@adapttable/core": patch
---

A batch of row patches rebuilds the incremental view's row-position indexes once per batch instead of once per patch, so streaming updates on large tables do far less work. Results, sort ties and callback calls are unchanged.

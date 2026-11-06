---
"@adapttable/vue": patch
---

Opening a context menu no longer overflows the Vue shell. The menu resolves its row from the visible inventory, so the shell frame can publish that menu without calling back into it.


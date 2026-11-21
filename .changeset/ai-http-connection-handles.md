---
"@adapttable/ai": patch
---

A backend's session handle stays with the connection that was issued it. Two connections to the same table each send only their own handle, and resetting one connection leaves the other's conversation intact.

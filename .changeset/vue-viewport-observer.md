---
"@adapttable/vue": patch
---

A virtualized Vue table re-reads its geometry only for changes that can move or resize it — its own content, its ancestors, the window — and at most once per frame. Twelve class changes elsewhere on the page used to cause twelve scans; they now cause none.

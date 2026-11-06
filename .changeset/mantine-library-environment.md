---
"@adapttable/mantine": patch
---

Mantine tables follow `DirectionProvider`. An explicit `dir` still wins. Without that provider the table keeps the page direction. Mantine core has no locale or size provider, and `respectReducedMotion` only opts Mantine into the operating-system preference the table already follows.

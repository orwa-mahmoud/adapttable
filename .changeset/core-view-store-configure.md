---
"@adapttable/core": patch
---

Configuring a table's view state writes no store: reads use the new defaults at once, and the next change carries them into the state its actions read. A table that receives new defaults while it renders changes nothing during that render.

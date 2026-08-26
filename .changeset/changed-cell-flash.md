---
"@adapttable/core": minor
---

Flash the cells a patch changed

`useChangedCellFlash` from `@adapttable/core/stream` tracks the cells a
row patch just changed. Pass `isCellFlashing` into the table and every kit
sets `data-flash` on the cell and on the matching mobile card value — a
brief pulse, honoring `prefers-reduced-motion`, so a number that moved is
a number the reader can see.

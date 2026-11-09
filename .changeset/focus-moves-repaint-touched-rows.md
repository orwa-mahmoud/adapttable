---
"@adapttable/core": minor
"@adapttable/react": patch
---

Moving the cell focus or dragging a cell range repaints only the rows the focus, range, fill handle or find matches touch. With 30 rows on screen an arrow key takes 7–12 ms in Chakra, MUI and Mantine instead of 21–54 ms, and each cell a range drag crosses takes 11–22 ms instead of 27–55 ms.

`gridRowFocusSignature` digests what the focus draws on one row.
